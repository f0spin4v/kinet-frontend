import { Routes } from '@angular/router';
import { invitadoGuard, jugadorGuard, pendienteEvaluacionGuard, staffGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'recuperar-contrasena',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/recuperar/recuperar.page').then(m => m.RecuperarPage),
  },
  {
    // el enlace del correo abre esta página (con ?token=...), haya o no una sesión iniciada
    path: 'restablecer-contrasena',
    loadComponent: () => import('./features/auth/restablecer/restablecer.page').then(m => m.RestablecerPage),
  },
  {
    path: 'evaluacion',
    canActivate: [pendienteEvaluacionGuard],
    loadComponent: () => import('./features/evaluation/evaluation.page').then(m => m.EvaluationPage),
  },
  {
    // un jugador que ya hizo la evaluación puede repetirla (cada 30 días)
    path: 'evaluacion/repetir',
    canActivate: [jugadorGuard],
    loadComponent: () => import('./features/evaluation/evaluation.page').then(m => m.EvaluationPage),
  },
  {
    path: 'tabs',
    canActivate: [jugadorGuard],
    loadChildren: () => import('./tabs/tabs.routes').then(m => m.routes),
  },
  {
    path: 'staff',
    canActivate: [staffGuard],
    loadChildren: () => import('./staff/staff.routes').then(m => m.routes),
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
