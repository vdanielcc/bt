import { LayoutComponent } from './layouts/layout/layout.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { authGuard, publicOnlyGuard, systemAdminGuard, sectionGuard, homeGuard } from './core/auth/auth.guard';

// Application routes are lazy-loaded to keep the initial bundle small.
// Academy and organizer event routes use the authenticated application layout.
export const appRoutes: VexRoutes = [
  {
    path: 'scoreboard',
    // External screens reuse the scoreboard without the administration shell.
    canMatch: [() => inject(Router).getCurrentNavigation()?.extractedUrl.queryParams['display'] === '1'],
    canActivate: [authGuard, sectionGuard],
    loadChildren: () => import('./modules/scoreboard/scoreboard.routes').then(m => m.SCOREBOARD_ROUTES)
  },
  {
    path: 'medallero/:eventId/pantalla',
    data: { display: true },
    loadComponent: () => import('./modules/medal-table/medal-table.component').then(m => m.MedalTableComponent)
  },
  {
    path: 'scoreboard/events/:eventId/areas/:areaId/display',
    canActivate: [authGuard, sectionGuard],
    loadComponent: () =>
      import(
        './modules/scoreboard/pages/display/scoreboard-display.component'
      ).then((m) => m.ScoreboardDisplayPageComponent)
  },
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./pages/pages/auth/login/login.component').then(
        (m) => m.LoginComponent
      )
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./pages/pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      )
  },
  {
    path: 'forgot-password',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import(
        './pages/pages/auth/forgot-password/forgot-password.component'
      ).then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/pages/auth/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  {
    path: 'reset-password.php',
    redirectTo: 'reset-password',
    pathMatch: 'full'
  },
  {
    path: 'eventos/:id',
    loadComponent: () =>
      import(
        './pages/pages/public-event-detail/public-event-detail.component'
      ).then((m) => m.PublicEventDetailComponent)
  },
  {
    path: 'coming-soon',
    loadComponent: () =>
      import('./pages/pages/coming-soon/coming-soon.component').then(
        (m) => m.ComingSoonComponent
      )
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard, sectionGuard],
    children: [
      { path: 'medallero', loadComponent: () => import('./modules/medal-table/medal-table.component').then(m => m.MedalTableComponent) },
      { path: 'medallero/:eventId', loadComponent: () => import('./modules/medal-table/medal-table.component').then(m => m.MedalTableComponent) },
      {path:'mi-cuenta/notifications',loadComponent:()=>import('./pages/academy-management/notifications/notification-inbox.component').then(m=>m.NotificationInboxComponent)},
      {path:'mi-cuenta/grading',data:{personal:true},loadComponent:()=>import('./pages/academy-management/grading/grading-page.component').then(m=>m.GradingPageComponent)},
      {
        path: 'mi-cuenta',
        loadComponent: () => import('./pages/academy-management/account/account-overview.component')
          .then(m => m.AccountOverviewComponent)
      },
      {
        path: 'campeonatos/mis-eventos/:eventId/tarifas',
        loadComponent: () => import('./pages/championships/pricing/event-pricing.component').then(m => m.EventPricingComponent)
      },
      {
        path: 'admin/events/:eventId/pricing',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/championships/pricing/event-pricing.component').then(m => m.EventPricingComponent)
      },
      {
        path: 'admin/events',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/championships/event-admin/event-admin.component')
          .then(m => m.EventAdminComponent)
      },
      {
        path: 'admin/events/:eventId/categories',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/championships/event-admin/event-categories.component')
          .then(m => m.EventCategoriesComponent)
      },
      {
        path: 'admin/events/:eventId/categories',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/championships/event-admin/event-categories.component')
          .then(m => m.EventCategoriesComponent)
      },
      {
        path: 'admin/styles-federations',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/academy-management/grading/style-federation-admin.component')
          .then(m => m.StyleFederationAdminComponent)
      },
      {
        path: 'admin/event-associations',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/championships/event-admin/event-associations.component')
          .then(m => m.EventAssociationsComponent)
      },
      {
        path: 'admin/students',
        canActivate: [systemAdminGuard],
        loadComponent: () => import('./pages/student-management/student-management.component')
          .then(m => m.StudentManagementComponent)
      },
      {
        path: 'admin/users',
        canActivate: [systemAdminGuard],
        data: { systemAdmin: true },
        loadComponent: () => import('./pages/academy-management/users/academy-users.component')
          .then(m => m.AcademyUsersComponent)
      },
      {
        path: 'scoreboard',
        loadChildren: () =>
          import('./modules/scoreboard/scoreboard.routes').then(
            (m) => m.SCOREBOARD_ROUTES
          )
      },
      {
        path: 'dashboards/analytics',
        loadComponent: () =>
          import(
            './pages/dashboards/dashboard-analytics/dashboard-analytics.component'
          ).then((m) => m.DashboardAnalyticsComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeGuard],
        children: []
      },
      {
        path: 'campeonatos/invitaciones',
        loadComponent: () =>
          import(
            './pages/championships/invitations/event-invitations.component'
          ).then((m) => m.EventInvitationsComponent)
      },
      {
        path: 'campeonatos/cronograma',
        loadComponent: () =>
          import('./pages/championships/schedule/schedule.component').then(
            (m) => m.ScheduleComponent
          )
      },
      {
        path: 'campeonatos/scoreboards',
        redirectTo: 'scoreboard',
        pathMatch: 'full'
      },
      {
        path: 'campeonatos/mis-eventos',
        loadComponent: () =>
          import('./pages/championships/my-events/my-events.component').then(
            (m) => m.MyEventsComponent
          )
      },
      {
        path: 'campeonatos/mis-eventos/:id/resumen',
        loadComponent: () =>
          import(
            './pages/championships/my-events/event-summary.component'
          ).then((m) => m.EventSummaryComponent)
      },
      {
        path: 'campeonatos/invitaciones/:id/resumen',
        loadComponent: () =>
          import('./pages/championships/invitations/registration-summary.component')
            .then((m) => m.RegistrationSummaryComponent)
      },
      {
        path: 'campeonatos/invitaciones/:id',
        loadComponent: () =>
          import(
            './pages/championships/invitations/event-detail.component'
          ).then((m) => m.EventDetailComponent)
      },
      {
        path: 'campeonatos/deportistas',
        loadComponent: () =>
          import('./pages/championships/students/students.component').then(
            (m) => m.StudentsComponent
          )
      },
      {
        path: 'students/:studentId',
        loadComponent: () =>
          import(
            './pages/academy-management/students/student-academy-profile.component'
          ).then((m) => m.StudentAcademyProfileComponent)
      },
      {
        path: 'academies/:academyId',
        loadChildren: () =>
          import('./pages/academy-management/academy-management.routes').then(
            (m) => m.ACADEMY_MANAGEMENT_ROUTES
          )
      },
      {
        path: 'academia/dashboard',
        loadComponent: () =>
          import(
            './pages/academy-management/dashboard/academy-dashboard.component'
          ).then((m) => m.AcademyDashboardComponent)
      },
      {
        path: 'academia/dojo-escuela',
        loadComponent: () =>
          import('./pages/academy/academy.component').then(
            (m) => m.AcademyComponent
          )
      },
      {
        path: 'apps',
        children: [
          {
            path: 'chat',
            loadChildren: () => import('./pages/apps/chat/chat.routes')
          },
          {
            path: 'mail',
            loadChildren: () => import('./pages/apps/mail/mail.routes'),
            data: {
              toolbarShadowEnabled: true,
              scrollDisabled: true
            }
          },
          {
            path: 'social',
            loadChildren: () => import('./pages/apps/social/social.routes')
          },
          {
            path: 'contacts',
            loadChildren: () => import('./pages/apps/contacts/contacts.routes')
          },
          {
            path: 'calendar',
            loadComponent: () =>
              import('./pages/apps/calendar/calendar.component').then(
                (m) => m.CalendarComponent
              ),
            data: {
              toolbarShadowEnabled: true
            }
          },
          {
            path: 'aio-table',
            loadComponent: () =>
              import('./pages/apps/aio-table/aio-table.component').then(
                (m) => m.AioTableComponent
              ),
            data: {
              toolbarShadowEnabled: false
            }
          },
          {
            path: 'help-center',
            loadChildren: () =>
              import('./pages/apps/help-center/help-center.routes')
          },
          {
            path: 'scrumboard',
            loadChildren: () =>
              import('./pages/apps/scrumboard/scrumboard.routes')
          },
          {
            path: 'editor',
            loadComponent: () =>
              import('./pages/apps/editor/editor.component').then(
                (m) => m.EditorComponent
              ),
            data: {
              scrollDisabled: true
            }
          }
        ]
      },
      {
        path: 'pages',
        children: [
          {
            path: 'pricing',
            loadComponent: () =>
              import('./pages/pages/pricing/pricing.component').then(
                (m) => m.PricingComponent
              )
          },
          {
            path: 'faq',
            loadComponent: () =>
              import('./pages/pages/faq/faq.component').then(
                (m) => m.FaqComponent
              )
          },
          {
            path: 'guides',
            loadComponent: () =>
              import('./pages/pages/guides/guides.component').then(
                (m) => m.GuidesComponent
              )
          },
          {
            path: 'invoice',
            loadComponent: () =>
              import('./pages/pages/invoice/invoice.component').then(
                (m) => m.InvoiceComponent
              )
          },
          {
            path: 'error-404',
            loadComponent: () =>
              import('./pages/pages/errors/error-404/error-404.component').then(
                (m) => m.Error404Component
              )
          },
          {
            path: 'error-500',
            loadComponent: () =>
              import('./pages/pages/errors/error-500/error-500.component').then(
                (m) => m.Error500Component
              )
          }
        ]
      },
      {
        path: 'ui',
        children: [
          {
            path: 'components',
            loadChildren: () =>
              import('./pages/ui/components/components.routes')
          },
          {
            path: 'forms/form-elements',
            loadComponent: () =>
              import(
                './pages/ui/forms/form-elements/form-elements.component'
              ).then((m) => m.FormElementsComponent)
          },
          {
            path: 'forms/form-wizard',
            loadComponent: () =>
              import('./pages/ui/forms/form-wizard/form-wizard.component').then(
                (m) => m.FormWizardComponent
              )
          },
          {
            path: 'icons',
            loadChildren: () => import('./pages/ui/icons/icons.routes')
          },
          {
            path: 'page-layouts',
            loadChildren: () =>
              import('./pages/ui/page-layouts/page-layouts.routes')
          }
        ]
      },
      {
        path: 'documentation',
        loadChildren: () => import('./pages/documentation/documentation.routes')
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/pages/errors/error-404/error-404.component').then(
            (m) => m.Error404Component
          )
      }
    ]
  }
];
