import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookmarkService } from '../../services/bookmark.service';
import { Bookmark } from '../../models/bookmark.model';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-bookmarks',
  imports: [CommonModule],
  templateUrl: './bookmarks.component.html',
  styleUrl: './bookmarks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookmarksComponent implements OnInit {
  private bookmarkService = inject(BookmarkService);
  private snackbarService = inject(SnackbarService);

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly allBookmarks = signal<Bookmark[]>([]);

  // Popup state
  readonly selectedComment = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly itemsPerPage = 25;

  readonly totalBookmarks = computed(() => this.allBookmarks().length);
  readonly totalPages = computed(() => Math.ceil(this.totalBookmarks() / this.itemsPerPage));

  readonly paginatedBookmarks = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.allBookmarks().slice(start, end);
  });

  // Expose Math for template
  readonly Math = Math;

  ngOnInit(): void {
    this.loadBookmarks();
  }

  loadBookmarks(): void {
    this.loading.set(true);
    this.error.set(null);

    this.bookmarkService.fetchBookmarks().subscribe({
      next: (data: { bookmarks: Bookmark[] }) => {
        this.allBookmarks.set(data.bookmarks);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading bookmarks:', err);
        this.error.set('Failed to load bookmarks. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.loadBookmarks();
  }

  // Pagination methods
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page: number) => page + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page: number) => page - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  // Comment popup methods
  showCommentPopup(comment: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedComment.set(comment);
  }

  closeCommentPopup(): void {
    this.selectedComment.set(null);
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close if clicking directly on the overlay, not its children
    if (event.target === event.currentTarget) {
      this.closeCommentPopup();
    }
  }

  isCommentLong(comment: string): boolean {
    return !!comment && comment.length > 50;
  }

  getTruncatedComment(comment: string, maxLength: number = 50): string {
    if (!comment || comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
  }
}
