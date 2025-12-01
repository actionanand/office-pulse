import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'calendar',
    pathMatch: 'full'
  },
  {
    path: 'calendar',
    loadComponent: () => import('./components/monthly-calendar/monthly-calendar.component').then(m => m.MonthlyCalendarComponent)
  },
  {
    path: 'logger',
    loadComponent: () => import('./components/entry-logger/entry-logger.component').then(m => m.EntryLoggerComponent)
  }
];
