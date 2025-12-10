import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// You need to install ngx-markdown, prismjs, and mermaidjs in your project for this to work
// npm install ngx-markdown prismjs mermaid

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewerComponent {
  readonly sanitizer = inject(DomSanitizer);

  readonly markdownContent = signal<string>('');
  readonly fileName = signal<string>('');
  readonly history = signal<Array<{ name: string; content: string }>>(this.loadHistory());

  get safeMarkdown(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.markdownContent());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        this.fileName.set(file.name);
        this.markdownContent.set(content);
        this.addToHistory(file.name, content);
      };
      reader.readAsText(file);
    }
  }

  addToHistory(name: string, content: string) {
    let hist = this.history().filter(h => h.name !== name);
    hist.unshift({ name, content });
    if (hist.length > 5) hist = hist.slice(0, 5);
    this.history.set(hist);
    localStorage.setItem('markdownHistory', JSON.stringify(hist));
  }

  loadHistory(): Array<{ name: string; content: string }> {
    const raw = localStorage.getItem('markdownHistory');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  loadFromHistory(entry: { name: string; content: string }) {
    this.fileName.set(entry.name);
    this.markdownContent.set(entry.content);
  }

  clearHistory() {
    this.history.set([]);
    localStorage.removeItem('markdownHistory');
  }

  removeHistoryEntry(name: string) {
    const hist = this.history().filter(h => h.name !== name);
    this.history.set(hist);
    localStorage.setItem('markdownHistory', JSON.stringify(hist));
  }
}
