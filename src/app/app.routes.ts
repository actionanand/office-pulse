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
    path: 'rota',
    loadComponent: () => import('./components/rota/rota.component').then(m => m.RotaComponent),
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
    path: 'my-jira-tickets',
    loadComponent: () => import('./components/jira-tickets/jira-tickets.component').then(m => m.JiraTicketsComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'ticket-tracking',
    loadComponent: () =>
      import('./components/ticket-tracking/ticket-tracking.component').then(m => m.TicketTrackingComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'memos',
    loadComponent: () => import('./components/memos/memos.component').then(m => m.MemosComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('./components/bookmarks/bookmarks.component').then(m => m.BookmarksComponent),
    canActivate: [lockGuard],
  },
  {
    path: 'markdown',
    loadComponent: () =>
      import('./components/markdown-viewer/markdown-viewer.component').then(m => m.MarkdownViewerComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
