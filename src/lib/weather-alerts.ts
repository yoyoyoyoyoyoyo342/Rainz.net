import { CurrentWeather } from "@/types/weather";

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "moderate" | "high" | "extreme";
  icon: string;
}

// Convert temperature for display based on user preference
function formatTemp(temp: number, isImperial: boolean): string {
  return `${temp}°${isImperial ? 'F' : 'C'}`;
}

// Get threshold values based on unit - thresholds defined in Fahrenheit, converted if needed
function getTempThreshold(fahrenheitValue: number, isImperial: boolean): number {
  if (isImperial) return fahrenheitValue;
  // Convert Fahrenheit threshold to Celsius for comparison
  return Math.round((fahrenheitValue - 32) * 5 / 9);
}

export function checkWeatherAlerts(weather: CurrentWeather, isImperial: boolean = true): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // UV Index alerts (unit-independent)
  if (weather.uvIndex >= 8) {
    alerts.push({
      id: "uv-extreme",
      title: "Extreme UV Warning",
      description: `UV Index is ${weather.uvIndex}. Avoid sun exposure between 10 AM and 4 PM.`,
      severity: "extreme",
      icon: "☀️"
    });
  } else if (weather.uvIndex >= 6) {
    alerts.push({
      id: "uv-high",
      title: "High UV Alert",
      description: `UV Index is ${weather.uvIndex}. Wear sunscreen and protective clothing.`,
      severity: "high",
      icon: "🌞"
    });
  }

  // Air Quality alerts (unit-independent)
  if (weather.aqi && weather.aqi > 150) {
    alerts.push({
      id: "aqi-unhealthy",
      title: "Unhealthy Air Quality",
      description: `Air Quality Index is ${weather.aqi}. Limit outdoor activities.`,
      severity: "high",
      icon: "💨"
    });
  } else if (weather.aqi && weather.aqi > 100) {
    alerts.push({
      id: "aqi-moderate",
      title: "Moderate Air Quality",
      description: `Air Quality Index is ${weather.aqi}. Sensitive groups should limit prolonged outdoor exertion.`,
      severity: "moderate",
      icon: "🌫️"
    });
  }

  // Wind speed alerts - thresholds in mph (convert if user is metric)
  // Weather data comes in user's preferred unit, so compare directly
  const windThreshold = isImperial ? 25 : 40; // 25 mph or 40 km/h
  const windUnit = isImperial ? 'mph' : 'km/h';
  if (weather.windSpeed >= windThreshold) {
    alerts.push({
      id: "wind-high",
      title: "High Wind Warning",
      description: `Wind speed is ${weather.windSpeed} ${windUnit}. Be cautious of falling debris.`,
      severity: "high",
      icon: "💨"
    });
  }

  // Visibility alerts - thresholds in miles (convert if user is metric)
  const visibilityThreshold = isImperial ? 2 : 3; // 2 miles or 3 km
  const visibilityUnit = isImperial ? 'miles' : 'km';
  if (weather.visibility <= visibilityThreshold) {
    alerts.push({
      id: "visibility-low",
      title: "Low Visibility Alert",
      description: `Visibility is only ${weather.visibility} ${visibilityUnit}. Drive with caution.`,
      severity: "moderate",
      icon: "🌫️"
    });
  }

  // Temperature extremes - use user's unit
  const extremeHeatThreshold = getTempThreshold(95, isImperial);
  const extremeColdThreshold = getTempThreshold(10, isImperial);
  const unitSymbol = isImperial ? '°F' : '°C';

  if (weather.temperature >= extremeHeatThreshold) {
    alerts.push({
      id: "heat-extreme",
      title: "Extreme Heat Warning",
      description: `Temperature is ${weather.temperature}${unitSymbol}. Stay hydrated and seek shade.`,
      severity: "extreme",
      icon: "🔥"
    });
  } else if (weather.temperature <= extremeColdThreshold) {
    alerts.push({
      id: "cold-extreme",
      title: "Extreme Cold Warning",
      description: `Temperature is ${weather.temperature}${unitSymbol}. Dress warmly and limit exposure.`,
      severity: "extreme",
      icon: "🥶"
    });
  }

  // Winter weather alerts
  // Heavy snowfall warning (inches or cm based on unit)
  const heavySnowThreshold = isImperial ? 2 : 5; // 2 inches or 5 cm
  const moderateSnowThreshold = isImperial ? 0.5 : 1.3; // 0.5 inches or 1.3 cm
  const snowUnit = isImperial ? '"' : 'cm';
  
  if (weather.snowfall && weather.snowfall > heavySnowThreshold) {
    alerts.push({
      id: "snow-heavy",
      title: "Heavy Snowfall Warning",
      description: `${weather.snowfall.toFixed(1)}${snowUnit} of snow expected. Travel not recommended.`,
      severity: "extreme",
      icon: "❄️"
    });
  } else if (weather.snowfall && weather.snowfall > moderateSnowThreshold) {
    alerts.push({
      id: "snow-moderate",
      title: "Snowfall Alert",
      description: `${weather.snowfall.toFixed(1)}${snowUnit} of snow expected. Drive with caution.`,
      severity: "high",
      icon: "🌨️"
    });
  }

  // Ice risk warning (based on temperature + precipitation)
  const freezingPoint = getTempThreshold(32, isImperial);
  const iceRisk = weather.temperature <= freezingPoint && weather.precipitation && weather.precipitation > 0;
  if (iceRisk) {
    alerts.push({
      id: "ice-danger",
      title: "Icy Conditions Warning",
      description: `Freezing rain creating hazardous ice. Avoid travel if possible.`,
      severity: "extreme",
      icon: "🧊"
    });
  }

  // Dangerous wind chill
  const dangerousWindChill = getTempThreshold(0, isImperial);
  const highWindChill = getTempThreshold(20, isImperial);
  
  if (weather.feelsLike <= dangerousWindChill) {
    alerts.push({
      id: "windchill-extreme",
      title: "Dangerous Wind Chill",
      description: `Feels like ${weather.feelsLike}${unitSymbol}. Frostbite possible in minutes. Limit outdoor exposure.`,
      severity: "extreme",
      icon: "🌬️"
    });
  } else if (weather.feelsLike <= highWindChill && weather.feelsLike < weather.temperature - (isImperial ? 10 : 6)) {
    alerts.push({
      id: "windchill-high",
      title: "High Wind Chill Advisory",
      description: `Feels like ${weather.feelsLike}${unitSymbol}. Dress in warm layers.`,
      severity: "high",
      icon: "🥶"
    });
  }

  // Blizzard conditions (heavy snow + high wind)
  const blizzardSnowThreshold = isImperial ? 3 : 7.6; // 3 inches or 7.6 cm
  const blizzardWindThreshold = isImperial ? 35 : 56; // 35 mph or 56 km/h
  
  if (weather.snowfall && weather.snowfall > blizzardSnowThreshold && weather.windSpeed >= blizzardWindThreshold) {
    alerts.push({
      id: "blizzard",
      title: "Blizzard Warning",
      description: `Heavy snow and winds ${weather.windSpeed} ${windUnit}. Whiteout conditions expected. Do not travel.`,
      severity: "extreme",
      icon: "🌨️"
    });
  }

  return alerts;
}
