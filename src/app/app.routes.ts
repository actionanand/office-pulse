import { Routes } from '@angular/router';

import { lockGuard } from './lock-screen/lock.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./components/monthly-calendar/monthly-calendar.component').then(m => m.MonthlyCalendarComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'logger',
    loadComponent: () => import('./components/entry-logger/entry-logger.component').then(m => m.EntryLoggerComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'bandwidth',
    loadComponent: () =>
      import('./components/sprint-bandwidth/sprint-bandwidth.component').then(m => m.SprintBandwidthComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'holidays',
    loadComponent: () =>
      import('./components/office-holidays/office-holidays.component').then(m => m.OfficeHolidaysComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'achievements',
    loadComponent: () => import('./components/achievements/achievements.component').then(m => m.AchievementsComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'utilities',
    loadComponent: () => import('./components/utilities/utilities.component').then(m => m.UtilitiesComponent),
    canActivate: [lockGuard],
  },
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
