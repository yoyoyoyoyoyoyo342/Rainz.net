const SUPABASE_URL = 'https://ohwtbkudpkfbakynikyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od3Ria3VkcGtmYmFreW5pa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDQxOTMsImV4cCI6MjA3MDEyMDE5M30.ZjOP7yeDgqpFk_caDCF7rUpoE51DV8aqhxuLHDsjJrI';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const conditionToIcon = {
  'clear': '01d',
  'sunny': '01d',
  'partly cloudy': '02d',
  'partly-cloudy': '02d',
  'cloudy': '03d',
  'overcast': '04d',
  'rain': '10d',
  'rainy': '10d',
  'light rain': '10d',
  'heavy rain': '09d',
  'drizzle': '09d',
  'thunderstorm': '11d',
  'snow': '13d',
  'snowy': '13d',
  'mist': '50d',
  'fog': '50d',
  'foggy': '50d',
  'haze': '50d',
};

function getIcon(condition) {
  if (!condition) return '01d';
  const lower = condition.toLowerCase();
  for (const [key, icon] of Object.entries(conditionToIcon)) {
    if (lower.includes(key)) return icon;
  }
  return '01d';
}

function calcUmbrellaScore(precipitation, condition, humidity) {
  let score = 0;
  const lower = (condition || '').toLowerCase();

  if (precipitation > 0) score += Math.min(precipitation * 2, 4);
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) score += 2;
  if (lower.includes('heavy')) score += 1;
  if (lower.includes('thunderstorm')) score += 2;
  if (humidity > 85) score += 1;

  return Math.min(Math.round(score), 5);
}

function fToC(f) {
  return Math.round((f - 32) * 5 / 9);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const { lat, lon } = req.query || {};

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing required query params: lat and lon' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  try {
    // Fetch aggregate weather + LLM forecast in parallel
    const [aggregateRes, hyperlocalRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/aggregate-weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ lat: latitude, lon: longitude, locationName: 'API Request' }),
      }),
      fetch(`${SUPABASE_URL}/functions/v1/fetch-hyperlocal-weather`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      }),
    ]);

    if (!aggregateRes.ok) {
      throw new Error(`Aggregate weather failed: ${aggregateRes.status}`);
    }

    const aggregateData = await aggregateRes.json();
    const sources = aggregateData.sources || aggregateData || [];

    // Try LLM-enhanced forecast
    let llmData = null;
    try {
      const llmRes = await fetch(`${SUPABASE_URL}/functions/v1/llm-weather-forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          sources,
          location: `${latitude}, ${longitude}`,
          forceExperimental: true,
        }),
      });
      if (llmRes.ok) {
        llmData = await llmRes.json();
      }
    } catch (_) { /* fallback to raw source */ }

    let hyperlocalData = null;
    try {
      if (hyperlocalRes.ok) {
        hyperlocalData = await hyperlocalRes.json();
      }
    } catch (_) { /* ignore */ }

    // Build response from best available data
    let temp, condition, humidity, wind, description, precipitation;

    if (llmData?.current) {
      temp = fToC(llmData.current.temperature);
      condition = llmData.current.condition || 'Unknown';
      humidity = llmData.current.humidity || 0;
      wind = llmData.current.windSpeed || 0;
      description = llmData.summary || llmData.current.description || condition;
      precipitation = 0;
    } else if (sources.length > 0) {
      const src = sources[0];
      temp = fToC(src.currentWeather?.temperature || 32);
      condition = src.currentWeather?.condition || 'Unknown';
      humidity = src.currentWeather?.humidity || 0;
      wind = src.currentWeather?.windSpeed || 0;
      description = condition;
      precipitation = 0;
    } else {
      throw new Error('No weather data available');
    }

    // Get precipitation from hyperlocal if available
    if (hyperlocalData?.minuteByMinute?.length) {
      const avgPrecip = hyperlocalData.minuteByMinute.reduce((sum, m) => sum + (m.precipitation || 0), 0) / hyperlocalData.minuteByMinute.length;
      precipitation = avgPrecip;
    }

    // Reverse geocode city name
    let city = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    try {
      const geoRes = await fetch(`${SUPABASE_URL}/functions/v1/geocode-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ lat: latitude, lon: longitude, reverse: true }),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.city || geoData.name || geoData.display_name) {
          city = geoData.city || geoData.name || geoData.display_name.split(',')[0];
        }
      }
    } catch (_) { /* keep coordinate fallback */ }

    const response = {
      temp,
      condition: condition.toLowerCase(),
      city,
      humidity,
      wind: Math.round(wind * 10) / 10,
      icon: getIcon(condition),
      umbrellaScore: calcUmbrellaScore(precipitation, condition, humidity),
      description,
    };

    Object.keys(corsHeaders).forEach(k => res.setHeader(k, corsHeaders[k]));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(response);

  } catch (err) {
    Object.keys(corsHeaders).forEach(k => res.setHeader(k, corsHeaders[k]));
    return res.status(500).json({ error: 'Failed to fetch weather data', details: err.message });
  }
}
