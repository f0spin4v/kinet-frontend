import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/** Solo para quien NO ha iniciado sesión (login, registro, recuperar contraseña). */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return true;
  return router.createUrlTree([auth.rutaInicial()]);
};

/** Solo para un jugador que aún no hizo la evaluación de nivel. */
export const pendienteEvaluacionGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (!auth.esJugador() || auth.evaluado()) return router.createUrlTree([auth.rutaInicial()]);
  return true;
};

/** Para la app del jugador: sesión iniciada y evaluación completa. El equipo va a /staff. */
export const jugadorGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (!auth.esJugador()) return router.createUrlTree([auth.rutaInicial()]);
  if (!auth.evaluado()) return router.createUrlTree(['/evaluacion']);
  return true;
};

/** Para el panel del equipo (entrenador y administrador). Los jugadores van a /tabs. */
export const staffGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  if (!auth.esStaff()) return router.createUrlTree([auth.rutaInicial()]);
  return true;
};

/** Páginas que solo puede abrir el administrador (cuentas, analítica, temporadas, retos). */
export const administradorGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.cargarSesion();

  return auth.rol() === 'ADMINISTRADOR' ? true : router.createUrlTree([auth.rutaInicial()]);
};
