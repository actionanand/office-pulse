import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoService } from '../../services/memo.service';
import { SnackbarService } from '../../services/snackbar.service';
import { Memo, MemoData } from '../../models/memo.model';

type FilterType = 'all' | 'active' | 'completed';

@Component({
  selector: 'app-memos',
  imports: [CommonModule],
  templateUrl: './memos.component.html',
  styleUrls: ['./memos.component.scss'],
})
export class MemosComponent implements OnInit {
  private memoService = inject(MemoService);
  private snackbarService = inject(SnackbarService);

  // State
  allMemos = signal<Memo[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  activeFilter = signal<FilterType>('all');
  expandedMemoId = signal<number | null>(null);

  // Computed values
  filteredMemos = computed(() => {
    const filter = this.activeFilter();
    const memos = this.allMemos();

    switch (filter) {
      case 'active':
        return memos.filter((m: Memo) => !m.status);
      case 'completed':
        return memos.filter((m: Memo) => m.status);
      default:
        return memos;
    }
  });

  totalCount = computed(() => this.allMemos().length);
  activeCount = computed(() => this.allMemos().filter((m: Memo) => !m.status).length);
  completedCount = computed(() => this.allMemos().filter((m: Memo) => m.status).length);

  ngOnInit(): void {
    this.loadMemos();
  }

  loadMemos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.memoService.fetchMemos().subscribe({
      next: (data: MemoData) => {
        this.allMemos.set(data.memos);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading memos:', err);
        this.error.set('Failed to load memos. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.memoService.clearCache();
    this.loadMemos();
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
  }

  toggleMemoStatus(memo: Memo): void {
    const newStatus = !memo.status;
    this.memoService.updateMemoStatus(memo.sno, newStatus);

    // Update the memo in the local array
    const memos = this.allMemos();
    const updatedMemos = memos.map((m: Memo) => (m.sno === memo.sno ? { ...m, status: newStatus } : m));
    this.allMemos.set(updatedMemos);

    const statusText = newStatus ? 'completed' : 'active';
    this.snackbarService.success(`Memo marked as ${statusText}`);
  }

  toggleExpandMemo(sno: number): void {
    const currentExpanded = this.expandedMemoId();
    this.expandedMemoId.set(currentExpanded === sno ? null : sno);
  }

  isMemoExpanded(sno: number): boolean {
    return this.expandedMemoId() === sno;
  }

  isDescriptionLong(description: string): boolean {
    return description.length > 150;
  }

  getTruncatedDescription(description: string, maxLength: number = 150): string {
    if (!description || description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }

  getStatusClass(status: boolean): string {
    return status ? 'completed' : 'active';
  }

  getStatusLabel(status: boolean): string {
    return status ? 'Completed' : 'Active';
  }

  copyMemo(memo: Memo, event: Event): void {
    event.stopPropagation();

    const copyText = `${memo.title}\n\n${memo.description}\n\nStatus: ${this.getStatusLabel(memo.status)}`;

    navigator.clipboard.writeText(copyText).then(
      () => {
        this.snackbarService.success('Memo copied to clipboard');
      },
      err => {
        console.error('Failed to copy:', err);
        this.snackbarService.error('Failed to copy memo to clipboard');
      },
    );
  }
}
