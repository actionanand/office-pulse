import { Injectable } from '@angular/core';
import { EntryLog } from '../models/entry-log.model';

interface CapacitorLocalNotification {
  id: number;
  title: string;
  body: string;
  channelId?: string;
  smallIcon?: string;
  largeIcon?: string;
  autoCancel?: boolean;
  schedule: {
    at: Date;
    allowWhileIdle?: boolean;
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
    lights?: boolean;
    lightColor?: string;
    vibration?: boolean;
  }) => Promise<void>;
  checkExactNotificationSetting?: () => Promise<{ exact_alarm?: string }>;
  schedule: (options: { notifications: CapacitorLocalNotification[] }) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
  removeDeliveredNotifications?: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
}

interface OfficePulseReminderPlugin {
  sendLogoffReminder: (options: {
    id: number;
    title: string;
    body: string;
    minutesBefore: number;
    logoffAt: string;
  }) => Promise<unknown>;
  scheduleLogoffReminders?: (options: {
    reminders: Array<{
      id: number;
      title: string;
      body: string;
      minutesBefore: number;
      logoffAt: string;
      atMillis: number;
    }>;
  }) => Promise<unknown>;
  cancelLogoffReminders?: () => Promise<unknown>;
}

interface CapacitorBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(pluginName: string) => T;
  Plugins?: {
    LocalNotifications?: LocalNotificationsPlugin;
    OfficePulseReminder?: OfficePulseReminderPlugin;
  };
}

interface ReminderState {
  sessionKey: string;
  notifiedMinutes: number[];
  scheduledKey: string;
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
  private readonly stateKey = 'office_pulse_logoff_reminder_state';

  async shouldRequestNotificationPermission(): Promise<boolean> {
    try {
      const plugin = this.getPlugin();
      if (!plugin?.requestPermissions) return false;

      const status = await plugin.checkPermissions?.();
      return status?.display !== 'granted';
    } catch {
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      const plugin = this.getPlugin();
      if (!plugin) return false;

      return this.ensurePermission(plugin);
    } catch {
      return false;
    }
  }

  async syncWithActiveTimer(log: EntryLog | null, workHours: number, now: Date = new Date()): Promise<void> {
    if (!log?.entryTime || log.exitTime || log.isSubmitted) {
      await this.cancel();
      this.clearState();
      return;
    }

    await this.schedule(log.entryTime, workHours, now);
  }

  async syncFromRemainingText(
    entryTime: string,
    workHours: number,
    remainingText: string,
    now: Date = new Date(),
  ): Promise<void> {
    try {
      if (!remainingText || /^time to log off/i.test(remainingText.trim())) {
        await this.cancel();
        return;
      }

      if (!Number.isFinite(workHours) || workHours <= 0) {
        await this.cancel();
        return;
      }

      const entryDate = new Date(entryTime);
      if (Number.isNaN(entryDate.getTime())) return;

      const logoffAt = new Date(entryDate.getTime() + workHours * 60 * 60 * 1000);
      if (logoffAt.getTime() <= now.getTime()) {
        await this.cancel();
        return;
      }

      await this.schedule(entryTime, workHours, now);

      const reminder = this.getReminderFromRemainingText(remainingText);
      if (!reminder) return;

      const sessionKey = this.getSessionKey(entryTime, workHours, logoffAt);
      const existingState = this.readState();
      const state: ReminderState =
        !existingState || existingState.sessionKey !== sessionKey
          ? { sessionKey, notifiedMinutes: [], scheduledKey: '' }
          : existingState;

      if (state.notifiedMinutes.includes(reminder.minutes)) return;

      await this.sendImmediateReminder(reminder, logoffAt);
      state.notifiedMinutes = Array.from(new Set([...state.notifiedMinutes, reminder.minutes]));
      state.scheduledKey = '';
      this.writeState(state);
      await this.schedule(entryTime, workHours, now);
    } catch {
      // Notification support is best-effort and Android-only.
    }
  }

