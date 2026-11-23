import {NotificationManagementService} from '../../pages/academy-management/services/notification-management.service';
import {GradingManagementService} from '../../pages/academy-management/services/grading-management.service';
import {map,catchError,of} from 'rxjs';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { canAccessRoute } from './route-access';

export const sectionGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (/^\/academies\/\d+\/notifications(?:[/?]|$)/.test(state.url)||state.url.split('?')[0]==='/mi-cuenta/notifications') {
    const academy=Number(/^\/academies\/(\d+)/.exec(state.url)?.[1]);
    return inject(NotificationManagementService).capabilities().pipe(map(c=>(academy?c.academies.some(a=>a.id===academy)&&c.permissions.some(p=>p==='notification.manage'||p==='notification.delivery.view'||p==='notification.rule.view'||p==='notification.template.view'):c.permissions.some(p=>p==='notification.view'||p==='notification.preference.view'))?true:router.createUrlTree(['/mi-cuenta'])),catchError(()=>of(router.createUrlTree(['/mi-cuenta']))));
  }
  if (/^\/academies\/\d+\/grading(?:-systems)?(?:\/|$)/.test(state.url)||state.url.split('?')[0]==='/mi-cuenta/grading') {
    const academy=Number(/^\/academies\/(\d+)/.exec(state.url)?.[1]);
    return inject(GradingManagementService).capabilities().pipe(map(c=>c.permissions.some(p=>p==='grading.student.view'||p==='grading.system.view')&&(!academy||c.academyIds.includes(academy))?true:router.createUrlTree(['/mi-cuenta'])),catchError(()=>of(router.createUrlTree(['/mi-cuenta']))));
  }
  return canAccessRoute(auth.getCurrentUser(), state.url)
    ? true : router.createUrlTree(['/mi-cuenta']);
};

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};

export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return router.createUrlTree([
    auth.getCurrentUser()?.rol === 'academy_admin'
      ? '/campeonatos/invitaciones'
      : '/dashboards/analytics'
  ]);
};

export const publicOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? router.createUrlTree(['/'])
    : true;
};

export const academyAdminGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  const session = auth.getCurrentUser();
  const academyId = Number(route.paramMap.get('academyId') ?? route.parent?.paramMap.get('academyId'));
  return session?.rol === 'academy_admin' && academyId > 0 && session.academieId === academyId
    ? true : router.createUrlTree(['/']);
};

export const systemAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.getCurrentUser()?.rol === 'admin' ? true : router.createUrlTree(['/']);
};
