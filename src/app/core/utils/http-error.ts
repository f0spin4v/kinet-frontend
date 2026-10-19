import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeError(e: HttpErrorResponse): string {
  if (e.status === 0) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (e.status === 401) return 'Correo o contraseña incorrectos.';
  return e.error?.mensaje ?? e.error?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.';
}
