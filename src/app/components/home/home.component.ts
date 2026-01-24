import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface QuickLink {
  path: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeComponent {
  readonly quickLinks: QuickLink[] = [
    {
      path: '/calendar',
      icon: '📅',
      title: 'Calendar',
      description: 'View monthly attendance and track your office days',
      color: '#667eea',
    },
    {
      path: '/logger',
      icon: '📝',
      title: 'Logger',
      description: 'Log your daily office entries and work hours',
      color: '#f093fb',
    },
    {
      path: '/bandwidth',
      icon: '⚡',
      title: 'Bandwidth',
      description: 'Calculate sprint bandwidth and capacity planning',
      color: '#f5576c',
    },
    {
      path: '/holidays',
      icon: '🎉',
      title: 'Holidays',
      description: 'Check office holidays and important days',
      color: '#4facfe',
    },
    {
      path: '/rota',
      icon: '🔄',
      title: 'Rota',
      description: 'View support rotation schedule and assignments',
      color: '#764ba2',
    },
    {
      path: '/achievements',
      icon: '🏆',
      title: 'Achievements',
      description: 'Track and celebrate your accomplishments',
      color: '#43e97b',
    },
    {
      path: '/utilities',
      icon: '🛠️',
      title: 'Utilities',
      description: 'Stopwatch, checklist, and quick transfer tools',
      color: '#fa709a',
    },
    {
      path: '/my-jira-tickets',
      icon: '🎫',
      title: 'My Jira Tickets',
      description: 'View and manage all Jira tickets created by me',
      color: '#667eea',
    },
    {
      path: '/ticket-tracking',
      icon: '🎯',
      title: 'Ticket Tracking',
      description: 'Track demo, release, spillover, and important tickets',
      color: '#f093fb',
    },
    {
      path: '/memos',
      icon: '📝',
      title: 'Memos',
      description: 'Quick notes and reminders in Google Keep style',
      color: '#4facfe',
    },
    {
      path: '/markdown',
      icon: '📄',
      title: 'Markdown Viewer',
      description: 'View and render markdown files with syntax highlighting',
      color: '#8b5cf6',
    },
  ];

  readonly currentHour = new Date().getHours();

  get greeting(): string {
    if (this.currentHour >= 4 && this.currentHour < 6) return 'Rise and Shine!';
    if (this.currentHour >= 6 && this.currentHour < 12) return 'Good Morning';
    if (this.currentHour >= 12 && this.currentHour < 17) return 'Good Afternoon';
    if (this.currentHour >= 17 && this.currentHour < 21) return 'Good Evening';
    return 'Good Night';
  }
}
