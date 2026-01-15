import {
  WeatherResponse,
  Location,
  WeatherSource,
  HourlyForecast,
  DailyForecast,
  CurrentWeather,
} from "../types/weather";
import { supabase } from "@/integrations/supabase/client";

function buildDemoWeatherResponse(lat: number, lon: number): WeatherResponse {
  const now = new Date();

  const makeHourly = (): HourlyForecast[] =>
    Array.from({ length: 24 }).map((_, i) => {
      const t = new Date(now.getTime() + i * 3600 * 1000);
      const label = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return {
        time: label,
        temperature: 70 + Math.round(Math.sin(i / 3) * 5),
        condition: "Partly Cloudy",
        precipitation: Math.max(0, Math.round(Math.cos(i / 2) * 20)),
        icon: "",
      };
    });

  const makeDaily = (): DailyForecast[] =>
    Array.from({ length: 10 }).map((_, i) => {
      const d = new Date(now.getTime() + i * 86400000);
      const day = d.toLocaleDateString([], { weekday: "short" });
      const high = 78 + (i % 3) * 2;
      const low = high - 10;
      return {
        day,
        condition: "Partly Cloudy",
        description: "Mix of sun and clouds",
        highTemp: high,
        lowTemp: low,
        precipitation: (i % 3) * 10,
        icon: "",
      };
    });

  const current: CurrentWeather = {
    temperature: 75,
    condition: "Partly Cloudy",
    description: "Partly cloudy",
    humidity: 55,
    windSpeed: 8,
    windDirection: 210,
    visibility: 10,
    feelsLike: 76,
    uvIndex: 5,
    pressure: 1015,
  };

  const baseSource = (source: string): WeatherSource => ({
    source,
    location: "Selected Location",
    latitude: lat,
    longitude: lon,
    accuracy: 0.9,
    currentWeather: current,
    hourlyForecast: makeHourly(),
    dailyForecast: makeDaily(),
  });

  const sources: WeatherSource[] = [
    baseSource("OpenWeatherMap"),
    baseSource("AccuWeather"),
    baseSource("WeatherAPI"),
  ];
  const mostAccurate = sources[0];

  return {
    sources,
    mostAccurate,
    aggregated: mostAccurate,
    demo: true,
    message: "Using demo data. Backend /api/weather is not available.",
  };
}

