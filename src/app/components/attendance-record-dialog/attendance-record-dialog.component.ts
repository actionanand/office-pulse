import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { AttendanceDbRecord, AttendanceDbStatus } from '../../models/attendance-db.model';
import { AppLocalDataDatabaseService } from '../../services/app-local-data-database.service';
import { AttendanceDatabaseService } from '../../services/attendance-database.service';
import { HolidayService } from '../../services/holiday.service';
import { SnackbarService } from '../../services/snackbar.service';

type EditableStatus = Extract<AttendanceDbStatus, 'Office' | 'WFH' | 'First Half Off' | 'Second Half Off' | 'Day Off'>;

@Component({
  selector: 'app-attendance-record-dialog',
  imports: [FormsModule, LucideDynamicIcon],
  templateUrl: './attendance-record-dialog.component.html',
  styleUrl: './attendance-record-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceRecordDialogComponent {
  private readonly database = inject(AttendanceDatabaseService);
  private readonly appLocalData = inject(AppLocalDataDatabaseService);
  private readonly holidays = inject(HolidayService);
  private readonly snackbar = inject(SnackbarService);

  readonly initialDate = input('');
  readonly record = input<AttendanceDbRecord | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected date = '';
  protected entryTime = '';
  protected exitTime = '';
  protected companyName = '';
  protected comments = '';
  protected status: EditableStatus = 'Office';

  constructor() {
    queueMicrotask(() => this.populate());
  }

  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }

  protected maxDate(): string {
    if (this.record()) return this.localDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.localDate(yesterday);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const existing = this.record();
    const date = this.date || this.initialDate();
    const entry = new Date(this.entryTime);
    const exit = new Date(this.exitTime);
    const isDayOff = this.status === 'Day Off';

    if (!date || (!isDayOff && (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())))) {
      this.snackbar.warning(isDayOff ? 'Choose a valid date.' : 'Choose a valid date, entry time and exit time.');
      return;
    }
    if (date > this.maxDate()) {
      this.snackbar.warning('Attendance cannot be added for a future date.');
      return;
    }
    if (!existing && date >= this.localDate(new Date())) {
      this.snackbar.warning('Use Logger Pro to record today. Past attendance must be before today.');
      return;
    }
    if (!isDayOff && this.localDate(entry) !== date) {
      this.snackbar.warning('Entry time must be on the selected attendance date.');
      return;
    }
    if (!isDayOff && exit.getTime() < entry.getTime()) {
      this.snackbar.warning('Exit time cannot be before entry time.');
      return;
    }
    if (!isDayOff && exit.getTime() > Date.now() + 60_000) {
      this.snackbar.warning('Exit time cannot be in the future.');
      return;
    }

    this.saving.set(true);
    try {
      const dateRecords = await this.database.getByDateRecords(date);
      const duplicate = dateRecords.find(record => record.id !== existing?.id);
      if (!existing && duplicate) {
        throw new Error(
          duplicate.status === 'Day Off'
            ? 'That date is already marked as day off.'
            : 'Attendance already exists for that date.',
        );
      }
      if (!existing && !isDayOff && (await this.isHoliday(date))) {
        throw new Error('Attendance cannot be added on an office holiday.');
      }

      const now = new Date().toISOString();
      await this.database.save({
        id: existing?.id ?? crypto.randomUUID(),
        date,
        entryTime: isDayOff ? undefined : entry.toISOString(),
        exitTime: isDayOff ? undefined : exit.toISOString(),
        status: this.status,
        companyName: this.companyName.trim() || undefined,
        comments: this.comments.trim() || undefined,
        workHours: existing?.workHours ?? this.defaultWorkHours(),
        submitted: existing?.submitted ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      this.snackbar.success(existing ? 'Attendance updated.' : 'Past attendance added.');
      this.saved.emit();
    } catch (error) {
      this.snackbar.error(error instanceof Error ? error.message : 'Attendance could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private populate(): void {
    const record = this.record();
    this.date = record?.date ?? this.initialDate();
    const baseDate = this.date || this.localDate(new Date());
    this.entryTime = record?.entryTime ? this.toInput(new Date(record.entryTime)) : `${baseDate}T09:00`;
    this.exitTime = record?.exitTime ? this.toInput(new Date(record.exitTime)) : `${baseDate}T15:00`;
    this.companyName = record?.companyName ?? '';
    this.comments = record?.comments ?? '';
    this.status = this.isEditableStatus(record?.status) ? record.status : 'Office';
  }

  private async isHoliday(date: string): Promise<boolean> {
    const data = await firstValueFrom(this.holidays.fetchHolidays());
    if (data.meta.notes.some(note => note.toLowerCase().includes('unable to fetch holiday data'))) {
      throw new Error('Office holidays could not be verified. Check your connection and retry.');
    }
    return data.holidays.some(holiday => this.normalizeHolidayDate(holiday.date) === date);
  }

  private normalizeHolidayDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : this.localDate(parsed);
  }

  private isEditableStatus(status?: AttendanceDbStatus): status is EditableStatus {
    return (
      status === 'Office' ||
      status === 'WFH' ||
      status === 'First Half Off' ||
      status === 'Second Half Off' ||
      status === 'Day Off'
    );
  }

  private defaultWorkHours(): number {
    const stored = Number(this.appLocalData.getItem('office_pulse_pro_work_hours'));
    return Number.isFinite(stored) && stored >= 0.5 && stored <= 24 ? stored : 6;
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private toInput(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
