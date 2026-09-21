import { Routes } from '@angular/router';
import { MapaComponent } from './components/mapa/mapa.component';
import { AdminPendientesComponent } from './components/admin-pendientes/admin-pendientes.component';

export const routes: Routes = [
  { path: '', component: MapaComponent },
  // Sin login por ahora (a pedido). Cuando se agregue autenticación,
  // proteger esta ruta con canActivate: [authGuard].
  { path: 'admin/pendientes', component: AdminPendientesComponent },
  { path: '**', redirectTo: '' },
];
