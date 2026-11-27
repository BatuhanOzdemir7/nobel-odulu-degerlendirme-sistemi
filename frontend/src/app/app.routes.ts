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
    path: 'live-stage',
    loadComponent: () => import('./features/live-stage/live-stage.component').then(m => m.LiveStageComponent),
  },
  {
    path: 'dinamik-senaryolar',
    loadComponent: () => import('./features/scenarios/scenarios.component').then(m => m.ScenariosComponent),
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
      {
        path: 'ayarlar',
        loadComponent: () => import('./features/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent),
      },
    ],
  },
  {
    path: 'portal',
    canActivate: [authGuard],
    loadComponent: () => import('./features/portal/portal-shell/portal-shell.component').then(m => m.PortalShellComponent),
    children: [
      {
        path: 'kurulus',
        canActivate: [roleGuard('KURULUS')],
        loadComponent: () => import('./features/portal/kurulus/kurulus-portal.component').then(m => m.KurulusPortalComponent),
      },
      {
        path: 'aday',
        canActivate: [roleGuard('ADAY')],
        loadComponent: () => import('./features/portal/aday/aday-portal.component').then(m => m.AdayPortalComponent),
      },
      {
        path: 'uzman',
        canActivate: [roleGuard('UZMAN')],
        loadComponent: () => import('./features/portal/uzman/uzman-portal.component').then(m => m.UzmanPortalComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
