import { inject, Injectable, signal } from '@angular/core';

import { AppLocalDataDatabaseService } from './app-local-data-database.service';

export type AppThemeId = 'premium-green' | 'classic-purple' | 'ocean-blue' | 'rose' | 'graphite';

export interface AppTheme {
  readonly id: AppThemeId;
  readonly name: string;
  readonly description: string;
  readonly swatches: readonly [string, string, string];
}

export const APP_THEMES: readonly AppTheme[] = [
  {
    id: 'premium-green',
    name: 'Premium Green',
    description: 'Emerald with a deep forest gradient',
    swatches: ['#23906b', '#176b50', '#0b4433'],
  },
  {
    id: 'classic-purple',
    name: 'Classic Purple',
    description: 'The original Office Pulse palette',
    swatches: ['#667eea', '#764ba2', '#eef1ff'],
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Clear blue with a deep teal finish',
    swatches: ['#247ba0', '#146c94', '#e8f4f8'],
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Muted berry with a warm rose accent',
    swatches: ['#b84f71', '#8f3b5b', '#f9edf1'],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral charcoal with a steel accent',
    swatches: ['#52606d', '#303a43', '#edf0f2'],
  },
];

const STORAGE_KEY = 'office_pulse_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes = APP_THEMES;
  private readonly appLocalData = inject(AppLocalDataDatabaseService);
  readonly activeTheme = signal<AppThemeId>(this.loadTheme());

  constructor() {
    this.applyTheme(this.activeTheme());
  }

  setTheme(theme: AppThemeId): void {
    if (!this.themes.some(option => option.id === theme)) return;
    this.activeTheme.set(theme);
    this.applyTheme(theme);
    this.appLocalData.setItem(STORAGE_KEY, theme);
  }

  private loadTheme(): AppThemeId {
    const stored = this.appLocalData.getItem(STORAGE_KEY) as AppThemeId | null;
    if (stored && APP_THEMES.some(theme => theme.id === stored)) return stored;
    return 'classic-purple';
  }

  private applyTheme(theme: AppThemeId): void {
    document.documentElement.dataset['theme'] = theme;
  }
}
