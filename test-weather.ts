import { 
  getCurrentWeather, 
  getWeatherForDay, 
  getWeeklyForecast
} from './lib/services/openmeteo.service';

import {
  formatCurrentWeatherForAI,
  formatDayWeatherForAI,
  formatWeeklyForecastForAI
} from './lib/utils/weather.formatters';

async function testWeather() {
  try {
    console.log('\n🇨🇱 ====================================');
    console.log('   PRUEBAS CON CIUDADES DE CHILE');
    console.log('====================================\n');
    
    // ============================================
    // PRUEBA 1: CLIMA ACTUAL - Santiago
    // ============================================
    console.log('\n\n🧪 PRUEBA 1: CLIMA ACTUAL - Santiago');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const currentSantiago = await getCurrentWeather('Santiago', 'Chile');
    const formattedCurrent = formatCurrentWeatherForAI(currentSantiago);
    
    console.log('\n📝 TEXTO PARA IA:');
    console.log(formattedCurrent);
    
    // ============================================
    // PRUEBA 2: CLIMA PARA DÍA ESPECÍFICO - Talca
    // ============================================
    console.log('\n\n🧪 PRUEBA 2: CLIMA PARA MAÑANA - Talca');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const tomorrowTalca = await getWeatherForDay('Talca', 'mañana', 'Chile');
    const formattedTomorrow = formatDayWeatherForAI(tomorrowTalca);
    
    console.log('\n📝 TEXTO PARA IA:');
    console.log(formattedTomorrow);
    
    // ============================================
    // PRUEBA 3: CLIMA PARA HOY SÁBADO - Santiago
    // ============================================
    console.log('\n\n🧪 PRUEBA 3: CLIMA PARA HOY SÁBADO - Santiago');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const todaySantiago = await getWeatherForDay('Santiago', 'hoy sábado', 'Chile');
      const formattedToday = formatDayWeatherForAI(todaySantiago);
      
      console.log('\n📝 TEXTO PARA IA:');
      console.log(formattedToday);
    } catch (error: any) {
      console.log('\n⚠️  ERROR CONTROLADO:');
      console.log(error.message);
    }
    
    // ============================================
    // PRUEBA 4: PRONÓSTICO SEMANAL - Talca
    // ============================================
    console.log('\n\n🧪 PRUEBA 4: PRONÓSTICO SEMANAL - Talca');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const weeklyTalca = await getWeeklyForecast('Talca', 'Chile');
    const formattedWeekly = formatWeeklyForecastForAI(weeklyTalca);
    
    console.log('\n📝 TEXTO PARA IA:');
    console.log(formattedWeekly);
    
    console.log('\n\n✅ ====================================');
    console.log('   TODAS LAS PRUEBAS COMPLETADAS');
    console.log('====================================\n');
    
  } catch (error) {
    console.error('💥 Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testWeather();