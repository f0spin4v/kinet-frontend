import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';

/** Forma de las respuestas del backend: { error, respuesta } (ResponseDTO). */
interface Envoltura {
  error: boolean;
  respuesta: unknown;
}

function esEnvoltura(cuerpo: unknown): cuerpo is Envoltura {
  return typeof cuerpo === 'object' && cuerpo !== null && 'error' in cuerpo && 'respuesta' in cuerpo;
}

/** El mensaje puede venir como texto o como lista de { campo, mensaje } (errores de validación). */
function textoDeError(respuesta: unknown): string | null {
  if (typeof respuesta === 'string') return respuesta;
  if (Array.isArray(respuesta)) {
    return respuesta
      .map(item => (typeof item === 'string' ? item : (item as { mensaje?: string })?.mensaje))
      .filter(Boolean)
      .join(' ');
  }
  return null;
}

/**
 * Quita la envoltura { error, respuesta } del backend: en éxito deja solo "respuesta"; en error deja
 * el texto en e.error.mensaje, que es lo que lee mensajeDeError().
 */
export const respuestaInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) return next(req);

  return next(req).pipe(
    map(evento =>
      evento instanceof HttpResponse && esEnvoltura(evento.body)
        ? evento.clone({ body: evento.body.respuesta })
        : evento
    ),
    catchError((e: HttpErrorResponse) => {
      if (!esEnvoltura(e.error)) return throwError(() => e);
      return throwError(() => new HttpErrorResponse({
        error: { mensaje: textoDeError(e.error.respuesta) },
        headers: e.headers,
        status: e.status,
        statusText: e.statusText,
        url: e.url ?? undefined,
      }));
    })
  );
};
