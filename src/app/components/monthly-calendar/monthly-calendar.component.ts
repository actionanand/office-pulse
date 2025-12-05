import { Component, signal, computed, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceStateService } from '../../services/attendance-state.service';
import { SheetEntry } from '../../services/gviz.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { PdfExportOptions } from '../../models/pdf-export.model';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  entry?: SheetEntry;
}

@Component({
  selector: 'app-monthly-calendar',
  imports: [CommonModule, DownloadDialogComponent],
  templateUrl: './monthly-calendar.component.html',
  styleUrls: ['./monthly-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyCalendarComponent implements OnInit {
  private attendanceState = inject(AttendanceStateService);
  private pdfExportService = inject(PdfExportService);

  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth() + 1); // 1-12
  selectedDay = signal<CalendarDay | null>(null);
  showDownloadDialog = signal<boolean>(false);

  // Get data from shared attendance state service
  entries = computed(() => this.attendanceState.allEntries());
  isLoading = computed(() => this.attendanceState.isLoading());
  error = signal<string>('');

  monthName = computed(() => {
    const date = new Date(this.currentYear(), this.currentMonth() - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    return this.generateCalendarDays();
  });

  entriesMap = computed(() => {
    const allEntries = this.entries();
    const filteredEntries = this.filterEntriesByMonth(allEntries, this.currentYear(), this.currentMonth());
    return this.groupByDateLatestOnly(filteredEntries);
  });

  totalDaysPresent = computed(() => {
    return this.entriesMap().size;
  });

  totalWorkingHours = computed(() => {
    let totalMinutes = 0;
    this.entriesMap().forEach((entry: SheetEntry) => {
      if (entry.duration) {
        const match = entry.duration.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  });

  ngOnInit(): void {
    // Data is already loaded by the app component
    // Just refresh if needed
    this.attendanceState.refreshIfNeeded(5);
  }

  previousMonth(): void {
    let year = this.currentYear();
    let month = this.currentMonth() - 1;

    if (month < 1) {
      month = 12;
      year--;
    }

    this.currentYear.set(year);
    this.currentMonth.set(month);
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    const today = new Date();
    const currentYearMonth = this.currentYear() * 100 + this.currentMonth();
    const todayYearMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

    // Don't allow navigating to future months
    if (currentYearMonth >= todayYearMonth) {
      return;
    }

    let year = this.currentYear();
    let month = this.currentMonth() + 1;

    if (month > 12) {
      month = 1;
      year++;
    }

    this.currentYear.set(year);
    this.currentMonth.set(month);
    this.selectedDay.set(null);
  }

  canGoNext(): boolean {
    const today = new Date();
    const currentYearMonth = this.currentYear() * 100 + this.currentMonth();
    const todayYearMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
    return currentYearMonth < todayYearMonth;
  }

  selectDay(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isFuture) return;
    this.selectedDay.set(day);
  }

  closeDetails(): void {
    this.selectedDay.set(null);
  }

  // Download PDF functionality
  openDownloadDialog(): void {
    this.showDownloadDialog.set(true);
  }

  closeDownloadDialog(): void {
    this.showDownloadDialog.set(false);
  }

  downloadPdf(options: PdfExportOptions): void {
    const entries = this.entries();
    this.pdfExportService.generatePdf(entries, options);
  }

  retryLoadData(): void {
    this.error.set('');
    this.attendanceState.fetchAttendanceData();
  }

  private filterEntriesByMonth(entries: SheetEntry[], year: number, month: number): SheetEntry[] {
    const targetYearMonth = `${year}-${String(month).padStart(2, '0')}`;
    return entries.filter(entry => entry.date.startsWith(targetYearMonth));
  }

  private groupByDateLatestOnly(entries: SheetEntry[]): Map<string, SheetEntry> {
    const grouped = new Map<string, SheetEntry>();

    entries.forEach(entry => {
      if (!entry.date) return;

      const existing = grouped.get(entry.date);

      if (!existing) {
        grouped.set(entry.date, entry);
      } else {
        // Compare timestamps to keep the latest
        const existingTime = new Date(existing.timestamp || existing.entryTime).getTime();
        const currentTime = new Date(entry.timestamp || entry.entryTime).getTime();

        if (currentTime > existingTime) {
          grouped.set(entry.date, entry);
        }
      }
    });

    return grouped;
  }

  private generateCalendarDays(): CalendarDay[] {
    const year = this.currentYear();
    const month = this.currentMonth();
    const entriesMap = this.entriesMap();

    // First day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Get day of week for first day (0 = Sunday)
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: CalendarDay[] = [];

    // Get today's date for comparison
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Add previous month's days
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const prevMonth = month - 1 < 1 ? 12 : month - 1;
      const prevYear = month - 1 < 1 ? year - 1 : year;
      const fullDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      days.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isFuture: false, // Previous month dates are not future
      });
    }

    // Add current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const entry = entriesMap.get(fullDate);
      
      // Check if this date is in the future (only for current month)
      const dateObj = new Date(year, month - 1, date);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isFutureDate = dateObj > todayDate;

      days.push({
        date,
        fullDate,
        isCurrentMonth: true,
        isToday: fullDate === todayStr,
        isFuture: isFutureDate,
        entry,
      });
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    const nextMonth = month + 1 > 12 ? 1 : month + 1;
    const nextYear = month + 1 > 12 ? year + 1 : year;

    for (let date = 1; date <= remainingDays; date++) {
      const fullDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      days.push({
        date,
        fullDate,
        isCurrentMonth: false,
        isToday: false,
        isFuture: false, // Next month dates are not marked as future (they're other-month)
      });
    }

    return days;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  }

  getExitDateDisplay(entry: SheetEntry): string {
    if (!entry.entryTime || !entry.exitTime) return '';
    
    try {
      const entryDate = new Date(entry.entryTime);
      const exitDate = new Date(entry.exitTime);
      
      // Check if dates are different
      const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
      const exitDateStr = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}-${String(exitDate.getDate()).padStart(2, '0')}`;
      
      if (entryDateStr !== exitDateStr) {
        // Return formatted exit date for display
        return exitDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      return '';
    } catch {
      return '';
    }
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Day Off': 'status-day-off',
      'WFH': 'status-wfh',
      'Office': 'status-office',
      'First Half Off': 'status-half-off',
      'Second Half Off': 'status-half-off'
    };
    return statusMap[status] || '';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'WFH': 'WFH',
      'Office': 'OFF',
      'First Half Off': '1/2',
      'Second Half Off': '1/2',
      'Day Off': 'OFF'
    };
    return labelMap[status] || '';
  }
}
