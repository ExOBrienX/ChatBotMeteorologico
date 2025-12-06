// Respuesta cruda de OpenMeteo API
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

// Respuesta de Geocoding API
export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}

// Tipos formateados para nuestro uso
export interface Location {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  description: string;
}

export interface DayForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  description: string;
}

// Respuestas finales
export interface CurrentWeatherResponse {
  location: Location;
  current: CurrentWeather;
}

export interface DayWeatherResponse {
  location: Location;
  day: DayForecast;
}

export interface WeeklyForecastResponse {
  location: Location;
  forecast: DayForecast[];
}