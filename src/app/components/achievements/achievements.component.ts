import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { AchievementService } from '../../services/achievement.service';
import { AchievementsByYear, AchievementFormData } from '../../models/achievement.model';
import { GoogleFormDialogComponent } from '../google-form-dialog/google-form-dialog.component';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-achievements',
  imports: [CommonModule, FormsModule, GoogleFormDialogComponent, LucideDynamicIcon],
  templateUrl: './achievements.component.html',
  styleUrl: './achievements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AchievementsComponent implements OnInit {
  private achievementService = inject(AchievementService);
  private snackbarService = inject(SnackbarService);
  // Data signals
  readonly achievementsByYear = signal<AchievementsByYear[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  // Form signals
  readonly showForm = signal(false);
  readonly formData = signal<AchievementFormData>({
    title: '',
    link: '',
    date: this.getTodayDate(),
    comments: '',
  });

  // Google Form Dialog signals
  readonly showGoogleFormDialog = signal(false);
  readonly googleFormUrl = signal('');
  readonly isSubmitting = signal(false);

  // UI state
  readonly expandedYears = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.loadAchievements();
  }

  loadAchievements(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.achievementService.fetchAchievements().subscribe({
      next: data => {
        this.achievementsByYear.set(data);
        // Expand the current year by default
        const currentYear = new Date().getFullYear();
        const years = new Set<number>();
        if (data.some(group => group.year === currentYear)) {
          years.add(currentYear);
        } else if (data.length > 0) {
          years.add(data[0].year); // Expand most recent year
        }
        this.expandedYears.set(years);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading achievements:', err);
        this.error.set('Failed to load achievements. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  refreshData(): void {
    this.achievementService.clearCache();
    this.loadAchievements();
  }

  toggleForm(): void {
    this.showForm.update(show => !show);
    if (this.showForm()) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.formData.set({
      title: '',
      link: '',
      date: this.getTodayDate(),
      comments: '',
    });
  }

  updateFormField(field: keyof AchievementFormData, value: string): void {
    this.formData.update(data => ({
      ...data,
      [field]: value,
    }));
  }

  async submitForm(): Promise<void> {
    if (this.isSubmitting()) return;

    const data = this.formData();
    if (!data.title.trim()) {
      this.snackbarService.error('Title is required!');
      return;
    }

    this.isSubmitting.set(true);
    this.snackbarService.info('Submitting achievement...', 5000);

    try {
      await this.achievementService.submitAchievement(data);
      this.snackbarService.success('Achievement submitted successfully.');
      this.showForm.set(false);
      this.resetForm();

      setTimeout(() => {
        this.refreshData();
      }, 2000);
    } catch (error) {
      console.error('Achievement submission error:', error);
      this.snackbarService.error('Failed to submit achievement. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  openEmptyForm(): void {
    const formUrl = this.achievementService.generateFormUrl(undefined, true);
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
    this.showForm.set(false);
    this.resetForm();

    // Refresh data after a short delay to allow Google Sheets to update
    setTimeout(() => {
      this.refreshData();
    }, 2000);
  }

  toggleYear(year: number): void {
    this.expandedYears.update(years => {
      const newYears = new Set(years);
      if (newYears.has(year)) {
        newYears.delete(year);
      } else {
        newYears.add(year);
      }
      return newYears;
    });
  }

  isYearExpanded(year: number): boolean {
    return this.expandedYears().has(year);
  }

  expandAllYears(): void {
    const allYears = new Set(this.achievementsByYear().map(g => g.year));
    this.expandedYears.set(allYears);
  }

  collapseAllYears(): void {
    this.expandedYears.set(new Set());
  }

  getTotalCount(): number {
    return this.achievementsByYear().reduce((sum, group) => sum + group.achievements.length, 0);
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
}
