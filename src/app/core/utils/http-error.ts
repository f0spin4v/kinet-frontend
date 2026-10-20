import { HttpErrorResponse } from '@angular/common/http';

/** Un error de validación de campo del backend: { campo, mensaje }. */
interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/**
 * El backend responde { error: true, respuesta: "mensaje" } o, si fallan campos de un formulario,
 * { error: true, respuesta: [{ campo, mensaje }] }. Aquí se saca un texto para mostrar al usuario.
 */
export function mensajeDeError(e: HttpErrorResponse): string {
  if (e.status === 0) return 'No hay conexión con el servidor. Revisa tu internet.';
  const cuerpo = e.error?.respuesta;
  if (typeof cuerpo === 'string') return cuerpo;
  if (Array.isArray(cuerpo) && cuerpo.length > 0) {
    return (cuerpo as ErrorCampo[]).map(c => c.mensaje).join(' ');
  }
  if (e.status === 401) return 'Tu sesión no es válida o ya venció. Inicia sesión de nuevo.';
  if (e.status === 403) return 'No tienes permiso para hacer esta acción.';
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
