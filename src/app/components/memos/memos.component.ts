import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemoService } from '../../services/memo.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { MarkdownParser } from '../../utils/markdown-parser';
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
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, MarkdownPipe],
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
  richTextConverterPopup = signal<boolean>(false);

  // Formatting toolbar state
  showTextColorPicker = signal<boolean>(false);
  showBgColorPicker = signal<boolean>(false);
  selectedTextColor = signal<string>('#ff0000');
  selectedBgColor = signal<string>('#ffeb3b');

  // Rich text converter state
  converterText = signal<string>('');
  converterTextColorPicker = signal<boolean>(false);
  converterBgColorPicker = signal<boolean>(false);

  // Form data - using a simple object that we'll update
  formTitle = signal<string>('');
  formDescription = signal<string>('');
  formStatus = signal<boolean>(false);
  formColor = signal<string>('#ffffff');

  // Color palette
  memoColors = MEMO_COLORS;

  // Textarea reference for formatting
  @ViewChild('descriptionTextarea') descriptionTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('converterTextarea') converterTextarea?: ElementRef<HTMLTextAreaElement>;

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

  openRichTextConverter(): void {
    this.converterText.set('');
    this.converterTextColorPicker.set(false);
    this.converterBgColorPicker.set(false);
    this.richTextConverterPopup.set(true);
  }

  closeRichTextConverter(): void {
    this.richTextConverterPopup.set(false);
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
      this.closeRichTextConverter();
    }
  }

  // Formatting methods
  applyFormatting(type: string): void {
    const textarea = this.descriptionTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.formDescription();

    let result: { text: string; cursorPos: number };

    switch (type) {
      case 'bold':
        result = MarkdownParser.insertFormatting(currentText, start, end, '**');
        break;
      case 'italic':
        result = MarkdownParser.insertFormatting(currentText, start, end, '*');
        break;
      case 'strikethrough':
        result = MarkdownParser.insertFormatting(currentText, start, end, '~~');
        break;
      case 'code':
        result = MarkdownParser.insertFormatting(currentText, start, end, '`');
        break;
      case 'unordered':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- ', '\n');
        break;
      case 'ordered':
        result = MarkdownParser.insertFormatting(currentText, start, end, '1. ', '\n');
        break;
      case 'checkbox':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- [ ] ', '\n');
        break;
      case 'checked':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- [x] ', '\n');
        break;
      case 'text-color':
        // Show color picker for text color
        this.showTextColorPicker.set(!this.showTextColorPicker());
        this.showBgColorPicker.set(false);
        return;
      case 'bg-color':
        // Show color picker for background color
        this.showBgColorPicker.set(!this.showBgColorPicker());
        this.showTextColorPicker.set(false);
        return;
      default:
        return;
    }

    this.formDescription.set(result.text);

    // Set cursor position after Angular updates the view
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  applyTextColor(color: string): void {
    const textarea = this.descriptionTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.formDescription();

    const result = MarkdownParser.insertFormatting(currentText, start, end, `[color:${color}]`, '[/color]');

    this.formDescription.set(result.text);
    this.showTextColorPicker.set(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  applyBgColor(color: string): void {
    const textarea = this.descriptionTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.formDescription();

    const result = MarkdownParser.insertFormatting(currentText, start, end, `[bg:${color}]`, '[/bg]');

    this.formDescription.set(result.text);
    this.showBgColorPicker.set(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  // Default color palettes for formatting
  defaultTextColors = [
    '#ff0000', // Red
    '#0000ff', // Blue
    '#008000', // Green
    '#ff6600', // Orange
    '#9900ff', // Purple
    '#ff00ff', // Magenta
  ];

  defaultBgColors = [
    '#ffeb3b', // Yellow
    '#ffcccc', // Light red
    '#ccffcc', // Light green
    '#ccccff', // Light blue
    '#ffccff', // Light purple
    '#ffe6cc', // Light orange
  ];

  // Rich text converter formatting methods
  applyConverterFormatting(type: string): void {
    const textarea = this.converterTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.converterText();

    let result: { text: string; cursorPos: number };

    switch (type) {
      case 'bold':
        result = MarkdownParser.insertFormatting(currentText, start, end, '**');
        break;
      case 'italic':
        result = MarkdownParser.insertFormatting(currentText, start, end, '*');
        break;
      case 'strikethrough':
        result = MarkdownParser.insertFormatting(currentText, start, end, '~~');
        break;
      case 'code':
        result = MarkdownParser.insertFormatting(currentText, start, end, '`');
        break;
      case 'unordered':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- ', '\n');
        break;
      case 'ordered':
        result = MarkdownParser.insertFormatting(currentText, start, end, '1. ', '\n');
        break;
      case 'checkbox':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- [ ] ', '\n');
        break;
      case 'checked':
        result = MarkdownParser.insertFormatting(currentText, start, end, '- [x] ', '\n');
        break;
      case 'text-color':
        this.converterTextColorPicker.set(!this.converterTextColorPicker());
        this.converterBgColorPicker.set(false);
        return;
      case 'bg-color':
        this.converterBgColorPicker.set(!this.converterBgColorPicker());
        this.converterTextColorPicker.set(false);
        return;
      default:
        return;
    }

    this.converterText.set(result.text);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  applyConverterTextColor(color: string): void {
    const textarea = this.converterTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.converterText();

    const result = MarkdownParser.insertFormatting(currentText, start, end, `[color:${color}]`, '[/color]');

    this.converterText.set(result.text);
    this.converterTextColorPicker.set(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  applyConverterBgColor(color: string): void {
    const textarea = this.converterTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = this.converterText();

    const result = MarkdownParser.insertFormatting(currentText, start, end, `[bg:${color}]`, '[/bg]');

    this.converterText.set(result.text);
    this.converterBgColorPicker.set(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    }, 0);
  }

  // Copy functions for rich text converter
  async copyRichText(): Promise<void> {
    const text = this.converterText();
    const html = MarkdownParser.parse(text);
    const plainText = MarkdownParser.toPlainText(text);

    try {
      // Try modern Clipboard API first
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const plainTextBlob = new Blob([plainText], { type: 'text/plain' });
      const data = [
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': plainTextBlob,
        }),
      ];

      await navigator.clipboard.write(data);
      this.snackbarService.success('Rich text copied to clipboard');
    } catch (err) {
      // Fallback: create a temporary element and copy using execCommand
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        document.execCommand('copy');
        selection?.removeAllRanges();
        document.body.removeChild(tempDiv);

        this.snackbarService.success('Rich text copied to clipboard');
      } catch (fallbackErr) {
        console.error('Failed to copy rich text:', err, fallbackErr);
        this.snackbarService.error('Failed to copy rich text');
      }
    }
  }

  copyPlainText(): void {
    const text = this.converterText();
    const plainText = MarkdownParser.toPlainText(text);

    navigator.clipboard.writeText(plainText).then(
      () => {
        this.snackbarService.success('Plain text copied to clipboard');
      },
      (err: unknown) => {
        console.error('Failed to copy plain text:', err);
        this.snackbarService.error('Failed to copy plain text');
      },
    );
  }

  copyForGoogleSheets(): void {
    const text = this.converterText();

    navigator.clipboard.writeText(text).then(
      () => {
        this.snackbarService.success('Markdown syntax copied for Google Sheets');
      },
      (err: unknown) => {
        console.error('Failed to copy:', err);
        this.snackbarService.error('Failed to copy to clipboard');
      },
    );
  }
}
