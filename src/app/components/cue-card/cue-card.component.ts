import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CueCard, CueCardMode } from '../../models/cue-card.model';
import { SafeCueCardHtmlPipe } from '../../pipes/safe-cue-card-html.pipe';
import { CueCardService } from '../../services/cue-card.service';

type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent';
type RichTextColorCommand = 'foreColor' | 'hiliteColor';

@Component({
  selector: 'app-cue-card',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SafeCueCardHtmlPipe],
  templateUrl: './cue-card.component.html',
  styleUrl: './cue-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CueCardComponent {
  private readonly cueCardService = inject(CueCardService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly mode = signal<CueCardMode>('generate');
  protected readonly isLoading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly sheetCards = signal<CueCard[]>([]);
  protected readonly offlineCards = signal<CueCard[]>(this.cueCardService.getOfflineCueCards());
  protected readonly textColorOptions = this.cueCardService.textColorOptions;
  protected readonly backgroundColorOptions = this.cueCardService.backgroundColorOptions;
  protected readonly editor = viewChild<ElementRef<HTMLDivElement>>('contentEditor');

  protected readonly cards = computed(() => {
    const offlineCards = this.offlineCards();
    const offlineIds = new Set(offlineCards.map(card => card.id));
    return [...offlineCards, ...this.sheetCards().filter(card => !offlineIds.has(card.id))];
  });
  protected readonly hasOfflineCards = computed(() => this.offlineCards().length > 0);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    contentHtml: ['', [Validators.required]],
  });

  protected setMode(mode: CueCardMode): void {
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

  protected async copyForSheet(): Promise<void> {
    const card = this.buildCurrentCard();
    if (!card) return;

    try {
      await navigator.clipboard.writeText(this.cueCardService.toGoogleSheetClipboard(card));
      this.statusMessage.set('Copied cue card header and row for Google Sheet.');
    } catch {
      this.errorMessage.set('Clipboard copy failed. Select the generated content and copy manually.');
    }
  }

  protected saveOffline(): void {
    const card = this.buildCurrentCard();
    if (!card) return;

    this.cueCardService.saveOfflineCueCard(card);
    this.refreshOfflineCards();
    this.statusMessage.set('Saved cue card offline.');
  }

  protected clearOfflineCueCards(): void {
    this.cueCardService.clearOfflineCueCards();
    this.refreshOfflineCards();
    this.statusMessage.set('Offline cue cards cleared.');
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

  protected resetForm(): void {
    this.form.reset({ title: '', contentHtml: '' });
    const editor = this.editor();
    if (editor) {
      editor.nativeElement.innerHTML = '';
    }
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  private buildCurrentCard(): CueCard | null {
    this.syncContent();
    const value = this.form.getRawValue();

    if (!value.title.trim() || !value.contentHtml.trim()) {
      this.errorMessage.set('Add a title and cue-card content first.');
      return null;
    }

    this.errorMessage.set('');
    return this.cueCardService.buildCueCard(value.title, value.contentHtml);
  }

  private refreshOfflineCards(): void {
    this.offlineCards.set(this.cueCardService.getOfflineCueCards());
  }
}
