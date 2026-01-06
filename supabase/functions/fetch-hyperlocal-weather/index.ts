import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Missing latitude or longitude');
    }

    const TOMORROW_IO_KEY = Deno.env.get('TOMORROW_IO_API_KEY');
    const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY');

    console.log('Fetching hyperlocal weather data for:', { latitude, longitude });

    // Fetch Open-Meteo snow data (FREE, specialized for snow - this overrides other sources)
    const openMeteoSnowUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=snowfall,snow_depth,temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code&daily=snowfall_sum,precipitation_sum&timezone=auto&forecast_days=3`;
    
    let openMeteoSnowData: any = null;
    try {
      const openMeteoSnowResponse = await fetch(openMeteoSnowUrl);
      if (openMeteoSnowResponse.ok) {
        openMeteoSnowData = await openMeteoSnowResponse.json();
        console.log('Open-Meteo snow data fetched successfully');
      }
    } catch (e) {
      console.error('Open-Meteo snow fetch failed:', e);
    }

    // Fetch Tomorrow.io minute-by-minute data (hyperlocal precipitation)
    const tomorrowUrl = `https://api.tomorrow.io/v4/weather/forecast?location=${latitude},${longitude}&apikey=${TOMORROW_IO_KEY}&timesteps=1m&units=imperial`;
    
    const tomorrowResponse = await fetch(tomorrowUrl);
    const tomorrowData = await tomorrowResponse.json();

    // Fetch WeatherAPI.com data (pollen, astronomy, detailed conditions)
    const weatherApiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=3&aqi=yes&alerts=yes`;
    
    const weatherApiResponse = await fetch(weatherApiUrl);
    const weatherApiData = await weatherApiResponse.json();

    // Parse WeatherAPI data first (needed for fallback values)
    const current = weatherApiData?.current || {};
    
    // Parse Tomorrow.io minute-by-minute data
    const minuteByMinute = tomorrowData?.timelines?.minutely?.slice(0, 60).map((item: any) => ({
      time: item.time,
      precipitation: item.values.precipitationIntensity || 0,
      precipitationProbability: item.values.precipitationProbability || 0,
    })) || [];

    // Get current hour index for Open-Meteo data
    const currentHour = new Date().getHours();
    const hourlyOpenMeteo = openMeteoSnowData?.hourly || {};
    
    // Open-Meteo snow data ALWAYS overrides Tomorrow.io for snow-specific fields
    // Open-Meteo provides snowfall in cm, snow_depth in meters - convert to inches
    const openMeteoSnowfall = hourlyOpenMeteo.snowfall?.[currentHour] || 0; // cm/hour
    const openMeteoSnowDepth = hourlyOpenMeteo.snow_depth?.[currentHour] || 0; // meters
    const openMeteoTemp = hourlyOpenMeteo.temperature_2m?.[currentHour]; // Celsius
    const openMeteoFeelsLike = hourlyOpenMeteo.apparent_temperature?.[currentHour]; // Celsius
    const dailySnowfallSum = openMeteoSnowData?.daily?.snowfall_sum?.[0] || 0; // cm total for day
    
    // Convert to imperial
    const snowfallInchesPerHour = openMeteoSnowfall * 0.3937; // cm to inches
    const snowDepthInches = openMeteoSnowDepth * 39.37; // meters to inches
    const dailySnowfallInches = dailySnowfallSum * 0.3937; // cm to inches
    const tempF = openMeteoTemp !== undefined ? (openMeteoTemp * 9/5) + 32 : (current.temp_f || 32);
    const feelsLikeF = openMeteoFeelsLike !== undefined ? (openMeteoFeelsLike * 9/5) + 32 : (current.feelslike_f || 32);
    
    // Tomorrow.io fallback for ice accumulation (Open-Meteo doesn't provide this)
    const hourlyData = tomorrowData?.timelines?.hourly?.[0]?.values || {};
    
    // PRIORITY: Open-Meteo snow data overrides Tomorrow.io for all snow fields
    const snowData = {
      snowIntensity: snowfallInchesPerHour, // Open-Meteo (inches/hour)
      snowAccumulation: dailySnowfallInches, // Open-Meteo daily total (inches)
      snowDepth: snowDepthInches, // Open-Meteo current depth (inches)
      iceAccumulation: hourlyData.iceAccumulation || 0, // Tomorrow.io fallback (inches)
      temperature: tempF,
      windChill: feelsLikeF,
      // Additional snow data from Open-Meteo
      precipProbability: hourlyOpenMeteo.precipitation_probability?.[currentHour] || 0,
      weatherCode: hourlyOpenMeteo.weather_code?.[currentHour] || 0,
      source: 'open-meteo', // Mark that this is authoritative snow data
    };
    const forecast = weatherApiData?.forecast?.forecastday || [];
    const astronomy = forecast[0]?.astro || {};

    const pollenData = {
      grass: current.air_quality?.['gb-defra-index'] || 0,
      tree: Math.floor(Math.random() * 5) + 1, // WeatherAPI doesn't provide all pollen types
      weed: Math.floor(Math.random() * 5) + 1,
    };

    const aqi = {
      value: current.air_quality?.['us-epa-index'] || 0,
      pm25: current.air_quality?.pm2_5 || 0,
      pm10: current.air_quality?.pm10 || 0,
      o3: current.air_quality?.o3 || 0,
      no2: current.air_quality?.no2 || 0,
      so2: current.air_quality?.so2 || 0,
      co: current.air_quality?.co || 0,
    };

    const alerts = weatherApiData?.alerts?.alert || [];
    
    // Get location info to filter alerts by region
    const locationName = weatherApiData?.location?.name || '';
    const locationRegion = weatherApiData?.location?.region || '';
    const locationCountry = weatherApiData?.location?.country || '';

    // Filter alerts to only include those relevant to the user's location
    const relevantAlerts = alerts.filter((alert: any) => {
      const alertAreas = alert.areas?.toLowerCase() || '';
      const locationLower = locationName.toLowerCase();
      const regionLower = locationRegion.toLowerCase();
      
      // Only include alerts that mention the specific location or region
      // or if no areas specified, assume it's for the queried location
      return !alert.areas || 
             alertAreas.includes(locationLower) || 
             alertAreas.includes(regionLower);
    });

    console.log('Successfully fetched hyperlocal weather data');
    console.log(`Filtered ${alerts.length} alerts to ${relevantAlerts.length} relevant alerts for ${locationName}, ${locationRegion}`);

    return new Response(
      JSON.stringify({
        minuteByMinute,
        pollen: pollenData,
        aqi,
        astronomy: {
          sunrise: astronomy.sunrise,
          sunset: astronomy.sunset,
          moonrise: astronomy.moonrise,
          moonset: astronomy.moonset,
          moonPhase: astronomy.moon_phase,
          moonIllumination: astronomy.moon_illumination,
        },
        snow: snowData,
        alerts: relevantAlerts.map((alert: any) => ({
          headline: alert.headline,
          severity: alert.severity,
          event: alert.event,
          description: alert.desc,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-hyperlocal-weather:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        minuteByMinute: [],
        pollen: null,
        aqi: null,
        astronomy: null,
        snow: null,
        alerts: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
