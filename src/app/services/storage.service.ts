import { Injectable } from '@angular/core';
import { EntryLog, AppSettings } from '../models/entry-log.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ENTRY_LOG_KEY = 'office_entry_log';
  private readonly SETTINGS_KEY = 'office_settings';

  // Entry Log Methods
  getEntryLog(): EntryLog | null {
    const data = localStorage.getItem(this.ENTRY_LOG_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveEntryLog(log: EntryLog): void {
    localStorage.setItem(this.ENTRY_LOG_KEY, JSON.stringify(log));
  }

  clearEntryLog(): void {
    localStorage.removeItem(this.ENTRY_LOG_KEY);
  }

  // Settings Methods
  getSettings(): AppSettings {
    const data = localStorage.getItem(this.SETTINGS_KEY);
    return data ? JSON.parse(data) : this.getDefaultSettings();
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  getDefaultSettings(): AppSettings {
    return {
      defaultWorkHours: 6,
      exitCalculatorTime: '18:00',
      showTodoList: false
    };
  }

  // Utility Methods
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

