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

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Sistema de instrucciones para Gemini
const SYSTEM_INSTRUCTION = `Eres un asistente meteorológico amigable y conversacional especializado en Chile.

REGLAS CRÍTICAS:
- Cuando recibas datos del clima en el formato especificado, ÚSALOS SIEMPRE
- NUNCA ignores los datos proporcionados
- Cuando respondas los datos de la semana, no hagas resumenes generales, da los detalles de cada día de la semana como viene en los datos
- NUNCA inventes datos del clima
- No uses asteriscos,*, para responder asi **Hoy (2025-12-06):**,**Mañana (2025-12-07):**,**Lunes (2025-12-08):**, etc. Siempre evita los *
- Cuando tengas dudas sobre la ciudad o el día, pide aclaraciones amablemente
- Siempre busca las ciudades en Chile a menos que se indique lo contrario
- NUNCA uses placeholders como [Temperatura Máxima] o \[Ciudad]
- Si el usuario dice "gracias", "ok", "perfecto", solo responde amablemente SIN inventar datos
- Solo proporciona datos del clima cuando se te entreguen explícitamente
- Si el usuario dice "mañana hara calor?", "el domingo va a llover?", etc., busca la última ciudad mencionada en el contexto y responde amablemente usando los datos del clima proporcionados
- Si el usuario pregunta por clima lluvioso por ejemplo "va a llover esta semana?","cuando va a llover?", etc., busca de forma semanal y no de un dia especifico o mañana, y responde usando los datos proporcionados

TONO Y ESTILO:
- Sé conversacional, amigable y natural
- Usa emojis apropiados (☀️🌧️❄️⛅🌤️)
- Da recomendaciones útiles basadas en el clima
- Sé conciso pero informativo

Cuando recibas datos del clima, responde de forma natural e incluye consejos útiles.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje es requerido' },
        { status: 400 }
      );
    }

    // Inicializar el modelo
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Análisis de intención - incluir más contexto para capturar ciudades
    const relevantHistory = history
      .filter((msg: any) => {
        const content = msg.content.toLowerCase();
        // Mantener mensajes que mencionan ciudades o consultas de clima
        const hasWeatherContext = 
          content.includes('clima') ||
          content.includes('temperatura') ||
          content.includes('lluvia') ||
          content.includes('pronóstico') ||
          content.includes('semana') ||
          content.includes('mañana') ||
          content.includes('hoy') ||
          // Ciudades comunes de Chile
          content.includes('santiago') ||
          content.includes('valparaíso') ||
          content.includes('concepción') ||
          content.includes('talca') ||
          content.includes('temuco') ||
          content.includes('antofagasta') ||
          msg.role === 'user'; // Siempre incluir mensajes del usuario
        
        const isCourtesy = 
          content.includes('gracias') ||
          content.includes('de nada') ||
          content.includes('perfecto') && content.length < 20;
        
        return hasWeatherContext && !isCourtesy;
      })
      .slice(-6); // Más contexto para capturar ciudades

    const conversationContext = relevantHistory
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const intentPrompt = `Contexto de la conversación reciente:
${conversationContext}

Nuevo mensaje del usuario: "${message}"

REGLAS DE CONTEXTO:
1. Si el usuario menciona una ciudad explícitamente, úsala
2. Si el usuario NO menciona ciudad pero pregunta algo como:
   - "y para mañana?"
   - "y el clima?"
   - "y la semana?"
   - "¿y mañana?"
   Busca la última ciudad mencionada en el contexto y úsala

3. TIPOS DE CONSULTA:
   - Si dice "mañana", "el martes", etc. → DIA_ESPECIFICO
   - Si dice "semana", "próximos días" → SEMANAL
   - Si dice "ahora", "actual", "hoy" → ACTUAL
   - Si solo cambia la ciudad manteniendo contexto temporal → mantén el tipo anterior

4. Si el usuario solo dice "gracias", "ok", etc. → NO_CLIMA

