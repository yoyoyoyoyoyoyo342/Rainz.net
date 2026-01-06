export interface MinuteByMinute {
  time: string;
  precipitation: number;
  precipitationProbability: number;
}

export interface PollenData {
  grass: number;
  tree: number;
  weed: number;
}

export interface AQIData {
  value: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
}

export interface AstronomyData {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonPhase: string;
  moonIllumination: string;
}

export interface WeatherAlert {
  headline: string;
  severity: string;
  event: string;
  description: string;
}

export interface SnowData {
  snowIntensity: number; // inches/hour
  snowAccumulation: number; // inches (daily total)
  snowDepth: number; // inches (current depth)
  iceAccumulation: number; // inches
  temperature: number;
  windChill: number;
  precipProbability: number;
  weatherCode: number;
  source: string; // 'open-meteo' indicates authoritative snow data
}

export interface HyperlocalWeatherData {
  minuteByMinute: MinuteByMinute[];
  pollen: PollenData | null;
  aqi: AQIData | null;
  astronomy: AstronomyData | null;
  snow: SnowData | null;
  alerts: WeatherAlert[];
}
