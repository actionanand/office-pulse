import { Injectable } from '@angular/core';

import { TodoDbRecord } from '../models/todo-db.model';
import { formatTodoDate, nextTodoOccurrences } from '../utils/todo-recurrence';

interface LocalNotificationsPlugin {
  checkPermissions?: () => Promise<{ display?: string }>;
  requestPermissions?: () => Promise<{ display?: string }>;
  createChannel?: (options: {
    id: string;
    name: string;
    description: string;
    importance: number;
    vibration: boolean;
  }) => Promise<void>;
  schedule(options: { notifications: TodoNotification[] }): Promise<unknown>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<unknown>;
}

interface TodoNotification {
  id: number;
  title: string;
  body: string;
  channelId: string;
  smallIcon: string;
  largeIcon: string;
  autoCancel: boolean;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: Record<string, unknown>;
}

interface CapacitorBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
  Plugins?: { LocalNotifications?: LocalNotificationsPlugin };
}

@Injectable({ providedIn: 'root' })
export class TodoReminderService {
  private readonly channelId = 'office-pulse-todo-reminders';
  private readonly timers = new Map<string, number[]>();

  async shouldRequestPermission(): Promise<boolean> {
    const plugin = this.nativePlugin();
    if (plugin) {
      try {
        return (await plugin.checkPermissions?.())?.display !== 'granted';
      } catch {
        return false;
      }
    }
    return typeof Notification !== 'undefined' && Notification.permission !== 'granted';
  }

  async requestPermission(): Promise<boolean> {
    const plugin = this.nativePlugin();
    if (plugin) {
      try {
        return (await plugin.requestPermissions?.())?.display === 'granted';
      } catch {
        return false;
      }
    }
    if (typeof Notification === 'undefined') return false;
    return (Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()) === 'granted';
  }

  async syncAll(todos: readonly TodoDbRecord[]): Promise<void> {
    for (const todo of todos) {
      if (todo.reminderEnabled) await this.schedule(todo);
      else await this.cancel(todo.id);
    }
  }

  async schedule(todo: TodoDbRecord): Promise<void> {
    await this.cancel(todo.id);
    if (!todo.reminderEnabled || !todo.dueTime) return;

    const occurrences = nextTodoOccurrences(todo, new Date(), 24).filter(
      occurrence => !todo.completedDates.includes(formatTodoDate(occurrence)),
    );
    const plugin = this.nativePlugin();
    if (plugin) {
      const permission = await plugin.checkPermissions?.();
      if (permission && permission.display !== 'granted') return;
      await plugin.createChannel?.({
        id: this.channelId,
        name: 'Task reminders',
        description: 'Reminders for scheduled Office Pulse tasks',
        importance: 4,
        vibration: true,
      });
      const notifications = occurrences.map(occurrence => this.notification(todo, occurrence));
      if (notifications.length) await plugin.schedule({ notifications });
      this.writeIds(
        todo.id,
        notifications.map(item => item.id),
      );
      return;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const timerIds = occurrences
      .map(occurrence => {
        const at = occurrence.getTime() - todo.reminderMinutesBefore * 60_000;
        const delay = at - Date.now();
        if (delay <= 0 || delay > 2_147_000_000) return null;
        return window.setTimeout(() => new Notification(todo.title, { body: this.body(todo, occurrence) }), delay);
      })
      .filter((id): id is number => id !== null);
    this.timers.set(todo.id, timerIds);
  }

  async cancel(todoId: string): Promise<void> {
    for (const timer of this.timers.get(todoId) ?? []) window.clearTimeout(timer);
    this.timers.delete(todoId);

    const plugin = this.nativePlugin();
    const ids = this.readIds(todoId);
    if (plugin && ids.length) {
      try {
        await plugin.cancel({ notifications: ids.map(id => ({ id })) });
      } catch {
        /* Best-effort cleanup. */
      }
    }
    this.writeIds(todoId, []);
  }

  private notification(todo: TodoDbRecord, occurrence: Date): TodoNotification {
    return {
      id: this.notificationId(todo.id, formatTodoDate(occurrence)),
      title: todo.title,
      body: this.body(todo, occurrence),
      channelId: this.channelId,
      smallIcon: 'ic_stat_office_pulse',
      largeIcon: 'ic_launcher',
      autoCancel: true,
      schedule: { at: new Date(occurrence.getTime() - todo.reminderMinutesBefore * 60_000), allowWhileIdle: true },
      extra: { source: 'office-pulse', type: 'todo-reminder', todoId: todo.id, occurrence: occurrence.toISOString() },
    };
  }

  private body(todo: TodoDbRecord, occurrence: Date): string {
    const time = occurrence.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return todo.reminderMinutesBefore > 0 ? `Due at ${time}.` : `Scheduled for ${time}.`;
  }

  private nativePlugin(): LocalNotificationsPlugin | null {
    const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
    if (capacitor?.isNativePlatform?.() !== true || capacitor.getPlatform?.() !== 'android') return null;
    return (
      capacitor.Plugins?.LocalNotifications ??
      capacitor.registerPlugin?.<LocalNotificationsPlugin>('LocalNotifications') ??
      null
    );
  }

  private notificationId(todoId: string, date: string): number {
    let hash = 17;
    for (const character of `${todoId}|${date}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return 1_000_000 + (hash % 1_000_000_000);
  }

  private readIds(todoId: string): number[] {
    try {
      const value = JSON.parse(localStorage.getItem(`office_pulse_todo_reminders_${todoId}`) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : [];
    } catch {
      return [];
    }
  }

  private writeIds(todoId: string, ids: readonly number[]): void {
    try {
      const key = `office_pulse_todo_reminders_${todoId}`;
      if (ids.length) localStorage.setItem(key, JSON.stringify(ids));
      else localStorage.removeItem(key);
    } catch {
      /* Reminders still work for the current session. */
    }
  }
}
