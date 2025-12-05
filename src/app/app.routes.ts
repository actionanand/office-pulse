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
  },
  {
    path: 'bandwidth',
    loadComponent: () => import('./components/sprint-bandwidth/sprint-bandwidth.component').then(m => m.SprintBandwidthComponent)
  },
  {
    path: 'holidays',
    loadComponent: () => import('./components/office-holidays/office-holidays.component').then(m => m.OfficeHolidaysComponent)
  },
  {
    path: 'achievements',
    loadComponent: () => import('./components/achievements/achievements.component').then(m => m.AchievementsComponent)
  }
];
