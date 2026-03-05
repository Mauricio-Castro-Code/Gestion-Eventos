import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { UserRole } from '../models/role';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (allowedRoles.length === 0) {
    return true;
  }

  const role = auth.getCurrentRole();
  if (role && allowedRoles.includes(role)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
