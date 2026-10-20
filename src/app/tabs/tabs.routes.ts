import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      { path: 'inicio', loadComponent: () => import('../features/inicio/inicio').then(m => m.InicioPage) },
      { path: 'inicio/notificaciones', loadComponent: () => import('../features/inicio/notificaciones').then(m => m.NotificacionesPage) },
      { path: 'inicio/logros', loadComponent: () => import('../features/inicio/logros').then(m => m.LogrosPage) },
      { path: 'inicio/xp', loadComponent: () => import('../features/inicio/movimientos').then(m => m.MovimientosPage) },

      { path: 'entrenar', loadComponent: () => import('../features/entrenar/entrenar').then(m => m.EntrenarPage) },
      { path: 'entrenar/:id', loadComponent: () => import('../features/entrenar/detalle').then(m => m.DetalleEntrenamientoPage) },

      { path: 'retos', loadComponent: () => import('../features/retos/retos').then(m => m.RetosPage) },
      { path: 'retos/:id', loadComponent: () => import('../features/retos/detalle-reto').then(m => m.DetalleRetoPage) },

      { path: 'competir', loadComponent: () => import('../features/competir/competir').then(m => m.CompetirPage) },
      { path: 'competir/competencias/nueva', loadComponent: () => import('../features/competir/nueva-competencia').then(m => m.NuevaCompetenciaPage) },
      { path: 'competir/competencias/:id', loadComponent: () => import('../features/competir/competencia').then(m => m.CompetenciaPage) },
      { path: 'competir/enfrentamientos/:id', loadComponent: () => import('../features/competir/enfrentamiento').then(m => m.EnfrentamientoPage) },
      { path: 'competir/clan/nuevo', loadComponent: () => import('../features/competir/clan-form').then(m => m.ClanFormPage) },
      { path: 'competir/clan/:id/editar', loadComponent: () => import('../features/competir/clan-form').then(m => m.ClanFormPage) },
      { path: 'competir/clan/:id', loadComponent: () => import('../features/competir/clan').then(m => m.ClanPage) },

      { path: 'perfil', loadComponent: () => import('../features/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'perfil/editar', loadComponent: () => import('../features/profile/editar-perfil/editar-perfil').then(m => m.EditarPerfilPage) },
      { path: 'perfil/contrasena', loadComponent: () => import('../features/profile/contrasena').then(m => m.ContrasenaPage) },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];