  async schedule(entryTime: string, workHours: number, now: Date = new Date()): Promise<void> {
    try {
      if (!Number.isFinite(workHours) || workHours <= 0) {
        await this.cancel();
        return;
      }

      const entryDate = new Date(entryTime);
      if (Number.isNaN(entryDate.getTime())) return;

      const logoffAt = new Date(entryDate.getTime() + workHours * 60 * 60 * 1000);
      const remainingMs = logoffAt.getTime() - now.getTime();

      if (remainingMs <= 0) {
        await this.cancel();
        this.clearState();
        return;
      }

      const sessionKey = this.getSessionKey(entryTime, workHours, logoffAt);
      const existingState = this.readState();
      let state: ReminderState;
      let isNewSession = false;

      if (!existingState || existingState.sessionKey !== sessionKey) {
        isNewSession = true;
        state = {
          sessionKey,
          notifiedMinutes: [],
          scheduledKey: '',
        };
      } else {
        state = existingState;
      }

      const crossedReminders = this.reminderOffsets.filter(
        reminder => remainingMs <= reminder.minutes * 60 * 1000 && !state.notifiedMinutes.includes(reminder.minutes),
      );
      const immediateReminder = crossedReminders.at(-1);
      const futureReminders = this.reminderOffsets
        .map(reminder => ({
          reminder,
          notifyAt: new Date(logoffAt.getTime() - reminder.minutes * 60 * 1000),
        }))
        .filter(
          ({ reminder, notifyAt }) =>
            notifyAt.getTime() > now.getTime() + 1000 && !state.notifiedMinutes.includes(reminder.minutes),
        );
      const scheduledKey = this.getScheduledKey(sessionKey, futureReminders);
      const shouldRescheduleFuture = isNewSession || state.scheduledKey !== scheduledKey;

      if (!shouldRescheduleFuture && !immediateReminder) return;

      const nativePlugin = this.getNativeReminderPlugin();
      const plugin = this.getPlugin();
      if (!nativePlugin && !plugin) return;

      const permissionGranted = plugin ? await this.ensurePermission(plugin) : true;
      if (!permissionGranted) return;

      if (plugin) {
        await this.ensureChannel(plugin);
      }
      const useExactSchedule = plugin ? await this.canUseExactSchedule(plugin) : false;

      if (shouldRescheduleFuture) {
        if (nativePlugin?.scheduleLogoffReminders) {
          await nativePlugin.cancelLogoffReminders?.();
          await nativePlugin.scheduleLogoffReminders({
            reminders: futureReminders.map(({ reminder, notifyAt }) =>
              this.createNativeReminderPayload(reminder, notifyAt, logoffAt),
            ),
          });
        } else if (plugin) {
          await this.cancelKnownNotifications(plugin);
          const futureNotifications = futureReminders.map(({ reminder, notifyAt }) =>
            this.createNotification(reminder, notifyAt, logoffAt, useExactSchedule),
          );

          if (futureNotifications.length > 0) {
            await plugin.schedule({ notifications: futureNotifications });
          }
        }

        state.scheduledKey = scheduledKey;
      }

      if (immediateReminder) {
        await this.sendImmediateReminder(immediateReminder, logoffAt, plugin, useExactSchedule);
        const crossedMinutes = crossedReminders.map(reminder => reminder.minutes);
        state.notifiedMinutes = Array.from(new Set([...state.notifiedMinutes, ...crossedMinutes]));
      }

      this.writeState(state);
    } catch {
      // Notification support is best-effort and Android-only.
    }
  }

  async cancel(): Promise<void> {
    try {
      await this.getNativeReminderPlugin()?.cancelLogoffReminders?.();

      const plugin = this.getPlugin();
      if (!plugin) {
        this.clearState();
        return;
      }

      await this.cancelKnownNotifications(plugin);
      this.clearState();
    } catch {
      this.clearState();
      // Ignore cancellation failures; the next schedule call replaces known ids.
    }
  }

  private async sendImmediateReminder(
    reminder: { minutes: number; id: number; label: string },
    logoffAt: Date,
    localPlugin: LocalNotificationsPlugin | null = null,
    useExactSchedule = false,
  ): Promise<void> {
    const title = `Log off in ${reminder.label}`;
    const body = `Remaining time is ${this.getRemainingDisplay(reminder.minutes)}. Target time: ${this.formatTime(logoffAt)}.`;
    const nativePlugin = this.getNativeReminderPlugin();
    const plugin = localPlugin ?? this.getPlugin();

    if (plugin) {
      const permissionGranted = await this.ensurePermission(plugin);
      if (!permissionGranted) return;
    }

    if (nativePlugin) {
      await nativePlugin.sendLogoffReminder({
        id: reminder.id,
        title,
        body,
        minutesBefore: reminder.minutes,
        logoffAt: logoffAt.toISOString(),
      });
      return;
    }

    if (!plugin) return;

    await this.ensureChannel(plugin);
    await this.cancelNotification(plugin, reminder.id);
    await plugin.schedule({
      notifications: [
        this.createNotification(reminder, new Date(Date.now() + 1000), logoffAt, useExactSchedule, title, body),
      ],
    });
  }

  private createNotification(
    reminder: { minutes: number; id: number; label: string },
    notifyAt: Date,
    logoffAt: Date,
    useExactSchedule: boolean,
    title = `Log off in ${reminder.label}`,
    body = `Remaining time is less than ${reminder.label}. Target time: ${this.formatTime(logoffAt)}.`,
  ): CapacitorLocalNotification {
    return {
      id: reminder.id,
      title,
      body,
      channelId: this.channelId,
      smallIcon: 'ic_stat_office_pulse',
      largeIcon: 'ic_launcher',
      autoCancel: true,
      schedule: {
        at: notifyAt,
        allowWhileIdle: useExactSchedule,
      },
      extra: {
        source: 'office-pulse',
        type: 'logoff-reminder',
        logoffAt: logoffAt.toISOString(),
        minutesBefore: reminder.minutes,
      },
    };
  }

