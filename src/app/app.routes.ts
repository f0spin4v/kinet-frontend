import { Routes } from '@angular/router';
import { evaluadoGuard, invitadoGuard, pendienteEvaluacionGuard } from './core/guards/auth-guard';

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
    path: 'evaluacion',
    canActivate: [pendienteEvaluacionGuard],
    loadComponent: () => import('./features/evaluation/evaluation.page').then(m => m.EvaluationPage),
  },
  {
    path: 'tabs',
    canActivate: [evaluadoGuard],
    loadChildren: () => import('./tabs/tabs.routes').then(m => m.routes),
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
