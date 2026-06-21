import { Injectable } from '@angular/core';
import { EntryLog } from '../models/entry-log.model';

interface CapacitorLocalNotification {
  id: number;
  title: string;
  body: string;
  channelId?: string;
  autoCancel?: boolean;
  schedule: {
    at: Date;
  };
  extra?: Record<string, unknown>;
}

interface LocalNotificationsPlugin {
  checkPermissions?: () => Promise<{ display?: string }>;
  requestPermissions?: () => Promise<{ display?: string }>;
  createChannel?: (options: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    visibility?: number;
  }) => Promise<void>;
  schedule: (options: { notifications: CapacitorLocalNotification[] }) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
  removeDeliveredNotifications?: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
}

interface CapacitorBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(pluginName: string) => T;
  Plugins?: {
    LocalNotifications?: LocalNotificationsPlugin;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AndroidLogoffNotificationService {
  private readonly notificationIds = [701601, 701630, 701615];
  private readonly reminderOffsets = [
    { minutes: 60, id: 701601, label: '1 hour' },
    { minutes: 30, id: 701630, label: '30 minutes' },
    { minutes: 15, id: 701615, label: '15 minutes' },
  ];
  private readonly channelId = 'office-pulse-logoff-reminders';

  async syncWithActiveTimer(log: EntryLog | null, workHours: number): Promise<void> {
    if (!log?.entryTime || log.exitTime || log.isSubmitted) {
      await this.cancel();
      return;
    }

    await this.schedule(log.entryTime, workHours);
  }

  async schedule(entryTime: string, workHours: number): Promise<void> {
    try {
      const plugin = this.getPlugin();
      if (!plugin) return;

      await this.cancel();

      const permissionGranted = await this.ensurePermission(plugin);
      if (!permissionGranted) return;

      await this.ensureChannel(plugin);

      const entryDate = new Date(entryTime);
      if (Number.isNaN(entryDate.getTime())) return;

      const logoffAt = new Date(entryDate.getTime() + workHours * 60 * 60 * 1000);
      const now = Date.now();
      const notifications = this.reminderOffsets
        .map(reminder => ({
          reminder,
          notifyAt: new Date(logoffAt.getTime() - reminder.minutes * 60 * 1000),
        }))
        .filter(({ notifyAt }) => notifyAt.getTime() > now)
        .map(({ reminder, notifyAt }) => ({
          id: reminder.id,
          title: `Log off in ${reminder.label}`,
          body: `You can log off in ${reminder.label}. Target time: ${this.formatTime(logoffAt)}.`,
          channelId: this.channelId,
          autoCancel: true,
          schedule: {
            at: notifyAt,
          },
          extra: {
            source: 'office-pulse',
            type: 'logoff-reminder',
            logoffAt: logoffAt.toISOString(),
            minutesBefore: reminder.minutes,
          },
        }));

      if (notifications.length === 0) return;

      await plugin.schedule({ notifications });
    } catch {
      // Notification support is best-effort and Android-only.
    }
  }

  async cancel(): Promise<void> {
    try {
      const plugin = this.getPlugin();
      if (!plugin) return;

      await plugin.cancel({
        notifications: this.notificationIds.map(id => ({ id })),
      });
      await plugin.removeDeliveredNotifications?.({
        notifications: this.notificationIds.map(id => ({ id })),
      });
    } catch {
      // Ignore cancellation failures; the next schedule call replaces known ids.
    }
  }

  private getPlugin(): LocalNotificationsPlugin | null {
    const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
    const isAndroidApp = capacitor?.isNativePlatform?.() === true && capacitor.getPlatform?.() === 'android';

    if (!isAndroidApp) return null;
    return (
      capacitor?.Plugins?.LocalNotifications ??
      capacitor?.registerPlugin?.<LocalNotificationsPlugin>('LocalNotifications') ??
      null
    );
  }

  private async ensurePermission(plugin: LocalNotificationsPlugin): Promise<boolean> {
    const status = await plugin.checkPermissions?.();
    if (status?.display === 'granted') return true;

    const requested = await plugin.requestPermissions?.();
    return requested?.display === 'granted';
  }

  private async ensureChannel(plugin: LocalNotificationsPlugin): Promise<void> {
    await plugin.createChannel?.({
      id: this.channelId,
      name: 'Log off reminders',
      description: 'Reminders before your calculated Office Pulse log off time',
      importance: 4,
      visibility: 1,
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
