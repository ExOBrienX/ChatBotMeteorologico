/**
 * Obtiene la descripción del clima según el código WMO
 */
export function getWeatherDescription(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: 'Despejado',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna densa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia fuerte',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve fuerte',
    77: 'Granizo',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos violentos',
    85: 'Nevadas ligeras',
    86: 'Nevadas intensas',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo fuerte',
  };

  return weatherCodes[code] || 'Desconocido';
}

/**
 * Obtiene el nombre del día en español desde una fecha
 */
export function getDayName(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

/**
 * Normaliza el nombre de un día a su versión estándar
 * Acepta días con y sin acentos, y convierte palabras coloquiales
 * Retorna el día en minúsculas para comparación
 */
export function normalizeDayName(input: string): string | null {
  // Limpiar y quitar acentos
  const cleaned = input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Mapa de días y sus variantes (todo sin acentos para comparación)
  const dayMap: { [key: string]: string } = {
    // Hoy
    'hoy': 'hoy',
    'today': 'hoy',
    'ahora': 'hoy',
    
    // Mañana (ambas versiones)
    'manana': 'mañana',
    'mañana': 'mañana',
    'tomorrow': 'mañana',
    
    // Pasado mañana
    'pasado manana': 'pasado mañana',
    'pasado mañana': 'pasado mañana',
    'pasadomanana': 'pasado mañana',
    'pasadomañana': 'pasado mañana',
    
    // Días de la semana
    'lunes': 'lunes',
    'monday': 'lunes',
    
    'martes': 'martes',
    'tuesday': 'martes',
    
    'miercoles': 'miércoles',
    'miércoles': 'miércoles',
    'wednesday': 'miércoles',
    
    'jueves': 'jueves',
    'thursday': 'jueves',
    
    'viernes': 'viernes',
    'friday': 'viernes',
    
    'sabado': 'sábado',
    'sábado': 'sábado',
    'saturday': 'sábado',
    
    'domingo': 'domingo',
    'sunday': 'domingo',
  };

  // Buscar coincidencia directa
  if (dayMap[cleaned]) {
    return dayMap[cleaned];
  }

  // Si empieza con "el ", quitarlo y reintentar
  if (cleaned.startsWith('el ')) {
    const withoutEl = cleaned.substring(3);
    if (dayMap[withoutEl]) {
      return dayMap[withoutEl];
    }
  }

  // Intentar buscar si contiene alguna palabra clave
  for (const [key, value] of Object.entries(dayMap)) {
    if (cleaned.includes(key)) {
      return value;
    }
  }

  return null;
}