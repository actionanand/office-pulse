import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemoService } from '../../services/memo.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Memo, MemoData } from '../../models/memo.model';

type FilterType = 'all' | 'active' | 'completed';

// Google Keep color palette
export const MEMO_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#f28b82' },
  { name: 'Orange', value: '#fbbc04' },
  { name: 'Yellow', value: '#fff475' },
  { name: 'Green', value: '#ccff90' },
  { name: 'Teal', value: '#a7ffeb' },
  { name: 'Blue', value: '#cbf0f8' },
  { name: 'Dark Blue', value: '#aecbfa' },
  { name: 'Purple', value: '#d7aefb' },
  { name: 'Pink', value: '#fdcfe8' },
  { name: 'Brown', value: '#e6c9a8' },
  { name: 'Gray', value: '#e8eaed' },
];

@Component({
  selector: 'app-memos',
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent],
  templateUrl: './memos.component.html',
  styleUrls: ['./memos.component.scss'],
})
export class MemosComponent implements OnInit {
  private memoService = inject(MemoService);
  private snackbarService = inject(SnackbarService);
  private confirmationService = inject(ConfirmationDialogService);

  // State
  allMemos = signal<Memo[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  activeFilter = signal<FilterType>('all');

  // Popup states
  viewMemoPopup = signal<Memo | null>(null);
  createMemoPopup = signal<boolean>(false);
  editMemoPopup = signal<Memo | null>(null);
  colorPickerMemo = signal<Memo | null>(null);

  // Form data - using a simple object that we'll update
  formTitle = signal<string>('');
  formDescription = signal<string>('');
  formStatus = signal<boolean>(false);
  formColor = signal<string>('#ffffff');

  // Color palette
  memoColors = MEMO_COLORS;

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
        // Combine API memos and local memos
        const localMemos = this.memoService.getAllMemos();
        const combinedMemos = [...data.memos, ...localMemos];
        this.allMemos.set(combinedMemos);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading memos:', err);
        // Even on error, load local memos
        const localMemos = this.memoService.getAllMemos();
        this.allMemos.set(localMemos);
        this.error.set('Failed to load remote memos. Showing local memos only.');
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

    if (memo.isLocal) {
      // Update local memo
      this.memoService.updateLocalMemo(memo.sno, memo.title, memo.description, newStatus);
    } else {
      // Update API memo status override
      this.memoService.updateMemoStatus(memo.sno, newStatus);
    }

    // Update the memo in the local array
    const memos = this.allMemos();
    const updatedMemos = memos.map((m: Memo) => (m.sno === memo.sno ? { ...m, status: newStatus } : m));
    this.allMemos.set(updatedMemos);

    const statusText = newStatus ? 'completed' : 'active';
    this.snackbarService.success(`Memo marked as ${statusText}`);
  }

  // Popup management
  openViewPopup(memo: Memo): void {
    this.viewMemoPopup.set(memo);
  }

  closeViewPopup(): void {
    this.viewMemoPopup.set(null);
  }

  openCreatePopup(): void {
    this.formTitle.set('');
    this.formDescription.set('');
    this.formStatus.set(false);
    this.formColor.set('#ffffff');
    this.createMemoPopup.set(true);
  }

  closeCreatePopup(): void {
    this.createMemoPopup.set(false);
  }

  openEditPopup(memo: Memo): void {
    this.formTitle.set(memo.title);
    this.formDescription.set(memo.description);
    this.formStatus.set(memo.status);
    this.formColor.set(memo.color || '#ffffff');
    this.editMemoPopup.set(memo);
  }

  closeEditPopup(): void {
    this.editMemoPopup.set(null);
  }

  // CRUD operations
  createMemo(): void {
    const description = this.formDescription().trim();
    if (!description) {
      this.snackbarService.error('Description is required');
      return;
    }

    this.memoService.createLocalMemo(this.formTitle(), description, this.formColor());
    this.snackbarService.success('Memo created successfully');
    this.closeCreatePopup();
    this.loadMemos();
  }

  saveMemo(): void {
    const memo = this.editMemoPopup();
    const description = this.formDescription().trim();

    if (!memo || !description) {
      this.snackbarService.error('Description is required');
      return;
    }

    this.memoService.updateLocalMemo(memo.sno, this.formTitle(), description, this.formStatus(), this.formColor());
    this.snackbarService.success('Memo updated successfully');
    this.closeEditPopup();
    this.loadMemos();
  }

  async deleteMemo(memo: Memo, event: Event): Promise<void> {
    event.stopPropagation();

    if (!memo.isLocal) {
      this.snackbarService.error('Cannot delete remote memos');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Memo',
      message: 'Are you sure you want to delete this memo? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.memoService.deleteLocalMemo(memo.sno);
      this.snackbarService.success('Memo deleted successfully');
      this.loadMemos();
    }
  }

  // Color management
  openColorPicker(memo: Memo, event: Event): void {
    event.stopPropagation();
    const current = this.colorPickerMemo();
    // Toggle: close if clicking the same memo's color picker
    if (current && current.sno === memo.sno) {
      this.colorPickerMemo.set(null);
    } else {
      this.colorPickerMemo.set(memo);
    }
  }

  closeColorPicker(): void {
    this.colorPickerMemo.set(null);
  }

  changeColor(memo: Memo, color: string, event: Event): void {
    event.stopPropagation();

    if (memo.isLocal) {
      // Update local memo
      this.memoService.updateLocalMemo(memo.sno, memo.title, memo.description, memo.status, color);
    } else {
      // Update API memo color override
      this.memoService.updateMemoColor(memo.sno, color);
    }

    // Update the memo in the local array
    const memos = this.allMemos();
    const updatedMemos = memos.map((m: Memo) => (m.sno === memo.sno ? { ...m, color } : m));
    this.allMemos.set(updatedMemos);

    this.closeColorPicker();
    this.snackbarService.success('Color updated');
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

    // Copy only description
    navigator.clipboard.writeText(memo.description).then(
      () => {
        this.snackbarService.success('Description copied to clipboard');
      },
      (err: unknown) => {
        console.error('Failed to copy:', err);
        this.snackbarService.error('Failed to copy to clipboard');
      },
    );
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close if clicking directly on the overlay, not its children
    if (event.target === event.currentTarget) {
      this.closeViewPopup();
      this.closeCreatePopup();
      this.closeEditPopup();
    }
  }
}
