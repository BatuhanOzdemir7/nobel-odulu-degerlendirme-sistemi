import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'kayitlar' },
      {
        path: 'kayitlar',
        loadComponent: () => import('./features/kayitlar/kayitlar.component').then(m => m.KayitlarComponent),
      },
      {
        path: 'adaylar',
        loadComponent: () => import('./features/adaylar/adaylar.component').then(m => m.AdaylarComponent),
      },
      {
        path: 'uzmanlar-komiteler',
        loadComponent: () => import('./features/uzmanlar-komiteler/uzmanlar-komiteler.component').then(m => m.UzmanlarKomitelerComponent),
      },
      {
        path: 'aday-gosterme',
        loadComponent: () => import('./features/aday-gosterme/aday-gosterme.component').then(m => m.AdayGostermeComponent),
      },
      {
        path: 'degerlendirmeler',
        loadComponent: () => import('./features/degerlendirmeler/degerlendirmeler.component').then(m => m.DegerlendirmelerComponent),
      },
    ],
  },
  {
    path: 'portal/kurulus',
    canActivate: [authGuard, roleGuard('KURULUS')],
    loadComponent: () => import('./features/portal/portal-placeholder/portal-placeholder.component').then(m => m.PortalPlaceholderComponent),
  },
  {
    path: 'portal/aday',
    canActivate: [authGuard, roleGuard('ADAY')],
    loadComponent: () => import('./features/portal/portal-placeholder/portal-placeholder.component').then(m => m.PortalPlaceholderComponent),
  },
  {
    path: 'portal/uzman',
    canActivate: [authGuard, roleGuard('UZMAN')],
    loadComponent: () => import('./features/portal/portal-placeholder/portal-placeholder.component').then(m => m.PortalPlaceholderComponent),
  },
  { path: '**', redirectTo: 'login' },
];
