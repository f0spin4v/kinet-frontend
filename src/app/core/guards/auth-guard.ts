import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/** Solo para quien NO ha iniciado sesión (login, registro). */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return true;
  return router.createUrlTree([auth.evaluado() ? '/tabs' : '/evaluacion']);
};

/** Solo para quien inició sesión pero aún no hizo la evaluación. */
export const pendienteEvaluacionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (auth.evaluado()) return router.createUrlTree(['/tabs']);
  return true;
};

/** Para la app principal: sesión iniciada y evaluación completa. */
export const evaluadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (!auth.evaluado()) return router.createUrlTree(['/evaluacion']);
  return true;
};
