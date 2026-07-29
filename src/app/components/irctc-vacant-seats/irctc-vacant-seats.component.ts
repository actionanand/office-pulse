import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { IrctcVacantSeatService } from '../../services/irctc-vacant-seat.service';
import {
  VacantSeatEntry,
  StationSchedule,
  VacantSeatSortKey,
  VacantSeatSortDir,
} from '../../models/irctc-vacant-seat.model';

@Component({
  selector: 'app-irctc-vacant-seats',
  imports: [CommonModule, LucideDynamicIcon],
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

  sortKey = signal<VacantSeatSortKey>('duration');
  sortDir = signal<VacantSeatSortDir>('desc');

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
      if (key === 'duration') {
        cmp = this.compareDuration(a, b, dir);
        if (cmp === 0) return a.sno - b.sno;
        return cmp;
      } else if (key === 'coach') {
        cmp = a.coach.localeCompare(b.coach);
      } else if (key === 'from') {
        cmp = this.compareStation(a.fromStation, a.fromSchedule, b.fromStation, b.fromSchedule);
      } else if (key === 'to') {
        cmp = this.compareStation(a.toStation, a.toSchedule, b.toStation, b.toSchedule);
      }

      if (cmp === 0) return a.sno - b.sno;
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
      this.sortDir.set(key === 'duration' ? 'desc' : 'asc');
    }
  }

  getSortIcon(key: VacantSeatSortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  printPage(): void {
    window.print();
  }

  private compareDuration(a: VacantSeatEntry, b: VacantSeatEntry, dir: VacantSeatSortDir): number {
    if (a.durationMinutes == null && b.durationMinutes == null) return 0;
    if (a.durationMinutes == null) return 1;
    if (b.durationMinutes == null) return -1;

    const cmp = a.durationMinutes - b.durationMinutes;
    return dir === 'asc' ? cmp : -cmp;
  }

  private compareStation(
    aStation: string,
    aSchedule: StationSchedule | undefined,
    bStation: string,
    bSchedule: StationSchedule | undefined,
  ): number {
    if (aSchedule && bSchedule) {
      return aSchedule.effectiveMinutes - bSchedule.effectiveMinutes;
    }

    return aStation.localeCompare(bStation);
  }
}