Responde SOLO en formato JSON (sin markdown):
{
  "type": "ACTUAL" | "DIA_ESPECIFICO" | "SEMANAL" | "NO_CLIMA",
  "city": "nombre de la ciudad (del mensaje o del contexto) o null",
  "day": "día específico si aplica o null"
}`;

    const intentResult = await model.generateContent(intentPrompt);
    const intentText = intentResult.response.text().trim();
    
    console.log('\n🤖 Análisis de intención:', intentText);
    
    let intent;
    try {
      const cleanedText = intentText.replace(/```json\n?|\n?```/g, '').trim();
      intent = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Error parseando intención:', e);
      intent = { type: 'NO_CLIMA', city: null, day: null };
    }

    // Si no es una consulta de clima O no tiene ciudad, manejar apropiadamente
    if (intent.type === 'NO_CLIMA') {
      const chat = model.startChat({
        history: history
          .filter((msg: any) => msg.role === 'user' || msg.role === 'model')
          .slice(1)
          .map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }],
          })),
      });

      const result = await chat.sendMessage(message);
      const response = result.response.text();

      return NextResponse.json({ response });
    }

    // Si no hay ciudad pero sí es una consulta de clima, pedir aclaración
    if (!intent.city) {
      const chat = model.startChat({
        history: history
          .filter((msg: any) => msg.role === 'user' || msg.role === 'model')
          .slice(1)
          .map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }],
          })),
      });

      const clarificationPrompt = `El usuario preguntó: "${message}"
      
No pude identificar qué ciudad le interesa. Pregúntale amablemente de qué ciudad quiere saber el clima. Sé breve y natural.`;

      const result = await chat.sendMessage(clarificationPrompt);
      const response = result.response.text();

      return NextResponse.json({ response });
    }

    // Obtener datos del clima según el tipo de consulta
    let weatherData = '';
    const city = intent.city;
    const country = 'Chile';

    try {
      switch (intent.type) {
        case 'ACTUAL':
          console.log(`\n☀️ Consultando clima ACTUAL de ${city}`);
          const current = await getCurrentWeather(city, country);
          weatherData = formatCurrentWeatherForAI(current);
          break;

        case 'DIA_ESPECIFICO':
          console.log(`\n📅 Consultando clima para ${intent.day} en ${city}`);
          const day = await getWeatherForDay(city, intent.day || 'mañana', country);
          weatherData = formatDayWeatherForAI(day);
          break;

        case 'SEMANAL':
          console.log(`\n📆 Consultando pronóstico SEMANAL de ${city}`);
          const weekly = await getWeeklyForecast(city, country);
          weatherData = formatWeeklyForecastForAI(weekly);
          break;
      }
    } catch (weatherError: any) {
      weatherData = `Error: ${weatherError.message}`;
    }

    console.log('\n📝 Datos del clima obtenidos:\n', weatherData);

    // CAMBIO CLAVE: Crear chat SIN historial previo para responder con datos frescos
    // El historial puede confundir al modelo y hacer que responda con contexto anterior
    const freshChat = model.startChat({
      history: [], // Sin historial para esta respuesta específica
    });

    // Prompt más directo y claro
    const finalPrompt = `El usuario preguntó: "${message}"

DATOS DEL CLIMA ACTUALES:
${weatherData}

INSTRUCCIONES:
1. USA los datos proporcionados arriba para responder
2. Responde de forma natural y conversacional
3. Incluye recomendaciones útiles basadas en las temperaturas y condiciones
4. Usa emojis apropiados (☀️🌧️❄️⛅🌤️)
5. NO inventes datos, solo usa lo que se te proporcionó

Responde ahora:`;

    const result = await freshChat.sendMessage(finalPrompt);
    const response = result.response.text();

    console.log('\n✅ Respuesta generada:', response);

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('❌ Error en /api/chat:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud', details: error.message },
      { status: 500 }
    );
  }
}