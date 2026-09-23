import { Routes } from '@angular/router';
import { MapaComponent } from './components/mapa/mapa.component';
import { AdminPendientesComponent } from './components/admin-pendientes/admin-pendientes.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: MapaComponent },
  { path: 'admin/login', component: LoginComponent },
  { path: 'admin/pendientes', component: AdminPendientesComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
