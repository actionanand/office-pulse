import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeatingChartService } from '../../services/seating-chart.service';
import { SeatingEntry } from '../../models/seating-chart.model';

@Component({
  selector: 'app-seating-chart',
  imports: [CommonModule, FormsModule],
  templateUrl: './seating-chart.component.html',
  styleUrl: './seating-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeatingChartComponent implements OnInit {
  private seatingChartService = inject(SeatingChartService);

  loading = signal(true);
  error = signal<string | null>(null);
  allEntries = signal<SeatingEntry[]>([]);

  /** Currently selected date string (YYYY-MM-DD) bound to the date input */
  selectedDateStr = signal<string>(this.seatingChartService.toDateString(new Date()));

  /** Parsed Date from selectedDateStr */
  private selectedDate = computed(() => new Date(this.selectedDateStr() + 'T00:00:00'));

  /** Entries that apply to the selected date */
  entriesForDate = computed(() => this.seatingChartService.getEntriesForDate(this.allEntries(), this.selectedDate()));

  /** Human-readable label for selected date */
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

  getDateLabel(entry: SeatingEntry): string {
    if (entry.dateDisplay) return entry.dateDisplay;
    if (entry.dateRangeDisplay) return entry.dateRangeDisplay;
    return '—';
  }
}
