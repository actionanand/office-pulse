import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { AttendanceDbRecord } from '../../models/attendance-db.model';
import { PdfExportOptions } from '../../models/pdf-export.model';
import { AttendanceDatabaseService } from '../../services/attendance-database.service';
import { SheetEntry } from '../../services/gviz.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AttendanceRecordDialogComponent } from '../attendance-record-dialog/attendance-record-dialog.component';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';

interface DatabaseCalendarDay {
  readonly date: number;
  readonly fullDate: string;
  readonly currentMonth: boolean;
  readonly today: boolean;
  readonly future: boolean;
  readonly record?: AttendanceDbRecord;
  readonly records: readonly AttendanceDbRecord[];
}

@Component({
  selector: 'app-database-calendar',
  imports: [LucideDynamicIcon, AttendanceRecordDialogComponent, ConfirmationPopupComponent, DownloadDialogComponent],
  templateUrl: './database-calendar.component.html',
  styleUrl: './database-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseCalendarComponent implements OnInit {
  protected readonly database = inject(AttendanceDatabaseService);
  private readonly snackbar = inject(SnackbarService);
  private readonly pdfExport = inject(PdfExportService);

  protected readonly currentYear = signal(new Date().getFullYear());
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly selectedDay = signal<DatabaseCalendarDay | null>(null);
  protected readonly editorDate = signal('');
  protected readonly editorRecord = signal<AttendanceDbRecord | null>(null);
  protected readonly deleteRecord = signal<AttendanceDbRecord | null>(null);
  protected readonly showDownloadDialog = signal(false);
  protected readonly monthName = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
  );
  protected readonly monthRecords = computed(() => {
    const prefix = `${this.currentYear()}-${String(this.currentMonth()).padStart(2, '0')}`;
    return this.database.records().filter(record => record.date.startsWith(prefix));
  });
  protected readonly totalDays = computed(
    () =>
      new Set(
        this.monthRecords()
          .filter(record => record.status !== 'Day Off')
          .map(record => record.date),
      ).size,
  );
  protected readonly totalHours = computed(() => {
    const minutes = this.monthRecords().reduce((total, record) => total + this.durationMinutes(record), 0);
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  });
  protected readonly calendarDays = computed(() => this.buildCalendar());

  async ngOnInit(): Promise<void> {
    await this.refresh(false);
  }

  protected previousMonth(): void {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.update(year => year - 1);
    } else {
      this.currentMonth.update(month => month - 1);
    }
    this.selectedDay.set(null);
  }

  protected nextMonth(): void {
    if (!this.canGoNext()) return;
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update(year => year + 1);
    } else {
      this.currentMonth.update(month => month + 1);
    }
    this.selectedDay.set(null);
  }

  protected canGoNext(): boolean {
    const now = new Date();
    return this.currentYear() * 100 + this.currentMonth() < now.getFullYear() * 100 + now.getMonth() + 1;
  }

  protected selectDay(day: DatabaseCalendarDay): void {
    if (day.currentMonth && !day.future) this.selectedDay.set(day);
  }

  protected openEditor(date: string, record: AttendanceDbRecord | null = null): void {
    if (record?.status === 'Day Off') {
      this.snackbar.warning('Remove the day-off record before adding attendance for this date.');
      return;
    }
    this.editorDate.set(date);
    this.editorRecord.set(record);
    this.selectedDay.set(null);
  }

  protected closeEditor(): void {
    this.editorDate.set('');
    this.editorRecord.set(null);
  }

  protected editorSaved(): void {
    this.closeEditor();
  }

  protected async confirmDelete(): Promise<void> {
    const record = this.deleteRecord();
    this.deleteRecord.set(null);
    if (!record) return;
    try {
      await this.database.remove(record.id);
      this.selectedDay.set(null);
      this.snackbar.success('Attendance deleted.');
    } catch {
      this.snackbar.error('Attendance could not be deleted.');
    }
  }

  protected downloadPdf(options: PdfExportOptions): void {
    const grouped = new Map<string, AttendanceDbRecord[]>();
    for (const record of this.database.records()) {
      const records = grouped.get(record.date) ?? [];
      records.push(record);
      grouped.set(record.date, records);
    }
    const entries: SheetEntry[] = [...grouped.entries()].map(([date, records]) => this.toPdfEntry(date, records));
    this.pdfExport.generatePdf(entries, options);
  }

  protected async refresh(showMessage = true): Promise<void> {
    try {
      await this.database.refresh();
      if (showMessage) this.snackbar.success('Attendance refreshed.');
    } catch {
      this.snackbar.error('Unable to read attendance history.');
    }
  }

  protected formatTime(value?: string): string {
    if (!value) return 'Not marked';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  protected duration(record: AttendanceDbRecord): string {
    const minutes = this.durationMinutes(record);
    return record.entryTime && record.exitTime ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : 'In progress';
  }

  protected statusLabel(status: AttendanceDbRecord['status']): string {
    if (status === 'Pending') return 'Pending exit confirmation';
    return status === 'Office' ? 'Work from office' : status;
  }

  private buildCalendar(): readonly DatabaseCalendarDay[] {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const previousDays = new Date(year, month - 1, 0).getDate();
    const today = this.localDate(new Date());
    const records = new Map<string, AttendanceDbRecord[]>();
    for (const record of this.monthRecords()) {
      const group = records.get(record.date) ?? [];
      group.push(record);
      group.sort((left, right) => (left.entryTime ?? left.createdAt).localeCompare(right.entryTime ?? right.createdAt));
      records.set(record.date, group);
    }
    const result: DatabaseCalendarDay[] = [];

    for (let offset = firstWeekday - 1; offset >= 0; offset--) {
      result.push({
        date: previousDays - offset,
        fullDate: '',
        currentMonth: false,
        today: false,
        future: false,
        records: [],
      });
    }
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      result.push({
        date,
        fullDate,
        currentMonth: true,
        today: fullDate === today,
        future: fullDate > today,
        record: records.get(fullDate)?.at(-1),
        records: records.get(fullDate) ?? [],
      });
    }
    let nextDate = 1;
    while (result.length < 42) {
      result.push({ date: nextDate++, fullDate: '', currentMonth: false, today: false, future: false, records: [] });
    }
    return result;
  }

  private durationMinutes(record: AttendanceDbRecord): number {
    if (!record.entryTime || !record.exitTime) return 0;
    return Math.max(0, Math.floor((Date.parse(record.exitTime) - Date.parse(record.entryTime)) / 60_000));
  }

  private toPdfEntry(date: string, records: AttendanceDbRecord[]): SheetEntry {
    const sorted = [...records].sort((left, right) =>
      (left.entryTime ?? left.createdAt).localeCompare(right.entryTime ?? right.createdAt),
    );
    const dayOff = sorted.find(record => record.status === 'Day Off');
    const minutes = sorted.reduce((total, record) => total + this.durationMinutes(record), 0);
    const values = (selector: (record: AttendanceDbRecord) => string | undefined) =>
      [...new Set(sorted.map(selector).filter((value): value is string => Boolean(value)))].join(' / ') || undefined;
    return {
      timestamp: sorted.at(-1)?.updatedAt ?? '',
      date,
      entryTime: sorted[0]?.entryTime ?? '',
      exitTime: sorted.at(-1)?.exitTime ?? '',
      companyName: values(record => record.companyName),
      comments:
        sorted
          .map((record, index) => (record.comments ? `Shift ${index + 1}: ${record.comments}` : ''))
          .filter(Boolean)
          .join(' | ') || undefined,
      status: dayOff ? 'Day Off' : values(record => this.statusLabel(record.status)),
      duration: dayOff ? undefined : `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
    };
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