  private createNativeReminderPayload(
    reminder: { minutes: number; id: number; label: string },
    notifyAt: Date,
    logoffAt: Date,
  ): {
    id: number;
    title: string;
    body: string;
    minutesBefore: number;
    logoffAt: string;
    atMillis: number;
  } {
    return {
      id: reminder.id,
      title: `Log off in ${reminder.label}`,
      body: `Remaining time is ${this.getRemainingDisplay(reminder.minutes)}. Target time: ${this.formatTime(logoffAt)}.`,
      minutesBefore: reminder.minutes,
      logoffAt: logoffAt.toISOString(),
      atMillis: notifyAt.getTime(),
    };
  }

  private async cancelKnownNotifications(plugin: LocalNotificationsPlugin): Promise<void> {
    await plugin.cancel({
      notifications: this.notificationIds.map(id => ({ id })),
    });
    await plugin.removeDeliveredNotifications?.({
      notifications: this.notificationIds.map(id => ({ id })),
    });
  }

  private async cancelNotification(plugin: LocalNotificationsPlugin, id: number): Promise<void> {
    await plugin.cancel({ notifications: [{ id }] });
    await plugin.removeDeliveredNotifications?.({ notifications: [{ id }] });
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

  private getNativeReminderPlugin(): OfficePulseReminderPlugin | null {
    const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
    const isAndroidApp = capacitor?.isNativePlatform?.() === true && capacitor.getPlatform?.() === 'android';

    if (!isAndroidApp) return null;
    return capacitor?.Plugins?.OfficePulseReminder ?? null;
  }

  private async ensurePermission(plugin: LocalNotificationsPlugin): Promise<boolean> {
    if (!plugin.checkPermissions && !plugin.requestPermissions) return true;

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
      lights: true,
      lightColor: '#667EEA',
      vibration: true,
    });
  }

  private async canUseExactSchedule(plugin: LocalNotificationsPlugin): Promise<boolean> {
    try {
      const status = await plugin.checkExactNotificationSetting?.();
      return status?.exact_alarm === 'granted';
    } catch {
      return false;
    }
  }

  private getSessionKey(entryTime: string, workHours: number, logoffAt: Date): string {
    return `${entryTime}|${workHours}|${logoffAt.toISOString()}`;
  }

  private getReminderFromRemainingText(remainingText: string): { minutes: number; id: number; label: string } | null {
    const normalized = remainingText
      .toLowerCase()
      .replace(/^remaining:\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (/^1\s*(hr|hour)\s*0\s*(min|minute)s?$/.test(normalized)) {
      return this.reminderOffsets[0];
    }

    const minuteMatch = normalized.match(/^(\d+)\s*(min|minute)s?$/);
    if (!minuteMatch) return null;

    const minutes = Number(minuteMatch[1]);
    return this.reminderOffsets.find(reminder => reminder.minutes === minutes) ?? null;
  }

  private getRemainingDisplay(minutes: number): string {
    if (minutes === 60) return '1 hour 0 minutes';
    return `${minutes} minutes`;
  }

  private getScheduledKey(
    sessionKey: string,
    futureReminders: Array<{ reminder: { minutes: number }; notifyAt: Date }>,
  ): string {
    return `${sessionKey}|${futureReminders.map(({ reminder, notifyAt }) => `${reminder.minutes}:${notifyAt.getTime()}`).join(',')}`;
  }

  private readState(): ReminderState | null {
    try {
      const raw = localStorage.getItem(this.stateKey);
      if (!raw) return null;

      const state = JSON.parse(raw) as { sessionKey?: unknown; notifiedMinutes?: unknown; scheduledKey?: unknown };
      if (typeof state.sessionKey !== 'string') return null;

      return {
        sessionKey: state.sessionKey,
        notifiedMinutes: Array.isArray(state.notifiedMinutes)
          ? state.notifiedMinutes.filter((value): value is number => typeof value === 'number')
          : [],
        scheduledKey: typeof state.scheduledKey === 'string' ? state.scheduledKey : '',
      };
    } catch {
      return null;
    }
  }

  private writeState(state: ReminderState): void {
    try {
      localStorage.setItem(this.stateKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors; notifications still remain best-effort.
    }
  }

  private clearState(): void {
    try {
      localStorage.removeItem(this.stateKey);
    } catch {
      // Ignore storage errors.
    }
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
