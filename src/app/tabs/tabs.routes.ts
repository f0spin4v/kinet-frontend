import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('../features/inicio/inicio').then(m => m.InicioPage),
      },
      {
        path: 'test',
        loadComponent: () => import('../features/test/test').then(m => m.TestPage),
      },
      {
        path: 'retos',
        loadComponent: () => import('../features/retos/retos').then(m => m.RetosPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('../features/profile/profile.page').then(m => m.ProfilePage),
      },
      {
        path: 'perfil/editar',
        loadComponent: () => import('../features/profile/editar-perfil/editar-perfil').then(m => m.EditarPerfilPage),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio/registrar',
        loadComponent: () => import('../features/entrenamiento/registrar/registrar').then(m => m.RegistrarPage),
      },
      {
        path: 'retos/:id',
        loadComponent: () => import('../features/retos/detalle-reto/detalle-reto').then(m => m.DetalleRetoPage),
      },
    ],
  },
];
