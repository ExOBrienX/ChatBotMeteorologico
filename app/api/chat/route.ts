import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentWeather,
  getWeatherForDay,
  getWeeklyForecast,
} from '../../../lib/services/openmeteo.service';
import {
  formatCurrentWeatherForAI,
  formatDayWeatherForAI,
  formatWeeklyForecastForAI,
} from '../../../lib/utils/weather.formatters';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Función helper para retry con exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Si es 429, esperar y reintentar
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`⏳ Rate limit alcanzado. Reintentando en ${delay}ms... (intento ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Si no es 429 o ya no hay más reintentos, lanzar error
      throw error;
    }
  }
  
  throw lastError;
}

const SYSTEM_INSTRUCTION = `Eres un asistente meteorológico amigable especializado en Chile.

ANÁLISIS DE MENSAJE:
Determina si el usuario pregunta por:
1. Clima ACTUAL: "clima ahora", "temperatura actual", "cómo está"
2. Día ESPECIFICO: "mañana", "el martes", "pasado mañana"  
3. SEMANAL: "esta semana", "próximos días", "pronóstico semanal"
4. NO_CLIMA: Saludos, agradecimientos, etc.

IMPORTANTE: En el formato de respuesta usa palabras SIN ACENTOS.

FORMATO DE RESPUESTA para consultas de clima:
Escribe: INTENCION|tipo|ciudad|dia (todo sin acentos)
Ejemplos:
- INTENCION|ACTUAL|Santiago|null
- INTENCION|DIA_ESPECIFICO|Talca|manana
- INTENCION|SEMANAL|Valparaiso|null

Si NO puedes determinar la ciudad del contexto, escribe: INTENCION|NECESITA_CIUDAD

Para mensajes NO de clima, responde directamente.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje es requerido' },
        { status: 400 }
      );
    }

    console.log('\n🔵 Nueva consulta:', message);
    console.log('📊 API Key configurada:', process.env.GEMINI_API_KEY ? 'Sí ✅' : 'No ❌');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Filtrar historial relevante
    const relevantHistory = history
      .filter((msg: any) => {
        const content = msg.content.toLowerCase();
        const hasContext = 
          /clima|temperatura|lluvia|pronóstico|semana|mañana|hoy/i.test(content) ||
          /santiago|valparaíso|talca|temuco|viña/i.test(content) ||
          msg.role === 'user';
        
        const isShortCourtesy = 
          (content.includes('gracias') || content.includes('ok')) && content.length < 30;
        
        return hasContext && !isShortCourtesy;
      })
      .slice(-6);

    const conversationContext = relevantHistory
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Preparar el chat
    const chat = model.startChat({
      history: relevantHistory
        .filter((msg: any) => msg.role === 'user' || msg.role === 'model')
        .slice(1)
        .map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }],
        })),
    });

    // Primera llamada con retry
    const initialPrompt = `Contexto reciente:
${conversationContext}

Nuevo mensaje: "${message}"

Analiza y responde:
- Si pregunta por clima: escribe "INTENCION|tipo|ciudad|dia" (sin acentos)
- Si no puedes determinar ciudad: escribe "INTENCION|NECESITA_CIUDAD"
- Si NO es clima: responde normalmente

Tipos válidos: ACTUAL, DIA_ESPECIFICO, SEMANAL
Recuerda inferir la ciudad del contexto si no se menciona.`;

    console.log('📤 Enviando primera llamada a Gemini...');
    
    const initialResult = await retryWithBackoff(
      () => chat.sendMessage(initialPrompt),
      3,
      2000 // 2 segundos de delay inicial
    );
    
    const initialResponse = initialResult.response.text();
    console.log('📥 Respuesta de Gemini:', initialResponse);

    // Parsear intención
    if (!initialResponse.startsWith('INTENCION|') && !initialResponse.startsWith('INTENCIÓN|')) {
      // No es consulta de clima
      console.log('✅ Respuesta directa (no clima)');
      return NextResponse.json({ response: initialResponse });
    }

    const parts = initialResponse.replace('INTENCIÓN', 'INTENCION').split('|');
    
    if (parts[1] === 'NECESITA_CIUDAD') {
      console.log('❓ Ciudad no determinada');
      return NextResponse.json({ 
        response: '🤔 ¿De qué ciudad te gustaría saber el clima?' 
      });
    }

    // Extraer y limpiar los valores (trim para quitar espacios y saltos de línea)
    const [, rawType, rawCity, rawDay] = parts;
    const city = rawCity?.trim();
    const day = rawDay?.trim();
    
    // Normalizar el tipo (quitar acentos y espacios)
    const type = rawType?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    console.log(`📋 Intención: tipo=${type}, ciudad=${city}, día=${day}`);

    if (!city || city === 'null' || city === 'undefined' || city === '') {
      return NextResponse.json({ 
        response: '🤔 ¿De qué ciudad te gustaría saber el clima?' 
      });
    }

    // Obtener datos del clima
    let weatherData = '';
    const country = 'Chile';

    try {
      switch (type) {
        case 'ACTUAL':
          console.log(`☀️ Obteniendo clima ACTUAL de ${city}`);
          const current = await getCurrentWeather(city, country);
          weatherData = formatCurrentWeatherForAI(current);
          break;

        case 'DIA_ESPECIFICO':
        case 'DIAESPECIFICO':
          console.log(`📅 Obteniendo clima de ${day} en ${city}`);
          const dayWeather = await getWeatherForDay(city, day || 'mañana', country);
          weatherData = formatDayWeatherForAI(dayWeather);
          break;

        case 'SEMANAL':
          console.log(`📆 Obteniendo pronóstico SEMANAL de ${city}`);
          const weekly = await getWeeklyForecast(city, country);
          weatherData = formatWeeklyForecastForAI(weekly);
          break;

        default:
          return NextResponse.json({ 
            response: '🤔 No entendí qué pronóstico quieres. ¿Actual, mañana, o semanal?' 
          });
      }
    } catch (weatherError: any) {
      console.error('❌ Error obteniendo clima:', weatherError.message);
      return NextResponse.json({ 
        response: `❌ No pude obtener el clima de ${city}. Verifica el nombre de la ciudad.` 
      });
    }

    // Segunda llamada con retry
    const finalPrompt = `DATOS DEL CLIMA:
${weatherData}

Responde de forma natural y conversacional con estos datos.
Incluye recomendaciones útiles y emojis apropiados.`;

    console.log('📤 Enviando segunda llamada a Gemini...');
    
    const finalResult = await retryWithBackoff(
      () => chat.sendMessage(finalPrompt),
      3,
      2000
    );
    
    const response = finalResult.response.text();
    console.log('✅ Respuesta final generada exitosamente\n');

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('❌ ERROR FATAL:', error);
    console.error('❌ Status:', error.status);
    console.error('❌ Message:', error.message);
    
    // Manejo específico de errores
    if (error.status === 429) {
      return NextResponse.json({ 
        response: '⏰ El servicio está temporalmente saturado. Por favor espera 30 segundos e intenta de nuevo.' 
      });
    }

    if (error.message?.includes('API key')) {
      return NextResponse.json({ 
        response: '🔑 Error de configuración. Por favor contacta al administrador.' 
      });
    }

    return NextResponse.json({ 
      response: '❌ Ocurrió un error inesperado. Por favor intenta de nuevo.' 
    });
  }
}