# Chatbot del Clima

Asistente conversacional para consultar el clima en ciudades de Chile en lenguaje natural: "¿cómo está Talca ahora?", "¿va a llover mañana en Valparaíso?", "dame el pronóstico de la semana para Temuco".

**Demo:** https://chat-bot-meteorologico.vercel.app

## Cómo funciona

El modelo de lenguaje no inventa el clima. Cada consulta sigue tres pasos:

1. **Detección de intención.** Gemini lee el mensaje junto con el contexto reciente de la conversación y responde con un JSON: tipo de consulta (actual, día específico o semanal), ciudad y día. Si falta la ciudad, intenta deducirla de los mensajes anteriores; si no puede, la pregunta.
2. **Datos reales.** Con esa intención el servidor busca la ciudad y su pronóstico en Open-Meteo.
3. **Respuesta.** Gemini recibe los datos ya formateados en una conversación nueva, sin historial, y redacta la respuesta solo con esos datos.

Los mensajes que no son sobre el clima (saludos, agradecimientos) se responden directamente, sin consultar el pronóstico.

## Características

- Clima actual, pronóstico de un día concreto ("mañana", "el martes") y pronóstico semanal.
- Mantiene el contexto: se puede preguntar "¿y mañana?" sin repetir la ciudad.
- Se puede instalar en el celular como aplicación (PWA).
- Límite de mensajes por cliente y validación del tamaño de la entrada, para proteger la cuota de la API.
- Interfaz de chat adaptada a celular.

## Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Modelo de lenguaje | Gemini 2.5 Flash (`@google/generative-ai`) |
| Datos meteorológicos | Open-Meteo (geocodificación y pronóstico, sin clave de API) |
| Estilos | Tailwind CSS 4 |
| PWA | Manifest y service worker propios |
| Despliegue | Vercel |

## Estructura

```
app/
  api/chat/route.ts        Endpoint del chat: intención, datos y respuesta
  page.tsx                 Página principal
components/                Chat, mensajes e indicador de carga
lib/
  services/                Cliente de Open-Meteo
  utils/                   Formato de datos para el modelo, códigos WMO, límite de uso
  types/                   Tipos de las respuestas meteorológicas
test-weather.ts            Prueba manual del servicio de clima
```

## Ejecutar en local

Requisitos: Node.js 20 o superior y una clave de la API de Gemini (se obtiene en Google AI Studio).

```bash
npm install
cp .env.example .env.local
npm run dev
```

La aplicación queda en http://localhost:3000. Para probar solo el servicio de clima, sin el modelo:

```bash
npm run test:weather
```

## Limitaciones

- Solo busca ciudades de Chile.
- El límite de mensajes se guarda en memoria, por lo que en Vercel no se comparte entre instancias. Es una protección básica, no un límite estricto.
