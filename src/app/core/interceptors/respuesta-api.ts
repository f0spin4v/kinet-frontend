import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * El backend envuelve cada respuesta en { error, respuesta }. Aquí se entrega solo "respuesta", así los servicios
 * trabajan con los tipos de api.models.ts. Las descargas (imágenes) no se tocan.
 */
export const respuestaApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  return next(req).pipe(
    map((evento: HttpEvent<unknown>) => {
      if (evento instanceof HttpResponse && evento.body && typeof evento.body === 'object'
          && 'respuesta' in evento.body && 'error' in evento.body) {
        return evento.clone({ body: (evento.body as { respuesta: unknown }).respuesta });
      }
      return evento;
    }),
  );
};
