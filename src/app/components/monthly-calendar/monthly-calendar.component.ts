import { Component, signal, computed, OnInit, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GvizService, SheetEntry } from '../../services/gviz.service';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  entry?: SheetEntry;
}

@Component({
  selector: 'app-monthly-calendar',
  imports: [CommonModule],
  templateUrl: './monthly-calendar.component.html',
  styleUrls: ['./monthly-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyCalendarComponent implements OnInit {
  sheetId = input.required<string>();
  gid = input<number>(0);

  private gvizService = new GvizService();

  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth() + 1); // 1-12
  entries = signal<SheetEntry[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  selectedDay = signal<CalendarDay | null>(null);

  monthName = computed(() => {
    const date = new Date(this.currentYear(), this.currentMonth() - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    return this.generateCalendarDays();
  });

  entriesMap = computed(() => {
    return this.gvizService.groupByDateLatestOnly(this.entries());
  });

  totalDaysPresent = computed(() => {
    return this.entriesMap().size;
  });

  totalWorkingHours = computed(() => {
    let totalMinutes = 0;
    this.entriesMap().forEach(entry => {
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
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.gvizService
      .fetchEntriesForMonth(this.sheetId(), this.currentYear(), this.currentMonth(), this.gid())
      .subscribe({
        next: entries => {
          this.entries.set(entries);
          this.isLoading.set(false);
        },
        error: err => {
          this.error.set('Failed to load attendance data. Please check your Sheet ID and permissions.');
          this.isLoading.set(false);
          console.error('Error loading entries:', err);
        },
      });
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
    this.loadEntries();
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
    this.loadEntries();
  }

  canGoNext(): boolean {
    const today = new Date();
    const currentYearMonth = this.currentYear() * 100 + this.currentMonth();
    const todayYearMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
    return currentYearMonth < todayYearMonth;
  }

  selectDay(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;
    this.selectedDay.set(day);
  }

  closeDetails(): void {
    this.selectedDay.set(null);
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

    // Add previous month's days
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const prevMonth = month - 1 < 1 ? 12 : month - 1;
      const prevYear = month - 1 < 1 ? year - 1 : year;
      days.push({
        date,
        fullDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Add current month's days
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    for (let date = 1; date <= daysInMonth; date++) {
      const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const entry = entriesMap.get(fullDate);

      days.push({
        date,
        fullDate,
        isCurrentMonth: true,
        isToday: fullDate === todayStr,
        entry,
      });
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    const nextMonth = month + 1 > 12 ? 1 : month + 1;
    const nextYear = month + 1 > 12 ? year + 1 : year;

    for (let date = 1; date <= remainingDays; date++) {
      days.push({
        date,
        fullDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false,
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
}
