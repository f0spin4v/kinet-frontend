import { Routes } from '@angular/router';
import { administradorGuard } from '../core/guards/auth-guard';
import { StaffShellPage } from './staff-shell';

export const routes: Routes = [
  {
    path: '',
    component: StaffShellPage,
    children: [
      { path: 'moderacion', loadComponent: () => import('./moderacion').then(m => m.ModeracionPage) },
      { path: 'cuentas', canActivate: [administradorGuard], loadComponent: () => import('./cuentas').then(m => m.CuentasPage) },
      { path: 'analitica', canActivate: [administradorGuard], loadComponent: () => import('./analitica').then(m => m.AnaliticaPage) },
      { path: 'temporadas', canActivate: [administradorGuard], loadComponent: () => import('./temporadas').then(m => m.TemporadasPage) },
      { path: 'retos', canActivate: [administradorGuard], loadComponent: () => import('./retos-admin').then(m => m.RetosAdminPage) },
      { path: 'catalogo', canActivate: [administradorGuard], loadComponent: () => import('./catalogo').then(m => m.CatalogoPage) },
      { path: 'perfil', loadComponent: () => import('../features/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'perfil/editar', loadComponent: () => import('../features/profile/editar-perfil/editar-perfil').then(m => m.EditarPerfilPage) },
      { path: 'perfil/contrasena', loadComponent: () => import('../features/profile/contrasena').then(m => m.ContrasenaPage) },
      { path: '', redirectTo: 'moderacion', pathMatch: 'full' },
    ],
  },
];
