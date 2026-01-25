import { Component, ChangeDetectionStrategy, signal, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule, MarkdownService } from 'ngx-markdown';
import { HttpClient } from '@angular/common/http';
import { SnackbarService } from '../../services/snackbar.service';
import { getISTDate } from '../../utils/date-utils';

interface ViewedFile {
  name: string;
  filePath: string;
  uploadedAt: string;
  source: 'upload' | 'url';
}

declare global {
  interface Window {
    Prism: {
      highlightAll(): void;
      highlightElement(element: HTMLElement): void;
    };
    mermaid: {
      contentLoaded(): void;
      render(id: string, text: string): Promise<{ svg: string }>;
    };
    renderMathInElement: (element: HTMLElement, options?: Record<string, unknown>) => void;
  }
}

@Component({
  selector: 'app-markdown-viewer',
  imports: [CommonModule, FormsModule, MarkdownModule],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewerComponent implements AfterViewInit {
  private http = inject(HttpClient);
  private snackbarService = inject(SnackbarService);
  markdownService = inject(MarkdownService);

  readonly markdownContent = signal<string>('');
  readonly markdownBlobUrl = signal<string>('');
  readonly fileName = signal<string>('');
  readonly filePath = signal<string>('');
  readonly showInstructions = signal<boolean>(true);
  readonly isLoading = signal<boolean>(false);
  readonly viewedFiles = signal<ViewedFile[]>(this.loadViewedFiles());
  readonly showLoadDialog = signal<boolean>(false);
  readonly urlInput = signal<string>('');
  readonly availableFiles = signal<string[]>([]);
  readonly lastUsedLocation = signal<string>('');

  ngAfterViewInit(): void {
    this.initializeLibraries();
  }

  private initializeLibraries(): void {
    if (typeof window.mermaid !== 'undefined') {
      window.mermaid.contentLoaded();
    }
  }

  renderMarkdown(): void {
    // Rendering is handled by ngx-markdown component automatically
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isLoading.set(true);

      // Create blob URL for the markdown file
      const blob = new Blob([file], { type: 'text/markdown' });
      const blobUrl = URL.createObjectURL(blob);

      // Read the file content for storage
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        this.fileName.set(file.name);
        this.filePath.set(file.name);
        this.markdownContent.set(content);
        this.markdownBlobUrl.set(blobUrl);
        this.showInstructions.set(false);
        this.isLoading.set(false);
        this.addToViewedFiles(file.name, file.name, 'upload');
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        this.isLoading.set(false);
      };
      reader.readAsText(file);
      input.value = '';
    }
  }

  openUrlDialog(): void {
    this.showLoadDialog.set(true);
    this.urlInput.set(this.lastUsedLocation());
  }

  closeUrlDialog(): void {
    this.showLoadDialog.set(false);
    this.urlInput.set('');
    this.availableFiles.set([]);
  }

  loadFromUrl(): void {
    const urlPath = this.urlInput().trim();
    if (!urlPath) return;

    // Check if it's a local file path
    if (this.isLocalFilePath(urlPath)) {
      this.snackbarService.error(
        '⚠️ Local file paths cannot be loaded directly due to browser security.\n\n' +
          'Local paths like "C:\\Users\\..." or "/home/user/..." are blocked by CORS policy.\n\n' +
          '✅ Solution: Use the "Choose Markdown File" button to browse and select files from your computer.\n\n' +
          '💡 URL loading works only for HTTP/HTTPS URLs (e.g., https://example.com/file.md)',
      );
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    // Try to load the file via HTTP/HTTPS
    this.http.get(urlPath, { responseType: 'text' }).subscribe({
      next: content => {
        // Successfully loaded as a file
        const fileName = this.extractFileName(urlPath);

        // Create blob URL for markdown content
        const blob = new Blob([content], { type: 'text/markdown' });
        const blobUrl = URL.createObjectURL(blob);

        this.fileName.set(fileName);
        this.filePath.set(urlPath);
        this.markdownContent.set(content);
        this.markdownBlobUrl.set(blobUrl);
        this.showInstructions.set(false);
        this.isLoading.set(false);
        this.lastUsedLocation.set(urlPath);
        this.addToViewedFiles(fileName, urlPath, 'url');
        this.closeUrlDialog();
      },
      error: err => {
        console.error('Failed to load URL:', err);
        this.snackbarService.error(
          '❌ Failed to load the URL.\n\n' +
            'Possible reasons:\n' +
            '• Invalid URL format\n' +
            '• File not found (404)\n' +
            '• CORS policy blocking the request\n' +
            '• Network error\n\n' +
            'Please check the URL and try again.',
        );
        this.isLoading.set(false);
      },
    });
  }

  private isLocalFilePath(path: string): boolean {
    // Check for Windows paths (C:\, D:\, \\network\path)
    const windowsPath = /^[a-zA-Z]:\\|^\\\\/;
    // Check for Unix/Linux paths (/home, /usr, etc.)
    const unixPath = /^\/[^/]/;
    // Check for file:// protocol
    const fileProtocol = /^file:\/\//i;

    return windowsPath.test(path) || unixPath.test(path) || fileProtocol.test(path);
  }

  loadFromHistory(file: ViewedFile): void {
    this.isLoading.set(true);

    if (file.source === 'upload') {
      // For uploaded files, we can't reload them directly since they're not accessible
      this.snackbarService.error('Uploaded files cannot be reloaded from history. Please upload the file again.');
      this.isLoading.set(false);
      return;
    }

    // For URL-based files, fetch them again
    this.http.get(file.filePath, { responseType: 'text' }).subscribe({
      next: content => {
        // Create blob URL for markdown content
        const blob = new Blob([content], { type: 'text/markdown' });
        const blobUrl = URL.createObjectURL(blob);

        this.fileName.set(file.name);
        this.filePath.set(file.filePath);
        this.markdownContent.set(content);
        this.markdownBlobUrl.set(blobUrl);
        this.showInstructions.set(false);
        this.isLoading.set(false);
        this.lastUsedLocation.set(file.filePath);
      },
      error: () => {
        this.snackbarService.error(`Failed to load file: ${file.filePath}`);
        this.isLoading.set(false);
      },
    });
  }

  private extractFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  addToViewedFiles(name: string, filePath: string, source: 'upload' | 'url'): void {
    let files = this.viewedFiles().filter(f => f.filePath !== filePath);
    files.unshift({
      name,
      filePath,
      uploadedAt: getISTDate().toISOString(),
      source,
    });
    if (files.length > 5) {
      files = files.slice(0, 5);
    }
    this.viewedFiles.set(files);
    localStorage.setItem('markdownViewedFiles', JSON.stringify(files));
  }

  loadViewedFiles(): ViewedFile[] {
    const raw = localStorage.getItem('markdownViewedFiles');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  clearViewedFiles(): void {
    this.viewedFiles.set([]);
    localStorage.removeItem('markdownViewedFiles');
  }

  removeViewedFile(filePath: string): void {
    const files = this.viewedFiles().filter(f => f.filePath !== filePath);
    this.viewedFiles.set(files);
    localStorage.setItem('markdownViewedFiles', JSON.stringify(files));
  }

  showInstructionsView(): void {
    this.showInstructions.set(true);
    this.fileName.set('');
    this.markdownContent.set('');
    // renderMarkdown() will be called via markdown component's (ready) event
  }

  getFormattedDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
