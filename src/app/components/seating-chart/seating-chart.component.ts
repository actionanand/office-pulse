import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeatingChartService } from '../../services/seating-chart.service';
import { SeatingEntry } from '../../models/seating-chart.model';

export interface CalendarDay {
  dateStr: string;
  day: number;
  isBooked: boolean;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed
  label: string;
  weeks: (CalendarDay | null)[][];
  bookedCount: number;
  /** Seat summary for the month, e.g. "Seat 232", "232, 233", "5 different seats" */
  seatSummary: string;
}

@Component({
  selector: 'app-seating-chart',
  imports: [CommonModule, FormsModule],
  templateUrl: './seating-chart.component.html',
  styleUrl: './seating-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingChartComponent implements OnInit {
  private seatingChartService = inject(SeatingChartService);

  readonly weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  loading = signal(true);
  error = signal<string | null>(null);
  allEntries = signal<SeatingEntry[]>([]);

  /** 'overview' shows calendar months; 'detail' shows day allocations */
  view = signal<'overview' | 'detail'>('overview');

  /** Currently selected date string (YYYY-MM-DD) */
  selectedDateStr = signal<string>(this.seatingChartService.toDateString(new Date()));

  private selectedDate = computed(() => new Date(this.selectedDateStr() + 'T00:00:00'));

  entriesForDate = computed(() => this.seatingChartService.getEntriesForDate(this.allEntries(), this.selectedDate()));

  selectedDateLabel = computed(() =>
    this.selectedDate().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );

  isToday = computed(() => {
    const today = this.seatingChartService.toDateString(new Date());
    return this.selectedDateStr() === today;
  });

  /** Set of all booked date strings (expands ranges) */
  bookedDatesSet = computed(() => this.seatingChartService.getBookedDatesSet(this.allEntries()));

  /** One mini-calendar per month that has at least one booking */
  calendarMonths = computed((): CalendarMonth[] => {
    const bookedDates = this.bookedDatesSet();
    const allEntries = this.allEntries();
    const today = this.seatingChartService.toDateString(new Date());

    const monthSet = new Set<string>();
    for (const dateStr of bookedDates) {
      monthSet.add(dateStr.slice(0, 7)); // "YYYY-MM"
    }

    return Array.from(monthSet)
      .sort()
      .map(yearMonth => {
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // 0-indexed

        const label = new Date(year, month, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        const firstDay = new Date(year, month, 1);
        const lastDayNum = new Date(year, month + 1, 0).getDate();
        const startDow = firstDay.getDay(); // 0=Sun

        const cells: (CalendarDay | null)[] = [];

        // Leading empty cells
        for (let i = 0; i < startDow; i++) {
          cells.push(null);
        }

        let bookedCount = 0;
        for (let d = 1; d <= lastDayNum; d++) {
          const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
          const isBooked = bookedDates.has(dateStr);
          if (isBooked) bookedCount++;
          cells.push({ dateStr, day: d, isBooked, isToday: dateStr === today });
        }

        // Build weeks
        const weeks: (CalendarDay | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
          const week = cells.slice(i, i + 7);
          while (week.length < 7) week.push(null);
          weeks.push(week);
        }

        // Collect unique seat numbers booked in this month
        const monthSeats = new Set<string>();
        for (let d = 1; d <= lastDayNum; d++) {
          const dStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
          if (bookedDates.has(dStr)) {
            for (const entry of this.seatingChartService.getEntriesForDate(allEntries, new Date(year, month, d))) {
              if (entry.seatNumber?.trim()) {
                monthSeats.add(entry.seatNumber.trim());
              }
            }
          }
        }

        let seatSummary = '';
        if (monthSeats.size === 1) {
          seatSummary = `Seat ${[...monthSeats][0]}`;
        } else if (monthSeats.size >= 2 && monthSeats.size < 5) {
          seatSummary = `Seats ${[...monthSeats].join(', ')}`;
        } else if (monthSeats.size >= 5) {
          seatSummary = `${monthSeats.size} different seats booked`;
        }

        return { year, month, label, weeks, bookedCount, seatSummary };
      });
  });

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.loading.set(true);
    this.error.set(null);

    this.seatingChartService.fetchEntries().subscribe({
      next: entries => {
        this.allEntries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load seating data. Please try again.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.seatingChartService.clearCache();
    this.loadEntries();
  }

  goToToday(): void {
    this.selectedDateStr.set(this.seatingChartService.toDateString(new Date()));
  }

  selectDay(dateStr: string): void {
    this.selectedDateStr.set(dateStr);
    this.view.set('detail');
  }

  backToOverview(): void {
    this.view.set('overview');
  }

  getDateLabel(entry: SeatingEntry): string {
    if (entry.dateDisplay) return entry.dateDisplay;
    if (entry.dateRangeDisplay) return entry.dateRangeDisplay;
    return '—';
  }
}
