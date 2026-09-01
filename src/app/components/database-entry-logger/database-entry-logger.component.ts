import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { AttendanceDbRecord, AttendanceDbStatus } from '../../models/attendance-db.model';
import { AttendanceDatabaseService } from '../../services/attendance-database.service';
import { AndroidLogoffNotificationService } from '../../services/android-logoff-notification.service';
import { AppLocalDataDatabaseService } from '../../services/app-local-data-database.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { AttendanceRecordDialogComponent } from '../attendance-record-dialog/attendance-record-dialog.component';

type ConfirmationAction = 'day-off' | 'remove' | null;
type TimeDialogMode = 'entry' | 'exit' | null;
type MetadataField = 'company' | 'comments';
const DEFAULT_COMPANY_KEY = 'office_pulse_default_company_name';

@Component({
  selector: 'app-database-entry-logger',
  imports: [FormsModule, LucideDynamicIcon, ConfirmationPopupComponent, AttendanceRecordDialogComponent],
  templateUrl: './database-entry-logger.component.html',
  styleUrl: './database-entry-logger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseEntryLoggerComponent implements OnInit, OnDestroy {
  @ViewChild('companyEditor') private companyEditor?: ElementRef<HTMLInputElement>;
  @ViewChild('commentsEditor') private commentsEditor?: ElementRef<HTMLTextAreaElement>;

  protected readonly database = inject(AttendanceDatabaseService);
  private readonly snackbar = inject(SnackbarService);
  private readonly logoffNotifications = inject(AndroidLogoffNotificationService);
  private readonly appLocalData = inject(AppLocalDataDatabaseService);

  protected readonly today = signal(this.localDate(new Date()));
  protected readonly todayRecords = computed(() =>
    this.database
      .records()
      .filter(record => record.date === this.today())
      .sort((a, b) => (a.entryTime ?? a.createdAt).localeCompare(b.entryTime ?? b.createdAt)),
  );
  protected readonly todayRecord = computed(() => this.todayRecords().at(-1) ?? null);
  protected readonly activeRecord = computed(
    () =>
      this.database
        .records()
        .find(record => Boolean(record.entryTime && !record.exitTime && record.status !== 'Day Off')) ?? null,
  );
  protected readonly displayedRecord = computed(() => this.activeRecord() ?? this.todayRecord());
  protected readonly canCreateToday = computed(() => !this.activeRecord() && !this.todayRecord());
  protected readonly canCreateSecondShift = computed(() => {
    const records = this.todayRecords();
    return (
      !this.activeRecord() && records.length === 1 && records[0].status !== 'Day Off' && Boolean(records[0].exitTime)
    );
  });
  protected readonly timeDialogMode = signal<TimeDialogMode>(null);
  protected readonly confirmationAction = signal<ConfirmationAction>(null);
  protected readonly saving = signal(false);
  protected readonly showPastEntryDialog = signal(false);
  protected readonly secondShiftEntry = signal(false);
  protected readonly editingMetadata = signal<MetadataField | null>(null);
  protected readonly metadataSaving = signal(false);
  protected readonly showNotificationPermissionConfirmation = signal(false);
  protected readonly currentTimestamp = signal(Date.now());
  protected readonly liveTime = computed(() => {
    const timestamp = this.currentTimestamp();
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });
  protected readonly workHours = signal(this.loadWorkHours());
  protected readonly targetLogoff = computed(() => {
    const entryTime = this.activeRecord()?.entryTime;
    if (!entryTime) return null;
    return new Date(Date.parse(entryTime) + this.workHours() * 60 * 60 * 1000);
  });
  protected readonly elapsedTime = computed(() => {
    const record = this.displayedRecord();
    this.currentTimestamp();
    if (!record?.entryTime) return '0 min';
    const end = record.exitTime ? Date.parse(record.exitTime) : Date.now();
    return this.formatMinutes(Math.max(0, Math.floor((end - Date.parse(record.entryTime)) / 60_000)));
  });
  protected readonly remainingTime = computed(() => {
    const target = this.targetLogoff();
    this.currentTimestamp();
    if (!target) return '';
    const minutes = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60_000));
    if (minutes <= 0) return 'Time to log off!';
    return this.formatMinutes(minutes);
  });
  protected readonly progressPercent = computed(() => {
    const record = this.displayedRecord();
    this.currentTimestamp();
    if (!record?.entryTime) return 0;
    const end = record.exitTime ? Date.parse(record.exitTime) : Date.now();
    const targetMinutes = Math.max(30, (record.workHours ?? this.workHours()) * 60);
    return Math.max(0, Math.round(((end - Date.parse(record.entryTime)) / 60_000 / targetMinutes) * 100));
  });
  protected readonly progressClass = computed(() => {
    const progress = this.progressPercent();
    if (progress >= 100) return 'complete';
    if (progress >= 80) return 'near';
    if (progress >= 50) return 'half';
    return 'early';
  });
  protected timeInput = '';
  protected companyName = '';
  protected comments = '';
  protected selectedStatus: AttendanceDbStatus | null = null;
  protected companyDraft = '';
  protected commentsDraft = '';
  private timerId?: number;
  private notificationsOwned = false;

  constructor() {
    effect(() => {
      this.currentTimestamp();
      const record = this.activeRecord();
      const hours = this.workHours();
      const remaining = this.remainingTime();
      const active = Boolean(record?.entryTime && !record.exitTime && record.status !== 'Day Off');

      if (active && record?.entryTime) {
        this.notificationsOwned = true;
        void this.logoffNotifications.syncFromRemainingText(record.entryTime, hours, remaining, new Date());
      } else if (this.notificationsOwned) {
        this.notificationsOwned = false;
        void this.logoffNotifications.cancel();
      }
    });

    this.timerId = window.setInterval(() => {
      const now = new Date();
      this.currentTimestamp.set(now.getTime());
      const currentDate = this.localDate(now);
      if (currentDate !== this.today()) this.today.set(currentDate);
    }, 1000);
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.database.initialize();
      const storedHours = this.displayedRecord()?.workHours;
      if (storedHours && Number.isFinite(storedHours)) this.workHours.set(storedHours);
    } catch {
      this.snackbar.error('Unable to open attendance history.');
    }
  }

  ngOnDestroy(): void {
    if (this.timerId !== undefined) window.clearInterval(this.timerId);
  }

  protected openTimeDialog(mode: Exclude<TimeDialogMode, null>, secondShift = false): void {
    if (mode === 'entry' && secondShift && !this.canCreateSecondShift()) {
      this.snackbar.warning('A second shift is not available for today.');
      return;
    }
    if (mode === 'entry' && !secondShift && !this.canCreateToday()) {
      this.snackbar.warning(
        this.activeRecord()
          ? 'Finish or remove the active shift first.'
          : 'Use Add second shift for another entry today.',
      );
      return;
    }

    const record = mode === 'exit' ? this.activeRecord() : null;
    if (mode === 'exit' && !record) {
      this.snackbar.warning('There is no active shift to exit.');
      return;
    }

    const storedTime = mode === 'exit' ? record?.exitTime : undefined;
    this.timeInput = this.toDateTimeInput(storedTime ? new Date(storedTime) : new Date());
    this.companyName = this.editingMetadata()
      ? this.companyDraft
      : (record?.companyName ?? this.getDefaultCompanyName());
    this.comments = this.editingMetadata() ? this.commentsDraft : (record?.comments ?? '');
    this.selectedStatus =
      record && record.status !== 'Pending' && record.status !== 'Day Off' ? record.status : 'Office';
    this.secondShiftEntry.set(mode === 'entry' && secondShift);
    this.timeDialogMode.set(mode);
  }

  protected closeTimeDialog(): void {
    if (!this.saving()) {
      this.timeDialogMode.set(null);
      this.secondShiftEntry.set(false);
    }
  }

  protected startMetadataEdit(field: MetadataField): void {
    const record = this.activeRecord();
    if (!record || record.exitTime) return;
    this.companyDraft = record.companyName ?? this.getDefaultCompanyName();
    this.commentsDraft = record.comments ?? '';
    this.editingMetadata.set(field);
    window.setTimeout(() => (field === 'company' ? this.companyEditor : this.commentsEditor)?.nativeElement.focus());
  }

  protected async saveMetadata(field: MetadataField): Promise<void> {
    if (this.metadataSaving() || this.editingMetadata() !== field) return;
    const record = this.activeRecord();
    if (!record || record.exitTime) {
      this.editingMetadata.set(null);
      return;
    }

    const companyName = this.companyDraft.trim() || undefined;
    const comments = this.commentsDraft.trim() || undefined;
    if (companyName === record.companyName && comments === record.comments) {
      this.editingMetadata.set(null);
      return;
    }

    this.metadataSaving.set(true);
    try {
      await this.database.save({ ...record, companyName, comments, updatedAt: new Date().toISOString() });
      this.editingMetadata.set(null);
      this.snackbar.success(`${field === 'company' ? 'Company' : 'Comments'} saved.`);
    } catch (error) {
      this.snackbar.error(this.message(error, 'Attendance details could not be saved.'));
    } finally {
      this.metadataSaving.set(false);
    }
  }

  protected async saveTime(): Promise<void> {
    if (this.saving()) return;
    const mode = this.timeDialogMode();
    const selected = new Date(this.timeInput);
    if (!mode || !this.timeInput || Number.isNaN(selected.getTime())) {
      this.snackbar.warning('Choose a valid date and time.');
      return;
    }
    if (mode === 'entry' && this.localDate(selected) !== this.today()) {
      this.snackbar.warning('The entry date must be today.');
      return;
    }
    if (selected.getTime() > Date.now() + 60_000) {
      this.snackbar.warning(`${mode === 'entry' ? 'Entry' : 'Exit'} time cannot be in the future.`);
      return;
    }
    if (mode === 'exit' && !this.selectedStatus) {
      this.snackbar.warning('Choose a work mode before saving exit.');
      return;
    }

    this.saving.set(true);
    try {
      const now = new Date().toISOString();
      if (mode === 'entry') {
        if (this.secondShiftEntry() ? !this.canCreateSecondShift() : !this.canCreateToday())
          throw new Error('Another entry is not available for today.');
        await this.database.save({
          id: crypto.randomUUID(),
          date: this.today(),
          entryTime: selected.toISOString(),
          status: 'Pending',
          companyName: this.getDefaultCompanyName() || undefined,
          workHours: this.workHours(),
          submitted: false,
          createdAt: now,
          updatedAt: now,
        });
        this.snackbar.success('Entry saved. Entry details are now locked until this record is removed.');
        void this.openNotificationPermissionConfirmationIfNeeded();
      } else {
        const existing = this.activeRecord();
        if (!existing?.entryTime) throw new Error('There is no active shift to exit.');
        if (selected.getTime() < new Date(existing.entryTime).getTime()) {
          this.snackbar.warning('Exit time cannot be before the entry time.');
          return;
        }
        await this.database.save({
          ...existing,
          exitTime: selected.toISOString(),
          status: this.selectedStatus!,
          companyName: this.companyName.trim(),
          comments: this.comments.trim() || undefined,
          updatedAt: now,
        });
        this.snackbar.success('Exit saved.');
      }
      this.timeDialogMode.set(null);
      this.secondShiftEntry.set(false);
    } catch (error) {
      this.snackbar.error(this.message(error, 'Attendance could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmAction(): Promise<void> {
    const action = this.confirmationAction();
    this.confirmationAction.set(null);
    try {
      if (action === 'day-off') {
        if (!this.canCreateToday()) throw new Error('Attendance is already recorded for today.');
        const now = new Date().toISOString();
        await this.database.save({
          id: crypto.randomUUID(),
          date: this.today(),
          status: 'Day Off',
          workHours: this.workHours(),
          submitted: false,
          createdAt: now,
          updatedAt: now,
        });
        this.snackbar.success('Day off saved.');
      } else if (action === 'remove') {
        const record = this.displayedRecord();
        if (record) await this.database.remove(record.id);
        this.snackbar.success('Attendance was removed. Entry is available again for that date.');
      }
    } catch {
      this.snackbar.error('Attendance could not be updated.');
    }
  }

  protected pastEntrySaved(): void {
    this.showPastEntryDialog.set(false);
  }

  protected formatDateTime(value?: string): string {
    if (!value) return 'Not marked';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  protected duration(record: AttendanceDbRecord): string {
    if (!record.entryTime || !record.exitTime) return 'In progress';
    const minutes = Math.max(0, Math.floor((Date.parse(record.exitTime) - Date.parse(record.entryTime)) / 60_000));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  protected displayedShiftNumber(): number {
    const displayed = this.displayedRecord();
    if (!displayed || displayed.date !== this.today()) return 1;
    const index = this.todayRecords().findIndex(record => record.id === displayed.id);
    return index >= 0 ? index + 1 : 1;
  }

  protected formatTargetLogoff(): string {
    const target = this.targetLogoff();
    if (!target) return '';
    return target.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  protected currentDateTimeMaximum(): string {
    this.currentTimestamp();
    return this.toDateTimeInput(new Date());
  }

  protected async updateWorkHours(hours: number): Promise<void> {
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
      this.snackbar.warning('Work hours must be between 0.5 and 24.');
      return;
    }

    this.workHours.set(hours);
    this.saveWorkHours(hours);
    const record = this.activeRecord();
    if (record && record.status !== 'Day Off') {
      try {
        await this.database.save({ ...record, workHours: hours, updatedAt: new Date().toISOString() });
      } catch (error) {
        this.snackbar.error(this.message(error, 'Work hours could not be saved.'));
      }
    }
  }

  protected closeNotificationPermissionConfirmation(): void {
    this.showNotificationPermissionConfirmation.set(false);
  }

  protected async confirmNotificationPermission(): Promise<void> {
    this.showNotificationPermissionConfirmation.set(false);
    const granted = await this.logoffNotifications.requestNotificationPermission();
    if (!granted) {
      this.snackbar.error('Notification permission was not enabled. You can allow it from Android app settings.');
      return;
    }
    this.snackbar.success('Notifications enabled for log off reminders.');
    const record = this.activeRecord();
    if (record?.entryTime) {
      await this.logoffNotifications.syncWithActiveTimer(
        { entryTime: record.entryTime, exitTime: record.exitTime, date: record.date },
        this.workHours(),
      );
    }
  }

  protected confirmationTitle(): string {
    return this.confirmationAction() === 'day-off' ? 'Mark today as day off?' : 'Remove attendance?';
  }

  protected confirmationMessage(): string {
    return this.confirmationAction() === 'day-off'
      ? 'This marks today as a day off in Logger Pro.'
      : `This removes the ${this.displayedRecord()?.date ?? 'selected'} entry and unlocks that date.`;
  }

  protected confirmationLabel(): string {
    return this.confirmationAction() === 'day-off' ? 'Mark day off' : 'Remove';
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private toDateTimeInput(date: Date): string {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 16);
  }

  private async openNotificationPermissionConfirmationIfNeeded(): Promise<void> {
    if (await this.logoffNotifications.shouldRequestNotificationPermission()) {
      this.showNotificationPermissionConfirmation.set(true);
    }
  }

  private loadWorkHours(): number {
    const stored = Number(this.appLocalData.getItem('office_pulse_pro_work_hours'));
    return Number.isFinite(stored) && stored >= 0.5 && stored <= 24 ? stored : 6;
  }

  private saveWorkHours(hours: number): void {
    this.appLocalData.setItem('office_pulse_pro_work_hours', String(hours));
  }

  private getDefaultCompanyName(): string {
    return this.appLocalData.getItem(DEFAULT_COMPANY_KEY)?.trim() ?? '';
  }

  private formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours} hr ${remainingMinutes} min` : `${remainingMinutes} min`;
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
