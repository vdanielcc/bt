import { Routes } from '@angular/router';
import { academyAdminGuard } from '../../core/auth/auth.guard';

export const ACADEMY_MANAGEMENT_ROUTES: Routes = [
  { path: 'payments', canActivate:[academyAdminGuard], loadComponent:()=>import('./billing/billing-payment-list.component').then(m=>m.BillingPaymentListComponent) },
  { path: 'attendance', data: {attendance:true}, loadComponent: () => import('./classes/class-sessions.component').then(m => m.ClassSessionsComponent) },
  { path: 'class-sessions', loadComponent: () => import('./classes/class-sessions.component').then(m => m.ClassSessionsComponent) },
  { path: 'calendar', data: { calendar: true }, loadComponent: () => import('./classes/class-sessions.component').then(m => m.ClassSessionsComponent) },
  { path: 'class-sessions/:sessionId', loadComponent: () => import('./classes/session-detail.component').then(m => m.SessionDetailComponent) },
  {
    path: 'users',
    canActivate: [academyAdminGuard],
    loadComponent: () =>
      import('./users/academy-users.component').then(
        (m) => m.AcademyUsersComponent
      )
  },
  {
    path: 'classes/new',
    loadComponent: () => import('./classes/class-form-page.component').then(m => m.ClassFormPageComponent)
  },
  {
    path: 'classes/:classId/edit',
    loadComponent: () => import('./classes/class-form-page.component').then(m => m.ClassFormPageComponent)
  },
  {
    path: 'classes/:classId',
    loadComponent: () =>
      import('./classes/class-detail.component').then(
        (m) => m.ClassDetailComponent
      )
  },
  {
    path: 'classes',
    loadComponent: () =>
      import('./classes/class-list.component').then((m) => m.ClassListComponent)
  },
  {
    path: 'instructors/:instructorId',
    loadComponent: () =>
      import('./instructors/instructor-detail.component').then(
        (m) => m.InstructorDetailComponent
      )
  },
  {
    path: 'instructors',
    loadComponent: () =>
      import('./instructors/instructor-list.component').then(
        (m) => m.InstructorListComponent
      )
  },
  {
    path: 'class-sessions/:sessionId/attendance',
    canDeactivate: [(component: {canDeactivate: () => import('rxjs').Observable<boolean>}) => component.canDeactivate()],
    loadComponent: () =>
      import('./attendance/attendance-register.component').then(
        (m) => m.AttendanceRegisterComponent
      )
  },
  {
    path: 'billing',
    loadComponent: () =>
      import('./billing/billing-dashboard.component').then(
        (m) => m.BillingDashboardComponent
      )
  },
  {
    path: 'billing-plans',
    loadComponent: () =>
      import('./billing/billing-plan-list.component').then(
        (m) => m.BillingPlanListComponent
      )
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/notification-management.component').then(
        (m) => m.NotificationManagementComponent
      )
  },
  {
    path: 'grading-systems/:systemId/levels',
    loadComponent: () =>
      import('./grading/grade-levels.component').then(
        (m) => m.GradeLevelsComponent
      )
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/academy-dashboard.component').then(
        (m) => m.AcademyDashboardComponent
      )
  },
  {
    path: 'training-modalities',
    data: { kind: 'modalities' },
    loadComponent: () =>
      import('./catalog/academy-catalog.component').then(
        (m) => m.AcademyCatalogComponent
      )
  },
  {
    path: 'rooms',
    data: { kind: 'rooms' },
    loadComponent: () =>
      import('./catalog/academy-catalog.component').then(
        (m) => m.AcademyCatalogComponent
      )
  },
  {
    path: 'styles',
    loadComponent: () =>
      import('./grading/academy-styles.component').then(
        (m) => m.AcademyStylesComponent
      )
  },
  { path: 'charges', loadComponent: () => import('./billing/billing-charge-list.component').then(m => m.BillingChargeListComponent) },
  { path: 'overdue', loadComponent: () => import('./billing/billing-overdue.component').then(m => m.BillingOverdueComponent) },
  ...['grading','grading-systems'].map(path=>({path,loadComponent:()=>import('./grading/grading-page.component').then(m=>m.GradingPageComponent)}))
];
