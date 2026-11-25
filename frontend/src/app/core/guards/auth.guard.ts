import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) return true;
  const router = inject(Router);
  const requested = router.currentNavigation()?.initialUrl;
  const returnUrl = requested ? router.serializeUrl(requested) : state.url;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
};
