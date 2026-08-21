import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./features/layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'obras',
        loadComponent: () => import('./features/expediente/obras-list.component').then(m => m.ObrasListComponent)
      },
      {
        path: 'obras/:id',
        loadComponent: () => import('./features/expediente/expediente.component').then(m => m.ExpedienteComponent)
      },
      {
        path: 'mapa',
        loadComponent: () => import('./features/geolocalizacion/mapa.component').then(m => m.MapaComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
      },
      {
        path: 'bitacora',
        loadComponent: () => import('./features/bitacora/historial-general.component').then(m => m.HistorialGeneralComponent)
      },
      {
        path: 'bitacora/cambios',
        loadComponent: () => import('./features/bitacora/bitacora-cambios.component').then(m => m.BitacoraCambiosComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent)
      },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
