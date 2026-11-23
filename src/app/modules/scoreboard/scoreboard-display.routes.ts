import { Routes } from '@angular/router';
export const SCOREBOARD_DISPLAY_ROUTES: Routes = [
  {
    path: 'events/:eventId/areas/:areaId/display',
    loadComponent: () =>
      import('./pages/display/scoreboard-display.component').then(
        (m) => m.ScoreboardDisplayPageComponent
      )
  }
];
