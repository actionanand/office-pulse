import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { CopyService } from '../../services/copy.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { AppLocalDataDatabaseService } from '../../services/app-local-data-database.service';
import { CopyItem, CopyFormData, StopwatchState, MemoItem } from '../../models/utilities.model';
import { GoogleFormDialogComponent } from '../google-form-dialog/google-form-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-utilities',
  imports: [CommonModule, FormsModule, GoogleFormDialogComponent, ConfirmationDialogComponent, LucideDynamicIcon],
  templateUrl: './utilities.component.html',
  styleUrl: './utilities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilitiesComponent implements OnInit, OnDestroy {
  private copyService = inject(CopyService);
  private snackbarService = inject(SnackbarService);
  private confirmationService = inject(ConfirmationDialogService);
  private readonly appLocalData = inject(AppLocalDataDatabaseService);
  private stopwatchInterval: ReturnType<typeof setInterval> | null = null;

  // Storage keys
  private readonly STOPWATCH_KEY = 'office_pulse_stopwatch';
  private readonly MEMO_KEY = 'office_pulse_memo';

  // ============ COPY/TRANSFER Section ============
  readonly copyFormData = signal<CopyFormData>({ link: '', comment: '' });
  readonly copiedItems = signal<CopyItem[]>([]);
  readonly showCopiedItems = signal(false);
  readonly isCopyLoading = signal(false);
  readonly isCopySubmitting = signal(false);
  readonly showGoogleFormDialog = signal(false);
  readonly googleFormUrl = signal('');

  // ============ STOPWATCH Section ============
  readonly stopwatch = signal<StopwatchState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    laps: [],
  });
  readonly displayTime = signal('00:00:00.000');

  // ============ MEMO/CHECKLIST Section ============
  readonly memoItems = signal<MemoItem[]>([]);
  readonly newMemoText = signal('');

  ngOnInit(): void {
    this.loadStopwatchState();
    this.loadMemoItems();

    // Resume stopwatch if it was running
    const state = this.stopwatch();
    if (state.isRunning && state.startTime) {
      this.startStopwatchInterval();
    }
  }

  ngOnDestroy(): void {
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
    }
  }

  // ============ COPY/TRANSFER Methods ============

  updateCopyField(field: keyof CopyFormData, value: string): void {
    this.copyFormData.update(data => ({ ...data, [field]: value }));
  }

  async submitCopy(): Promise<void> {
    if (this.isCopySubmitting()) return;

    const data = this.copyFormData();
    if (!data.link?.trim() && !data.comment?.trim()) {
      this.snackbarService.error('Please enter at least a link or comment!');
      return;
    }

    this.isCopySubmitting.set(true);
    this.snackbarService.info('Sending copy item...', 5000);

    try {
      await this.copyService.submitCopy(data);
      this.snackbarService.success('Copy item sent successfully.');
      this.copyFormData.set({ link: '', comment: '' });

      if (this.showCopiedItems()) {
        setTimeout(() => this.loadCopiedItems(), 2000);
      }
    } catch (error) {
      console.error('Copy submission error:', error);
      this.snackbarService.error('Failed to send copy item. Please try again.');
    } finally {
      this.isCopySubmitting.set(false);
    }
  }

  openEmptyCopyForm(): void {
    const formUrl = this.copyService.generateFormUrl(undefined, true);
    this.googleFormUrl.set(formUrl);
    this.showGoogleFormDialog.set(true);
  }

  onGoogleFormClose(): void {
    this.showGoogleFormDialog.set(false);
    this.googleFormUrl.set('');
  }

  onGoogleFormSubmitted(): void {
    this.showGoogleFormDialog.set(false);
    this.googleFormUrl.set('');
    this.copyFormData.set({ link: '', comment: '' });

    // Refresh copied items after delay
    setTimeout(() => {
      if (this.showCopiedItems()) {
        this.loadCopiedItems();
      }
    }, 2000);
  }

  toggleCopiedItems(): void {
    this.showCopiedItems.update(show => !show);
    if (this.showCopiedItems() && this.copiedItems().length === 0) {
      this.loadCopiedItems();
    }
  }

  loadCopiedItems(): void {
    this.isCopyLoading.set(true);
    this.copyService.clearCache();
    this.copyService.fetchCopiedItems().subscribe({
      next: items => {
        this.copiedItems.set(items);
        this.isCopyLoading.set(false);
      },
      error: () => {
        this.isCopyLoading.set(false);
      },
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Could show a toast notification here
        this.snackbarService.success('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  }

  isValidUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return url.startsWith('http://') || url.startsWith('https://');
    }
  }

  // ============ STOPWATCH Methods ============

  startStopwatch(): void {
    const state = this.stopwatch();
    const now = Date.now();

    this.stopwatch.set({
      ...state,
      isRunning: true,
      startTime: now - state.elapsedTime,
    });

    this.startStopwatchInterval();
    this.saveStopwatchState();
  }

  pauseStopwatch(): void {
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }

    const state = this.stopwatch();
    this.stopwatch.set({
      ...state,
      isRunning: false,
      elapsedTime: state.startTime ? Date.now() - state.startTime : state.elapsedTime,
    });

    this.saveStopwatchState();
  }

  resetStopwatch(): void {
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
      this.stopwatchInterval = null;
    }

    this.stopwatch.set({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      laps: [],
    });

    this.displayTime.set('00:00:00.000');
    this.saveStopwatchState();
  }

  addLap(): void {
    const state = this.stopwatch();
    if (!state.isRunning) return;

    const currentTime = state.startTime ? Date.now() - state.startTime : 0;
    this.stopwatch.set({
      ...state,
      laps: [...state.laps, currentTime],
    });

    this.saveStopwatchState();
  }

  clearLaps(): void {
    this.stopwatch.update(state => ({ ...state, laps: [] }));
    this.saveStopwatchState();
  }

  private startStopwatchInterval(): void {
    if (this.stopwatchInterval) {
      clearInterval(this.stopwatchInterval);
    }

    this.stopwatchInterval = setInterval(() => {
      const state = this.stopwatch();
      if (state.isRunning && state.startTime) {
        const elapsed = Date.now() - state.startTime;
        this.displayTime.set(this.formatTime(elapsed));
      }
    }, 10); // Update every 10ms for smooth display
  }

  formatTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  private saveStopwatchState(): void {
    const state = this.stopwatch();
    this.appLocalData.setItem(this.STOPWATCH_KEY, JSON.stringify(state));
  }

  private loadStopwatchState(): void {
    const saved = this.appLocalData.getItem(this.STOPWATCH_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as StopwatchState;
        this.stopwatch.set(state);

        // Update display time
        if (state.elapsedTime > 0) {
          if (state.isRunning && state.startTime) {
            const elapsed = Date.now() - state.startTime;
            this.displayTime.set(this.formatTime(elapsed));
          } else {
            this.displayTime.set(this.formatTime(state.elapsedTime));
          }
        }
      } catch (e) {
        console.error('Error loading stopwatch state:', e);
      }
    }
  }

  // ============ MEMO/CHECKLIST Methods ============

  addMemoItem(): void {
    const text = this.newMemoText().trim();
    if (!text) return;

    const newItem: MemoItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.memoItems.update(items => [newItem, ...items]);
    this.newMemoText.set('');
    this.saveMemoItems();
  }

  toggleMemoItem(id: string): void {
    this.memoItems.update(items =>
      items.map(item => (item.id === id ? { ...item, completed: !item.completed } : item)),
    );
    this.saveMemoItems();
  }

  deleteMemoItem(id: string): void {
    this.memoItems.update(items => items.filter(item => item.id !== id));
    this.saveMemoItems();
  }

  clearCompletedMemos(): void {
    this.memoItems.update(items => items.filter(item => !item.completed));
    this.saveMemoItems();
  }

  async clearAllMemos(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Clear All Items',
      message: 'Are you sure you want to clear all items?',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.memoItems.set([]);
      this.saveMemoItems();
    }
  }

  getCompletedCount(): number {
    return this.memoItems().filter(item => item.completed).length;
  }

  getPendingCount(): number {
    return this.memoItems().filter(item => !item.completed).length;
  }

  private saveMemoItems(): void {
    this.appLocalData.setItem(this.MEMO_KEY, JSON.stringify(this.memoItems()));
  }

  private loadMemoItems(): void {
    const saved = this.appLocalData.getItem(this.MEMO_KEY);
    if (saved) {
      try {
        const items = JSON.parse(saved) as MemoItem[];
        this.memoItems.set(items);
      } catch (e) {
        console.error('Error loading memo items:', e);
      }
    }
  }
}
