import { Injectable } from '@angular/core';
import { EntryLog, TodoItem, AppSettings } from '../models/entry-log.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ENTRY_LOG_KEY = 'office_entry_log';
  private readonly TODO_ITEMS_KEY = 'office_todo_items';
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

  // Todo Items Methods
  getTodoItems(): TodoItem[] {
    const data = localStorage.getItem(this.TODO_ITEMS_KEY);
    return data ? JSON.parse(data) : this.getDefaultTodos();
  }

  saveTodoItems(items: TodoItem[]): void {
    localStorage.setItem(this.TODO_ITEMS_KEY, JSON.stringify(items));
  }

  clearTodoItems(): void {
    localStorage.removeItem(this.TODO_ITEMS_KEY);
    // Restore default todos after clearing
    this.saveTodoItems(this.getDefaultTodos());
  }

  private getDefaultTodos(): TodoItem[] {
    return [
      {
        id: this.generateId(),
        time: '09:00',
        description: 'Send morning emails',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: this.generateId(),
        time: '10:00',
        description: 'Team standup meeting',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: this.generateId(),
        time: '14:00',
        description: 'Review pending tasks',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: this.generateId(),
        time: '17:00',
        description: 'End of day summary',
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Settings Methods
  getSettings(): AppSettings {
    const data = localStorage.getItem(this.SETTINGS_KEY);
    return data ? JSON.parse(data) : this.getDefaultSettings();
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  private getDefaultSettings(): AppSettings {
    return {
      defaultWorkHours: 6,
      exitCalculatorTime: '18:00'
    };
  }

  // Utility Methods
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
