import type {
  CurrentWeatherResponse,
  DayWeatherResponse,
  WeeklyForecastResponse,
} from '../types/weather.types';

/**
 * Formatea clima actual para que la IA lo entienda
 */
export function formatCurrentWeatherForAI(data: CurrentWeatherResponse): string {
  const { location, current } = data;
  
  return `🌤️ CLIMA ACTUAL en ${location.name}, ${location.country}:
  
📍 Hora: ${current.time}
🌡️ Temperatura: ${current.temperature}°C (Sensación térmica: ${current.feelsLike}°C)
☁️ Condición: ${current.description}
💧 Humedad: ${current.humidity}%
💨 Viento: ${current.windSpeed} km/h
🌧️ Precipitación: ${current.precipitation} mm`;
}

/**
 * Formatea clima de un día específico para que la IA lo entienda
 */
export function formatDayWeatherForAI(data: DayWeatherResponse): string {
  const { location, day } = data;
  
  return `📅 CLIMA para ${day.dayName} (${day.date}) en ${location.name}, ${location.country}:
  
☁️ Condición: ${day.description}
🌡️ Temperatura máxima: ${day.maxTemp}°C
🌡️ Temperatura mínima: ${day.minTemp}°C
🌧️ Precipitación: ${day.precipitation} mm`;
}

/**
 * Formatea pronóstico semanal para que la IA lo entienda
 */
export function formatWeeklyForecastForAI(data: WeeklyForecastResponse): string {
  const { location, forecast } = data;
  
  let message = `📆 PRONÓSTICO SEMANAL para ${location.name}, ${location.country}:\n\n`;
  
  forecast.forEach((day, index) => {
    const label = index === 0 ? '🔹 HOY' : index === 1 ? '🔸 MAÑANA' : `📍 ${day.dayName.toUpperCase()}`;
    message += `${label} (${day.date}):\n`;
    message += `   ${day.description} | Máx: ${day.maxTemp}°C | Mín: ${day.minTemp}°C | Lluvia: ${day.precipitation}mm\n\n`;
  });
  
  return message;
}