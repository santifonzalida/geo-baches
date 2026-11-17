import { Routes } from '@angular/router';
import { MapaComponent } from './components/mapa/mapa.component';
import { AdminPendientesComponent } from './components/admin-pendientes/admin-pendientes.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MapaComponent,
    // Ruta hija: el mapa no se recrea al abrir o cerrar un detalle, y /bache/:id se puede compartir.
    children: [
      {
        path: 'bache/:id',
        loadComponent: () =>
          import('./components/detalle-bache/detalle-bache.component').then((m) => m.DetalleBacheComponent),
      },
    ],
  },
  { path: 'admin/login', component: LoginComponent },
  {
    path: 'admin',
    // Lazy: solo lo descarga el admin, no suma al bundle del mapa público.
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [authGuard],
  },
  { path: 'admin/pendientes', component: AdminPendientesComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
