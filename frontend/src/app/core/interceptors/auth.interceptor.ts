import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL, SHOW_FORBIDDEN_IN_VIEW } from '../services/api-url';
import { AuthService, LOGIN_URL, RESTORING_SESSION } from '../services/auth.service';

const api = new URL(API_BASE_URL);
const loginPath = new URL(LOGIN_URL).pathname;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return next(request);
  }
  if (url.origin !== api.origin || (url.pathname !== api.pathname && !url.pathname.startsWith(`${api.pathname}/`))) {
    return next(request);
  }
  if (url.pathname === loginPath && request.method === 'POST') return next(request);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const authorized = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && token === auth.token) {
        if (error.status === 401) {
          auth.logout();
          if (!request.context.get(RESTORING_SESSION)) {
            const returnUrl = router.url;
            void router.navigate(['/login'], { queryParams: { reason: 'expired', returnUrl } });
          }
        } else if (error.status === 403 && !request.context.get(RESTORING_SESSION) &&
                   !request.context.get(SHOW_FORBIDDEN_IN_VIEW)) {
          void router.navigate(['/forbidden']);
        }
      }
      return throwError(() => error);
    }),
  );
};
