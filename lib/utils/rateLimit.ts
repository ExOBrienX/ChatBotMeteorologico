// Límite de uso en memoria, por cliente.
//
// El endpoint del chat es público y cada mensaje consume cuota de la API de
// Gemini, así que se limita cuántos mensajes puede enviar un mismo cliente
// por minuto.
//
// Limitación conocida: en Vercel cada instancia serverless tiene su propia
// memoria, por lo que el conteo no se comparte entre instancias. Es una
// protección básica contra abuso simple, no un límite estricto. Para uno
// estricto habría que guardar los contadores en un almacén compartido (Redis).

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const MAX_CLIENTS = 5_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(clientId: string, now: number = Date.now()): RateLimitResult {
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(clientId) ?? []).filter((t) => t > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(clientId, recent);
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(clientId, recent);

  // Evitar que el mapa crezca sin límite si llegan muchas IPs distintas
  if (hits.size > MAX_CLIENTS) {
    for (const [id, times] of hits) {
      if (times.every((t) => t <= windowStart)) hits.delete(id);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

// Vercel entrega la IP original en x-forwarded-for (primer valor de la lista)
export function getClientId(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'desconocido';
}
