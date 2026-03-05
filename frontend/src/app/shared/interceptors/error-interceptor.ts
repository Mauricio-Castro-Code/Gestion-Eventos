import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../../services/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized = error.status === 401;
      const isAuthEndpoint =
        req.url.includes('/auth/login/') || req.url.includes('/auth/refresh/');

      if (isUnauthorized && !isAuthEndpoint && auth.isAuthenticated()) {
        auth.logout();
        void router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    })
  );
};
