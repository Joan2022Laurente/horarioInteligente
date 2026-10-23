import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

/**
 * Telemetría HTTP para auditoría en vivo (tecla F12).
 *
 * <p>Registra cada petición saliente y su respuesta con latencia exacta
 * (`performance.now()`), código de estado y alerta de cuello de botella cuando
 * excede el umbral defensivo. Los streams de larga vida (SSE/chat) se excluyen
 * para no envolver su ciclo de vida ni saturar la consola.</p>
 */

/** Umbral (ms) a partir del cual una respuesta exitosa se marca como posible cuello de botella. */
const SLOW_MS = 3000;

/** Patrones de URL de streams long-lived que no se telemetrizan (el stream puede nunca "terminar"). */
const SILENCED_URL_PATTERNS = ['/chat/stream', '/sse', '/mcp'];

export const httpTraceInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.urlWithParams || req.url;
  if (SILENCED_URL_PATTERNS.some(pattern => url.includes(pattern))) {
    return next(req);
  }

  const startedAt = performance.now();
  const label = `${req.method} ${url}`;
  console.log(`[HTTP-TRACE] ⏳ Solicitando ${label} ...`);

  let settled = false;
  const elapsedMs = () => Math.round(performance.now() - startedAt);

  return next(req).pipe(
    tap({
      next: (event) => {
        if (settled || !(event instanceof HttpResponse)) return;
        settled = true;
        const ms = elapsedMs();
        const status = event.status;
        if (ms >= SLOW_MS) {
          console.warn(`[HTTP-TRACE] ⚠️ ${req.method} ${url} respondió en ${ms}ms [Status: ${status}] (ALERTA: Posible cuello de botella)`);
        } else {
          console.log(`[HTTP-TRACE] ✅ ${req.method} ${url} respondido en ${ms}ms [Status: ${status}]`);
        }
      },
      error: (err) => {
        if (settled) return;
        settled = true;
        console.error(`[HTTP-TRACE] ❌ ${req.method} ${url} falló en ${elapsedMs()}ms [Status: ${err?.status ?? 0}] ${err?.message ?? ''}`);
      }
    })
  );
};