export const weatherApi = {
  searchLocations: async (query: string): Promise<Location[]> => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to search locations: ${res.status}`);
    }
    const data: any = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((r: any) => ({
      name: [r.name, r.admin1, r.country_code || r.country].filter(Boolean).join(", "),
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country || r.country_code || "",
      state: r.admin1 || undefined,
    }));
  },

  getWeatherData: async (lat: number, lon: number, locationName?: string): Promise<WeatherResponse> => {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current_weather: "true",
      hourly: [
        "temperature_2m",
        "apparent_temperature", 
        "precipitation_probability",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "relative_humidity_2m",
        "visibility",
        "pressure_msl",
        "uv_index",
        "weathercode",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "dew_point_2m"
      ].join(","),
      daily: [
        "weathercode",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "precipitation_sum",
        "rain_sum", 
        "showers_sum",
        "snowfall_sum",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: "auto",
      temperature_unit: "fahrenheit",
      forecast_days: "16",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch weather: ${res.status} ${res.statusText}`);
    }
    const data: any = await res.json();

    const weatherCodeToText = (code?: number, temp?: number, snowfall?: number, humidity?: number, windSpeed?: number): string => {
      const hasSnow = snowfall !== undefined && snowfall > 0;
      const isFreezing = temp !== undefined && temp <= 35;
      const isVeryWet = humidity !== undefined && humidity > 85;
      const isWindy = windSpeed !== undefined && windSpeed > 15;
      
      const snowScore = 
        (hasSnow ? 4 : 0) +
        (temp !== undefined && temp <= 32 ? 3 : temp !== undefined && temp <= 35 ? 2 : 0) +
        (isVeryWet && isFreezing ? 1 : 0) +
        (isWindy && isFreezing ? 1 : 0);
      
      const isSnowing = snowScore >= 4;
      
      switch (code) {
        case 0: return "Clear";
        case 1:
        case 2: return "Partly Cloudy";
        case 3: return "Cloudy";
        case 45:
        case 48: return "Fog";
        case 51:
        case 53:
        case 55: return isSnowing ? "Snow" : "Drizzle";
        case 61:
        case 63:
        case 65: return isSnowing ? "Snow" : "Rain";
        case 71:
        case 73:
        case 75: return "Snow";
        case 80:
        case 81:
        case 82: return isSnowing ? "Snow" : "Showers";
        case 95:
        case 96:
        case 99: return "Thunderstorm";
        default: return "Unknown";
      }
    };

    const hourlyTimes: string[] = data?.hourly?.time || [];
    const currentTime: string | undefined = data?.current_weather?.time;
    let idx = 0;
    if (hourlyTimes.length) {
      const parseTs = (s: string) => new Date(s).getTime();
      const target = currentTime ? parseTs(currentTime) : Date.now();
      idx = hourlyTimes.reduce((bestIdx, t, i) => {
        const d = parseTs(t);
        const best = parseTs(hourlyTimes[bestIdx]);
        return Math.abs(d - target) < Math.abs(best - target) ? i : bestIdx;
      }, 0);
    }

    const sunriseIso = data?.daily?.sunrise?.[0];
    const sunsetIso = data?.daily?.sunset?.[0];
    
    const parseTimeFromISO = (isoString: string | undefined) => {
      if (!isoString) return undefined;
      try {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? undefined : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      } catch {
        return undefined;
      }
    };
    
    const sunriseStr = parseTimeFromISO(sunriseIso);
    const sunsetStr = parseTimeFromISO(sunsetIso);
    
    let daylightStr: string | undefined = undefined;
    if (sunriseIso && sunsetIso) {
      try {
        const sunriseTime = new Date(sunriseIso);
        const sunsetTime = new Date(sunsetIso);
        if (!isNaN(sunriseTime.getTime()) && !isNaN(sunsetTime.getTime())) {
          const diffMs = sunsetTime.getTime() - sunriseTime.getTime();
          const h = Math.floor(diffMs / (1000 * 60 * 60));
          const m = Math.round((diffMs - h * 3600000) / 60000);
          daylightStr = `${h}h ${m}m`;
        }
      } catch {
        daylightStr = undefined;
      }
    }

    let moonriseStr: string | undefined;
    let moonsetStr: string | undefined;
    let moonPhaseStr: string | undefined;
    
    try {
      const moonResponse = await supabase.functions.invoke('fetch-moon-data', {
        body: { lat, lon }
      });
      
      if (moonResponse.data && !moonResponse.error) {
        moonriseStr = moonResponse.data.moonrise || undefined;
        moonsetStr = moonResponse.data.moonset || undefined;
        moonPhaseStr = moonResponse.data.moonPhase || undefined;
      } else {
        if (sunriseIso && sunsetIso) {
          const sunriseTime = new Date(sunriseIso);
          const sunsetTime = new Date(sunsetIso);
          if (!isNaN(sunriseTime.getTime()) && !isNaN(sunsetTime.getTime())) {
            const now = new Date();
            const lunarCycle = 29.53058867;
            const knownNewMoon = new Date('2000-01-06');
            const daysSinceKnown = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
            const phase = ((daysSinceKnown % lunarCycle) / lunarCycle);
            
            const dayLength = sunsetTime.getTime() - sunriseTime.getTime();
            const moonriseOffset = phase * dayLength;
            const moonsetOffset = (phase + 0.5) % 1 * dayLength;
            
            const moonrise = new Date(sunriseTime.getTime() + moonriseOffset);
            const moonset = new Date(sunriseTime.getTime() + moonsetOffset);
            
            moonriseStr = moonrise.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            moonsetStr = moonset.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            
            const getMoonPhaseName = (phase: number): string => {
              if (phase < 0.0625 || phase >= 0.9375) return "New Moon";
              if (phase < 0.1875) return "Waxing Crescent";
              if (phase < 0.3125) return "First Quarter";
              if (phase < 0.4375) return "Waxing Gibbous";
              if (phase < 0.5625) return "Full Moon";
              if (phase < 0.6875) return "Waning Gibbous";
              if (phase < 0.8125) return "Last Quarter";
              return "Waning Crescent";
            };
            
            moonPhaseStr = getMoonPhaseName(phase);
          }
        }
      }
    } catch {
      moonriseStr = undefined;
      moonsetStr = undefined;
      moonPhaseStr = undefined;
    }

    const aqiParams = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: "us_aqi",
      timezone: "auto",
    });
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams.toString()}`;
    let currentAqi: number | undefined = undefined;
    let currentAqiCategory: string | undefined = undefined;
    try {
      const aqiRes = await fetch(aqiUrl);
      if (aqiRes.ok) {
        const aqiData: any = await aqiRes.json();
        const aqiTimes: string[] = aqiData?.hourly?.time || [];
        const parseTs = (s: string) => new Date(s).getTime();
        const target = currentTime ? parseTs(currentTime) : Date.now();
        let aqiIdx = 0;
        if (aqiTimes.length) {
          aqiIdx = aqiTimes.reduce((bestIdx, t, i) => {
            const d = parseTs(t);
            const best = parseTs(aqiTimes[bestIdx]);
            return Math.abs(d - target) < Math.abs(best - target) ? i : bestIdx;
          }, 0);
        }
        const aqiVal = aqiData?.hourly?.us_aqi?.[aqiIdx];
        if (typeof aqiVal === "number") {
          currentAqi = Math.round(aqiVal);
          const n = currentAqi;
          currentAqiCategory =
            n <= 50 ? "Good" :
            n <= 100 ? "Moderate" :
            n <= 150 ? "Unhealthy for Sensitive Groups" :
            n <= 200 ? "Unhealthy" :
            n <= 300 ? "Very Unhealthy" : "Hazardous";
        }
      }
    } catch {}

    const pollenParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
      timezone: "auto",
      forecast_days: "1"
    });
    const pollenUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${pollenParams.toString()}`;
    let pollenData: any = undefined;
    try {
      const pollenRes = await fetch(pollenUrl);
      if (pollenRes.ok) {
        const pollen: any = await pollenRes.json();
        const pollenTimes: string[] = pollen?.hourly?.time || [];
        const parseTs = (s: string) => new Date(s).getTime();
        const target = currentTime ? parseTs(currentTime) : Date.now();
        let pollenIdx = 0;
        if (pollenTimes.length) {
          pollenIdx = pollenTimes.reduce((bestIdx, t, i) => {
            const d = parseTs(t);
            const best = parseTs(pollenTimes[bestIdx]);
            return Math.abs(d - target) < Math.abs(best - target) ? i : bestIdx;
          }, 0);
        }
        const currentMonth = new Date().getMonth();
        
        const getSeasonalMultiplier = (pollenType: string, month: number): number => {
          const multipliers = {
            alder: [2.0, 2.5, 1.8, 0.5, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.2],
            birch: [0.0, 0.2, 1.5, 2.5, 2.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            grass: [0.0, 0.0, 0.5, 1.2, 2.5, 3.0, 2.8, 2.2, 1.0, 0.2, 0.0, 0.0],
            mugwort: [0.0, 0.0, 0.0, 0.0, 0.2, 0.8, 2.0, 2.5, 1.5, 0.3, 0.0, 0.0],
            olive: [0.0, 0.0, 0.5, 1.8, 2.5, 2.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0],
            ragweed: [0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 1.0, 2.5, 2.8, 1.5, 0.2, 0.0]
          };
          return multipliers[pollenType as keyof typeof multipliers]?.[month] || 1.0;
        };

        const rawValues = {
          alder: pollen?.hourly?.alder_pollen?.[pollenIdx] ?? 0,
          birch: pollen?.hourly?.birch_pollen?.[pollenIdx] ?? 0,
          grass: pollen?.hourly?.grass_pollen?.[pollenIdx] ?? 0,
          mugwort: pollen?.hourly?.mugwort_pollen?.[pollenIdx] ?? 0,
          olive: pollen?.hourly?.olive_pollen?.[pollenIdx] ?? 0,
          ragweed: pollen?.hourly?.ragweed_pollen?.[pollenIdx] ?? 0,
        };

        pollenData = {
          alder: Math.round((rawValues.alder * getSeasonalMultiplier('alder', currentMonth)) * 10) / 10,
          birch: Math.round((rawValues.birch * getSeasonalMultiplier('birch', currentMonth)) * 10) / 10,
          grass: Math.round((rawValues.grass * getSeasonalMultiplier('grass', currentMonth)) * 10) / 10,
          mugwort: Math.round((rawValues.mugwort * getSeasonalMultiplier('mugwort', currentMonth)) * 10) / 10,
          olive: Math.round((rawValues.olive * getSeasonalMultiplier('olive', currentMonth)) * 10) / 10,
          ragweed: Math.round((rawValues.ragweed * getSeasonalMultiplier('ragweed', currentMonth)) * 10) / 10,
        };
      }
    } catch {}

    const currentPrecipProb = data?.hourly?.precipitation_probability?.[idx] ?? 0;
    const currentPrecip = data?.hourly?.precipitation?.[idx] ?? 0;
    const currentRain = data?.hourly?.rain?.[idx] ?? 0;
    const currentShowers = data?.hourly?.showers?.[idx] ?? 0;
    const currentSnow = data?.hourly?.snowfall?.[idx] ?? 0;
    const totalPrecipitation = Math.round((currentPrecip + currentRain + currentShowers + currentSnow) * 10) / 10;

    const todaySnowfall = data?.daily?.snowfall_sum?.[0] ?? 0;
    const snowfallCm = Math.round(currentSnow * 10) / 10;
    const snowDepthInches = Math.round((todaySnowfall / 2.54) * 10) / 10;

    const currentTemp = Math.round(data?.current_weather?.temperature ?? 0);
    const currentHumidity = Math.round(data?.hourly?.relative_humidity_2m?.[idx] ?? 0);
    const currentWindSpeed = Math.round(data?.hourly?.wind_speed_10m?.[idx] ?? (data?.current_weather?.windspeed ?? 0) * 0.621371);
    const currentCondition = weatherCodeToText(
      data?.current_weather?.weathercode, 
      currentTemp, 
      Math.round((currentSnow / 2.54) * 10) / 10,
      currentHumidity,
      currentWindSpeed
    );
    
    const currentDewPoint = Math.round(data?.hourly?.dew_point_2m?.[idx] ?? 0);

    const current: CurrentWeather = {
      temperature: currentTemp,
      condition: currentCondition,
      description: currentCondition,
      humidity: Math.round(data?.hourly?.relative_humidity_2m?.[idx] ?? 0),
      windSpeed: Math.round(data?.hourly?.wind_speed_10m?.[idx] ?? (data?.current_weather?.windspeed ?? 0) * 0.621371),
      windDirection: Math.round(data?.hourly?.wind_direction_10m?.[idx] ?? data?.current_weather?.winddirection ?? 0),
      visibility: Math.round((data?.hourly?.visibility?.[idx] ?? 10000) / 1609.34 * 10) / 10,
      feelsLike: Math.round(data?.hourly?.apparent_temperature?.[idx] ?? data?.current_weather?.temperature ?? 0),
      uvIndex: Math.round(data?.hourly?.uv_index?.[idx] ?? 0),
      pressure: Math.round((data?.hourly?.pressure_msl?.[idx] ?? 1013) * 0.02953),
      sunrise: sunriseStr,
      sunset: sunsetStr,
      daylight: daylightStr,
      moonrise: moonriseStr,
      moonset: moonsetStr,
      moonPhase: moonPhaseStr,
      aqi: currentAqi,
      aqiCategory: currentAqiCategory,
      pollenData: pollenData,
      precipitation: totalPrecipitation,
      precipitationProbability: currentPrecipProb,
      cloudCover: Math.round(data?.hourly?.cloud_cover?.[idx] ?? 0),
      windGusts: Math.round(data?.hourly?.wind_gusts_10m?.[idx] ?? 0),
      snowfall: Math.round((snowfallCm / 2.54) * 10) / 10,
      snowDepth: snowDepthInches,
      dewPoint: currentDewPoint,
    };

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const hoursRemainingToday = 24 - currentHour - (currentMinute > 30 ? 1 : 0);
    const totalHoursNeeded = hoursRemainingToday + (10 * 24);
    const maxHours = Math.min(totalHoursNeeded, hourlyTimes.length - idx);
    
    const hourly: HourlyForecast[] = hourlyTimes.slice(idx, idx + maxHours).map((t: string, i: number) => {
      const j = idx + i;
      const hourDate = new Date(t);
      const precipProb = data?.hourly?.precipitation_probability?.[j] ?? 0;
      const precip = data?.hourly?.precipitation?.[j] ?? 0;
      const rain = data?.hourly?.rain?.[j] ?? 0;
      const showers = data?.hourly?.showers?.[j] ?? 0;
      const snow = data?.hourly?.snowfall?.[j] ?? 0;
      const totalPrecip = Math.round((precip + rain + showers + snow) * 10) / 10;
      const hourTemp = Math.round(data?.hourly?.temperature_2m?.[j] ?? 0);
      const hourSnow = Math.round((snow / 2.54) * 10) / 10;
      
      return {
        time: hourDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temperature: hourTemp,
        condition: weatherCodeToText(data?.hourly?.weathercode?.[j], hourTemp, hourSnow),
        precipitation: Math.max(precipProb, totalPrecip > 0 ? Math.min(100, totalPrecip * 20) : 0),
        icon: "",
        feelsLike: Math.round(data?.hourly?.apparent_temperature?.[j] ?? hourTemp),
        humidity: Math.round(data?.hourly?.relative_humidity_2m?.[j] ?? 0),
        windSpeed: Math.round(data?.hourly?.wind_speed_10m?.[j] ?? 0),
        windDirection: Math.round(data?.hourly?.wind_direction_10m?.[j] ?? 0),
        uvIndex: Math.round(data?.hourly?.uv_index?.[j] ?? 0),
        cloudCover: Math.round(data?.hourly?.cloud_cover?.[j] ?? 0),
      };
    });

    const daily: DailyForecast[] = (data?.daily?.time || []).slice(0, 11).map((d: string, i: number) => {
      const precipProb = data?.daily?.precipitation_probability_max?.[i] ?? 0;
      const precipSum = data?.daily?.precipitation_sum?.[i] ?? 0;
      const rainSum = data?.daily?.rain_sum?.[i] ?? 0;
      const showersSum = data?.daily?.showers_sum?.[i] ?? 0;
      const snowSum = data?.daily?.snowfall_sum?.[i] ?? 0;
      const totalPrecip = precipSum + rainSum + showersSum + snowSum;
      const dayHighTemp = Math.round(data?.daily?.temperature_2m_max?.[i] ?? 0);
      const dayLowTemp = Math.round(data?.daily?.temperature_2m_min?.[i] ?? 0);
      const dayAvgTemp = Math.round((dayHighTemp + dayLowTemp) / 2);
      const daySnow = Math.round((snowSum / 2.54) * 10) / 10;
      
      return {
        day: new Date(d).toLocaleDateString([], { weekday: "short" }),
        condition: weatherCodeToText(data?.daily?.weathercode?.[i], dayAvgTemp, daySnow),
        description: weatherCodeToText(data?.daily?.weathercode?.[i], dayAvgTemp, daySnow),
        highTemp: dayHighTemp,
        lowTemp: dayLowTemp,
        precipitation: Math.max(precipProb, totalPrecip > 0 ? Math.min(100, totalPrecip * 5) : 0),
        icon: "",
      };
    });

    const source: WeatherSource = {
      source: "Open-Meteo",
      location: locationName || "Selected Location",
      latitude: lat,
      longitude: lon,
      accuracy: 0.95,
      currentWeather: current,
      hourlyForecast: hourly,
      dailyForecast: daily,
    };

    const response: WeatherResponse = {
      sources: [source],
      mostAccurate: source,
      aggregated: source,
    };

    try {
      const { data, error } = await supabase.functions.invoke("aggregate-weather", {
        body: { lat, lon, locationName }
      });
      if (!error && data && Array.isArray((data as any).sources)) {
        const extraSources = (data as any).sources as WeatherSource[];
        response.sources = [...response.sources, ...extraSources];
      }
    } catch {}

    if (response.sources.length > 1) {
      try {
        const { data: llmData, error: llmError } = await supabase.functions.invoke("llm-weather-forecast", {
          body: { sources: response.sources, location: locationName }
        });
        
        if (!llmError && llmData && llmData.current) {
          const enhancedSource: WeatherSource = {
            ...response.mostAccurate,
            currentWeather: {
              ...response.mostAccurate.currentWeather,
              condition: llmData.current.condition || response.mostAccurate.currentWeather.condition,
              description: llmData.current.description || response.mostAccurate.currentWeather.description,
            },
            llmAnalysis: {
              summary: llmData.summary,
              modelAgreement: llmData.modelAgreement,
              confidence: llmData.current.confidence,
              insights: llmData.insights || [],
            }
          };
          
          response.mostAccurate = enhancedSource;
          response.aggregated = enhancedSource;
        }
      } catch {}
    }

    return response;
  },

  getCurrentLocation: (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  },
};
