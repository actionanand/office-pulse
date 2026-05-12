import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IrctcVacantSeatService } from '../../services/irctc-vacant-seat.service';
import {
  VacantSeatEntry,
  StationSchedule,
  VacantSeatSortKey,
  VacantSeatSortDir,
} from '../../models/irctc-vacant-seat.model';

@Component({
  selector: 'app-irctc-vacant-seats',
  imports: [CommonModule],
  templateUrl: './irctc-vacant-seats.component.html',
  styleUrl: './irctc-vacant-seats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrctcVacantSeatsComponent implements OnInit {
  private service = inject(IrctcVacantSeatService);

  loading = signal(true);
  error = signal<string | null>(null);
  allEntries = signal<VacantSeatEntry[]>([]);
  stations = signal<StationSchedule[]>([]);

  /** 'cards' = default card view; 'table' = sortable table view */
  view = signal<'cards' | 'table'>('cards');

  sortKey = signal<VacantSeatSortKey>('from');
  sortDir = signal<VacantSeatSortDir>('asc');

  /** Station schedule sorted by effective time (route order) */
  sortedStations = computed(() => [...this.stations()].sort((a, b) => a.effectiveMinutes - b.effectiveMinutes));

  /** Total individual seats across all entries */
  totalSeats = computed(() => this.allEntries().reduce((sum, e) => sum + e.seatCount, 0));

  sortedEntries = computed(() => {
    const entries = [...this.allEntries()];
    const key = this.sortKey();
    const dir = this.sortDir();

    entries.sort((a, b) => {
      let cmp = 0;
      if (key === 'coach') {
        cmp = a.coach.localeCompare(b.coach);
      } else if (key === 'from') {
        const aMin = a.fromSchedule?.effectiveMinutes ?? Infinity;
        const bMin = b.fromSchedule?.effectiveMinutes ?? Infinity;
        cmp = aMin - bMin;
      } else if (key === 'to') {
        const aMin = a.toSchedule?.effectiveMinutes ?? Infinity;
        const bMin = b.toSchedule?.effectiveMinutes ?? Infinity;
        cmp = aMin - bMin;
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return entries;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.fetchData().subscribe({
      next: (data: { entries: VacantSeatEntry[]; stations: StationSchedule[] }) => {
        this.allEntries.set(data.entries);
        this.stations.set(data.stations);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load vacant seat data. Please try again.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.service.clearCache();
    this.loadData();
  }

  setSort(key: VacantSeatSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  getSortIcon(key: VacantSeatSortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  printPage(): void {
    window.print();
  }
}
