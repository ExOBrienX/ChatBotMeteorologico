import type {
  GeocodingResponse,
  OpenMeteoResponse,
  CurrentWeatherResponse,
  DayWeatherResponse,
  WeeklyForecastResponse,
  Location,
} from '../types/weather.types';
import {
  getWeatherDescription,
  getDayName,
  normalizeDayName,
} from '../utils/weather.utils';

/**
 * Obtiene las coordenadas de una ciudad usando Geocoding API
 */
async function getCityCoordinates(city: string, country: string = 'Chile'): Promise<Location> {
  console.log(`🔍 Buscando coordenadas para: ${city}, ${country}`);
  
  const searchQuery = `${city}, ${country}`;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=es&format=json`;
  
  console.log(`📍 URL de geocoding: ${url}`);
  
  const response = await fetch(url);
  const data: GeocodingResponse = await response.json();
  
  console.log('📦 Respuesta de geocoding:', JSON.stringify(data, null, 2));
  
  if (!data.results || data.results.length === 0) {
    throw new Error(`No se encontró la ciudad: ${city}`);
  }
  
  const result = data.results.find((r) =>
    r.country.toLowerCase().includes(country.toLowerCase()) ||
    r.admin1?.toLowerCase().includes(country.toLowerCase())
  ) || data.results[0];
  
  console.log(`✅ Ciudad encontrada: ${result.name}, ${result.country}`);
  console.log(`📌 Coordenadas: lat=${result.latitude}, lon=${result.longitude}`);
  
  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/**
 * TIPO 1: Obtiene el clima actual
 */
export async function getCurrentWeather(
  city: string,
  country: string = 'Chile'
): Promise<CurrentWeatherResponse> {
  try {
    console.log('\n☀️  CONSULTANDO CLIMA ACTUAL');
    console.log('================================');
    
    const location = await getCityCoordinates(city, country);
    
    console.log('\n🌡️  Obteniendo datos meteorológicos actuales...');
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    
    console.log(`🔗 URL: ${weatherUrl}`);
    
    const weatherResponse = await fetch(weatherUrl);
    const weatherData: OpenMeteoResponse = await weatherResponse.json();
    
    console.log('\n📊 DATOS CRUDOS:');
    console.log(JSON.stringify(weatherData.current, null, 2));
    
    const result: CurrentWeatherResponse = {
      location: {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      current: {
        time: weatherData.current.time,
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        precipitation: weatherData.current.precipitation,
        windSpeed: weatherData.current.wind_speed_10m,
        description: getWeatherDescription(weatherData.current.weather_code),
      },
    };
    
    console.log('\n✨ RESULTADO FORMATEADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('================================\n');
    
    return result;
  } catch (error) {
    console.error('❌ ERROR en getCurrentWeather:', error);
    throw error;
  }
}

/**
 * TIPO 2: Obtiene el clima para un día específico
 */
export async function getWeatherForDay(
  city: string,
  targetDay: string,
  country: string = 'Chile'
): Promise<DayWeatherResponse> {
  try {
    console.log(`\n📅  CONSULTANDO CLIMA PARA DÍA ESPECÍFICO: ${targetDay}`);
    console.log('================================');
    
    const location = await getCityCoordinates(city, country);
    
    console.log('\n🌡️  Obteniendo pronóstico diario...');
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=7`;
    
    console.log(`🔗 URL: ${weatherUrl}`);
    
    const weatherResponse = await fetch(weatherUrl);
    const weatherData: OpenMeteoResponse = await weatherResponse.json();
    
    console.log('\n📊 DATOS CRUDOS (días disponibles):');
    console.log(JSON.stringify(weatherData.daily, null, 2));
    
    // Normalizar el día solicitado
    const requestedDayName = normalizeDayName(targetDay);
    
    if (!requestedDayName) {
      throw new Error(`❌ No pude entender qué día solicitaste: "${targetDay}"`);
    }
    
    console.log(`🎯 Día normalizado: "${targetDay}" → "${requestedDayName}"`);
    
    // Calcular índice del día
    let dayIndex = -1;
    
    // Casos especiales: hoy, mañana, pasado mañana
    if (requestedDayName === 'hoy') {
      dayIndex = 0;
    } else if (requestedDayName === 'mañana') {
      dayIndex = 1;
    } else if (requestedDayName === 'pasado mañana') {
      dayIndex = 2;
    } else {
      // Para días de la semana, buscar el primer día que coincida
      for (let i = 0; i < weatherData.daily.time.length; i++) {
        const dayName = getDayName(weatherData.daily.time[i]).toLowerCase();
        if (dayName === requestedDayName) {
          dayIndex = i;
          break;
        }
      }
    }
    
    if (dayIndex === -1 || dayIndex >= weatherData.daily.time.length) {
      const availableDays = weatherData.daily.time
        .map((date, i) => `${getDayName(date)} (${date})`)
        .join(', ');
      throw new Error(
        `❌ No tengo datos para "${targetDay}". ` +
        `Solo tengo pronóstico hasta 7 días. ` +
        `Días disponibles: ${availableDays}`
      );
    }
    
    console.log(`✅ Encontrado en índice ${dayIndex}: ${weatherData.daily.time[dayIndex]}`);
    
    const result: DayWeatherResponse = {
      location: {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      day: {
        date: weatherData.daily.time[dayIndex],
        dayName: getDayName(weatherData.daily.time[dayIndex]),
        maxTemp: weatherData.daily.temperature_2m_max[dayIndex],
        minTemp: weatherData.daily.temperature_2m_min[dayIndex],
        precipitation: weatherData.daily.precipitation_sum[dayIndex],
        description: getWeatherDescription(weatherData.daily.weather_code[dayIndex]),
      },
    };
    
    console.log('\n✨ RESULTADO FORMATEADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('================================\n');
    
    return result;
  } catch (error) {
    console.error('❌ ERROR en getWeatherForDay:', error);
    throw error;
  }
}

/**
 * TIPO 3: Obtiene el pronóstico semanal
 */
export async function getWeeklyForecast(
  city: string,
  country: string = 'Chile'
): Promise<WeeklyForecastResponse> {
  try {
    console.log('\n📆  CONSULTANDO PRONÓSTICO SEMANAL');
    console.log('================================');
    
    const location = await getCityCoordinates(city, country);
    
    console.log('\n🌡️  Obteniendo pronóstico de 7 días...');
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=7`;
    
    console.log(`🔗 URL: ${weatherUrl}`);
    
    const weatherResponse = await fetch(weatherUrl);
    const weatherData: OpenMeteoResponse = await weatherResponse.json();
    
    console.log('\n📊 DATOS CRUDOS:');
    console.log(JSON.stringify(weatherData.daily, null, 2));
    
    const forecast = weatherData.daily.time.map((date, index) => ({
      date,
      dayName: getDayName(date),
      maxTemp: weatherData.daily.temperature_2m_max[index],
      minTemp: weatherData.daily.temperature_2m_min[index],
      precipitation: weatherData.daily.precipitation_sum[index],
      description: getWeatherDescription(weatherData.daily.weather_code[index]),
    }));
    
    const result: WeeklyForecastResponse = {
      location: {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      forecast,
    };
    
    console.log('\n✨ RESULTADO FORMATEADO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('================================\n');
    
    return result;
  } catch (error) {
    console.error('❌ ERROR en getWeeklyForecast:', error);
    throw error;
  }
}