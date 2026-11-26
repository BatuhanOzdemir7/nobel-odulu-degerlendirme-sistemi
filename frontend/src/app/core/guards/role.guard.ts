import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

export function roleGuard(...roller: Rol[]): CanActivateFn {
  return (route, state) => {
    const auth = inject(AuthService);
    if (!auth.isAuthenticated()) return authGuard(route, state);
    return auth.hasRole(...roller) || inject(Router).createUrlTree(['/forbidden']);
  };
}
