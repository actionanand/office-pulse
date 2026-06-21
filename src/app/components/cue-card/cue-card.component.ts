import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CueCard, CueCardMode, CueCardTable } from '../../models/cue-card.model';
import { SafeCueCardHtmlPipe } from '../../pipes/safe-cue-card-html.pipe';
import { CueCardService } from '../../services/cue-card.service';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';

type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent';
type RichTextColorCommand = 'foreColor' | 'hiliteColor';
type ConfirmationDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
};

@Component({
  selector: 'app-cue-card',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SafeCueCardHtmlPipe, ConfirmationPopupComponent],
  templateUrl: './cue-card.component.html',
  styleUrl: './cue-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CueCardComponent {
  private readonly cueCardService = inject(CueCardService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly mode = signal<CueCardMode>('view');
  protected readonly isLoading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly sheetCards = signal<CueCard[]>([]);
  protected readonly offlineCards = signal<CueCard[]>(this.cueCardService.getOfflineCueCards());
  protected readonly selectedCard = signal<CueCard | null>(null);
  protected readonly editingCard = signal<CueCard | null>(null);
  protected readonly confirmationDialog = signal<ConfirmationDialog | null>(null);
  protected readonly table = signal<CueCardTable | null>(null);
  protected readonly tablePasteText = signal('');
  protected readonly newTableColumnCount = signal(3);
  protected readonly textColorOptions = this.cueCardService.textColorOptions;
  protected readonly backgroundColorOptions = this.cueCardService.backgroundColorOptions;
  protected readonly editor = viewChild<ElementRef<HTMLDivElement>>('contentEditor');
  protected readonly maxTableRows = 13;
  protected readonly maxTableColumns = 7;

  protected readonly cards = computed(() => {
    const offlineCards = this.offlineCards();
    const offlineIds = new Set(offlineCards.map(card => card.id));
    return [...offlineCards, ...this.sheetCards().filter(card => !offlineIds.has(card.id))];
  });
  protected readonly hasOfflineCards = computed(() => this.offlineCards().length > 0);
  protected readonly isEditing = computed(() => this.editingCard() !== null);
  protected readonly tableColumnCount = computed(() => this.table()?.rows[0]?.length ?? 0);
  protected readonly canAddTableColumn = computed(
    () => this.tableColumnCount() > 0 && this.tableColumnCount() < this.maxTableColumns,
  );
  protected readonly canAddTableRow = computed(
    () => Boolean(this.table()) && (this.table()?.rows.length ?? 0) < this.maxTableRows,
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    contentHtml: ['', [Validators.required]],
    tableName: [''],
    tableHeaderBold: [false],
  });

  constructor() {
    this.refreshCueCards();
  }

  protected setMode(mode: CueCardMode): void {
    if (mode === 'generate') {
      this.resetForm();
    }

    this.mode.set(mode);
    this.statusMessage.set('');
    this.errorMessage.set('');

    if (mode === 'view') {
      this.refreshCueCards();
    }
  }

  protected formatContent(command: RichTextCommand): void {
    this.editor()?.nativeElement.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false);
    this.updateContentValue();
  }

  protected colorContent(command: RichTextColorCommand, color: string): void {
    this.editor()?.nativeElement.focus();
    document.execCommand('styleWithCSS', false, 'true');

    const commandWorked = document.execCommand(command, false, color);
    if (command === 'hiliteColor' && !commandWorked) {
      document.execCommand('backColor', false, color);
    }

    this.updateContentValue();
  }

  protected keepEditorSelection(event: MouseEvent): void {
    event.preventDefault();
  }

  protected updateContentValue(): void {
    const editor = this.editor();
    if (!editor) return;

    this.form.controls.contentHtml.setValue(editor.nativeElement.innerHTML);
    this.statusMessage.set('');
  }

  protected syncContent(): void {
    const editor = this.editor();
    if (!editor) return;

    const sanitizedHtml = this.cueCardService.sanitizeRichText(editor.nativeElement.innerHTML);
    this.form.controls.contentHtml.setValue(sanitizedHtml);

    if (editor.nativeElement.innerHTML !== sanitizedHtml) {
      editor.nativeElement.innerHTML = sanitizedHtml;
    }
  }

  protected async copyForSheet(includeHeader: boolean): Promise<void> {
    const card = this.buildCurrentCard();
    if (!card) return;

    try {
      const clipboardValue = includeHeader
        ? this.cueCardService.toGoogleSheetClipboard(card)
        : this.cueCardService.toTsvRow(card);
      await navigator.clipboard.writeText(clipboardValue);
      this.statusMessage.set(
        includeHeader
          ? 'Copied cue card header and row for Google Sheet.'
          : card.rowNumber
            ? `Copied replacement row for Google Sheet row ${card.rowNumber}.`
            : 'Copied cue card row for Google Sheet.',
      );
    } catch {
      this.errorMessage.set('Clipboard copy failed. Select the generated content and copy manually.');
    }
  }

  protected saveOffline(): void {
    const card = this.buildCurrentCard();
    if (!card) return;

    this.openConfirmation({
      title: this.hasOfflineCards() ? 'Replace offline cue card?' : 'Save offline cue card?',
      message: this.hasOfflineCards()
        ? 'Only one cue card can be saved offline. Saving this cue card will replace the existing offline content.'
        : 'Only one cue card can be saved offline. This cue card will become the offline content.',
      confirmLabel: this.hasOfflineCards() ? 'Replace and save' : 'Save offline',
      action: () => this.saveOfflineCard(card),
    });
  }

  protected clearOfflineCueCards(): void {
    this.openConfirmation({
      title: 'Clear offline cue card?',
      message: 'This removes the saved offline cue card from this browser.',
      confirmLabel: 'Clear offline',
      action: () => {
        this.cueCardService.clearOfflineCueCards();
        this.refreshOfflineCards();
        this.closeCard();
        this.statusMessage.set('Offline cue card cleared.');
      },
    });
  }

  protected deleteOfflineCueCard(card: CueCard): void {
    if (!card.isOffline) return;

    this.openConfirmation({
      title: 'Delete offline cue card?',
      message: 'This removes the offline cue card from this browser.',
      confirmLabel: 'Delete offline',
      action: () => {
        this.cueCardService.deleteOfflineCueCard(card.id);
        this.refreshOfflineCards();
        this.closeCard();
        this.statusMessage.set('Offline cue card deleted.');
      },
    });
  }

  protected cancelConfirmation(): void {
    this.confirmationDialog.set(null);
  }

  protected confirmDialogAction(): void {
    const dialog = this.confirmationDialog();
    this.confirmationDialog.set(null);
    dialog?.action();
  }

  protected requestClearEditor(): void {
    this.openConfirmation({
      title: 'Clear editor?',
      message: 'This will clear the title, rich text content, and table from the editor.',
      confirmLabel: 'Clear editor',
      action: () => this.resetForm(),
    });
  }

  protected requestClearTable(): void {
    this.openConfirmation({
      title: 'Remove table?',
      message: 'This will remove the current table from the cue card editor.',
      confirmLabel: 'Remove table',
      action: () => this.clearTableImmediately(),
    });
  }

  private saveOfflineCard(card: CueCard): void {
    this.cueCardService.saveOfflineCueCard(card);
    this.refreshOfflineCards();
    this.statusMessage.set('Saved cue card offline.');
  }

  protected refreshCueCards(): void {
    this.refreshOfflineCards();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cueCardService.fetchCueCards().subscribe({
      next: cards => {
        this.sheetCards.set(cards);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load cue cards from Google Sheet.');
        this.isLoading.set(false);
      },
    });
  }

  protected openCard(card: CueCard): void {
    this.selectedCard.set(card);
  }

  protected closeCard(): void {
    this.selectedCard.set(null);
  }

  protected editCard(card: CueCard): void {
    this.closeCard();
    this.mode.set('generate');
    this.editingCard.set(card);
    this.form.patchValue({
      title: card.title,
      contentHtml: card.contentHtml,
      tableName: card.tableName,
      tableHeaderBold: card.tableHeaderBold,
    });
    this.table.set(this.cueCardService.cloneTable(card.table));
    this.statusMessage.set(
      card.rowNumber
        ? `Editing Google Sheet row ${card.rowNumber}. Replace that row with the copied row.`
        : 'Editing offline cue card.',
    );
    this.errorMessage.set('');

    window.setTimeout(() => {
      const editor = this.editor();
      if (editor) {
        editor.nativeElement.innerHTML = card.contentHtml;
        this.form.controls.contentHtml.setValue(card.contentHtml);
      }
    }, 0);
  }

  protected resetForm(): void {
    this.form.reset({ title: '', contentHtml: '', tableName: '', tableHeaderBold: false });
    const editor = this.editor();
    if (editor) {
      editor.nativeElement.innerHTML = '';
    }
    this.table.set(null);
    this.tablePasteText.set('');
    this.editingCard.set(null);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  protected previewText(card: CueCard): string {
    return this.cueCardService.previewText(card, 100);
  }

  protected friendlyDate(value: string): string {
    if (!value) return 'No date';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected createTable(): void {
    this.table.set({
      rows: [this.createEmptyTableRow(this.newTableColumnCount())],
    });
  }

  protected clearTable(): void {
    this.requestClearTable();
  }

  private clearTableImmediately(): void {
    this.table.set(null);
    this.tablePasteText.set('');
  }

  protected addTableRow(): void {
    this.updateTable(table => ({
      rows: [...table.rows, this.createEmptyTableRow(table.rows[0]?.length ?? 1)].slice(0, this.maxTableRows),
    }));
  }

  protected addTableColumn(): void {
    this.updateTable(table => ({
      rows: table.rows.map(row => [...row, ''].slice(0, this.maxTableColumns)),
    }));
  }

  protected removeLastTableRow(): void {
    this.updateTable(table => ({
      rows:
        table.rows.length > 1
          ? table.rows.slice(0, table.rows.length - 1)
          : [this.createEmptyTableRow(table.rows[0]?.length ?? 1)],
    }));
  }

  protected removeLastTableColumn(): void {
    this.updateTable(table => {
      const nextColumnCount = Math.max(1, (table.rows[0]?.length ?? 1) - 1);
      return {
        rows: table.rows.map(row => row.slice(0, nextColumnCount)),
      };
    });
  }

  protected updateNewTableColumnCount(value: string): void {
    this.newTableColumnCount.set(this.clampInteger(Number(value), 1, this.maxTableColumns));
  }

  protected updateTablePasteText(value: string): void {
    this.tablePasteText.set(value);
  }

  protected applyTablePaste(): void {
    const rows = this.cueCardService.parsePastedTable(this.tablePasteText());
    if (rows.length === 0) return;

    this.table.set({
      rows: rows.map(row => row.map(cell => this.cueCardService.sanitizeTableCellHtml(cell))),
    });
    this.tablePasteText.set('');
  }

  protected updateTableCell(rowIndex: number, columnIndex: number, value: string): void {
    const sanitizedValue = this.cueCardService.sanitizeTableCellHtml(value);
    this.updateTable(table => ({
      rows: table.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? sanitizedValue : cell))
          : row,
      ),
    }));
  }

  protected pasteIntoTable(event: ClipboardEvent, rowIndex: number, columnIndex: number): void {
    const pastedText = event.clipboardData?.getData('text/plain') ?? '';
    const rows = this.cueCardService.parsePastedTable(pastedText);

    if (rows.length === 0 || (rows.length === 1 && rows[0]?.length === 1)) return;

    event.preventDefault();
    this.mergeTableRows(rows, rowIndex, columnIndex);
  }

  private buildCurrentCard(): CueCard | null {
    this.syncContent();
    const value = this.form.getRawValue();

    if (!value.title.trim() || !value.contentHtml.trim()) {
      this.errorMessage.set('Add a title and cue-card content first.');
      return null;
    }

    this.errorMessage.set('');
    return this.cueCardService.buildCueCard({
      title: value.title,
      contentHtml: value.contentHtml,
      tableName: value.tableName,
      tableHeaderBold: value.tableHeaderBold,
      table: this.table(),
      existingCard: this.editingCard(),
    });
  }

  private refreshOfflineCards(): void {
    this.offlineCards.set(this.cueCardService.getOfflineCueCards());
  }

  private openConfirmation(dialog: ConfirmationDialog): void {
    this.confirmationDialog.set(dialog);
  }

  private updateTable(updater: (table: CueCardTable) => CueCardTable): void {
    this.table.update(table => (table ? updater(table) : table));
  }

  private mergeTableRows(rows: string[][], startRowIndex: number, startColumnIndex: number): void {
    this.updateTable(table => {
      const columnCount = Math.min(
        this.maxTableColumns,
        Math.max(table.rows[0]?.length ?? 1, startColumnIndex + (rows[0]?.length ?? 1)),
      );
      const rowCount = Math.min(this.maxTableRows, Math.max(table.rows.length, startRowIndex + rows.length));
      const nextRows = Array.from({ length: rowCount }, (_, rowIndex) => {
        const existingRow = table.rows[rowIndex] ?? [];
        return Array.from({ length: columnCount }, (_, columnIndex) => existingRow[columnIndex] ?? '');
      });

      rows.forEach((row, pastedRowIndex) => {
        row.forEach((cell, pastedColumnIndex) => {
          const nextRowIndex = startRowIndex + pastedRowIndex;
          const nextColumnIndex = startColumnIndex + pastedColumnIndex;

          if (nextRows[nextRowIndex] && nextColumnIndex < columnCount) {
            nextRows[nextRowIndex][nextColumnIndex] = this.cueCardService.sanitizeTableCellHtml(cell);
          }
        });
      });

      return { rows: nextRows };
    });
  }

  private createEmptyTableRow(columnCount: number): string[] {
    return Array.from({ length: this.clampInteger(columnCount, 1, this.maxTableColumns) }, () => '');
  }

  private clampInteger(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }
}
