import { Routes } from '@angular/router';
export const SCOREBOARD_ROUTES: Routes = [
  { path: 'events/:eventId/categories/:categoryId/wkf', loadComponent: () => import('./pages/wkf/wkf-scoreboard.component').then(m => m.WkfScoreboardComponent) },
  {
    path: 'events/:eventId/areas/:areaId/demo',
    loadComponent: () => import('./pages/demo/scoreboard-demo.component').then(m => m.ScoreboardDemoComponent)
  },
  {
    path: 'events/:eventId/categories/:categoryId/kudo',
    loadComponent: () => import('./pages/kudo/kudo-scoreboard.component').then(m => m.KudoScoreboardComponent)
  },
  {
    path: 'events/:eventId/categories/:categoryId/results',
    loadComponent: () => import('./pages/category-results/scoreboard-category-results.component').then(m => m.ScoreboardCategoryResultsComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'control-tables'
  },
  {
    path: 'control-tables',
    loadComponent: () =>
      import('./pages/dashboard/scoreboard-dashboard.component').then(
        (m) => m.ScoreboardDashboardComponent
      )
  },
  {
    path: 'events/:eventId',
    loadComponent: () =>
      import('./pages/dashboard/scoreboard-dashboard.component').then(
        (m) => m.ScoreboardDashboardComponent
      )
  },
  ...['tatamis', 'matches', 'history'].map((path) => ({
    path,
    pathMatch: 'full' as const,
    redirectTo: 'control-tables'
  })),
  {
    path: 'events/:eventId/areas/:areaId/control',
    loadComponent: () =>
      import('./pages/control/scoreboard-control.component').then(
        (m) => m.ScoreboardControlComponent
      )
  },
  {
    path: 'events/:eventId/matches',
    loadComponent: () =>
      import('./pages/list/scoreboard-list.component').then(
        (m) => m.ScoreboardListComponent
      )
  },
  {
    path: 'events/:eventId/history',
    data: { history: true },
    loadComponent: () =>
      import('./pages/list/scoreboard-list.component').then(
        (m) => m.ScoreboardListComponent
      )
  }
];
