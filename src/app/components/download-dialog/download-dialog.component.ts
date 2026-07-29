import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { PdfExportOptions, DateRangeType, DaysToInclude } from '../../models/pdf-export.model';

@Component({
  selector: 'app-download-dialog',
  templateUrl: './download-dialog.component.html',
  styleUrl: './download-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideDynamicIcon],
})
export class DownloadDialogComponent {
  isOpen = input<boolean>(false);
  closeDialog = output<void>();
  download = output<PdfExportOptions>();

  // Form state
  dateRangeType = signal<DateRangeType>('current-month');
  selectedYear = signal<number>(new Date().getFullYear());
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  includeCompanyName = signal<boolean>(false);
  includeComments = signal<boolean>(false);
  includeStatus = signal<boolean>(false);
  daysToInclude = signal<DaysToInclude>('entries-only');

  // Available years (current year and previous 2 years)
  availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  });

  // Available months
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Show month selector only for single-month type
  showMonthSelector = computed(() => this.dateRangeType() === 'single-month');

  // Show year selector for full-year and single-month
  showYearSelector = computed(() => this.dateRangeType() === 'full-year' || this.dateRangeType() === 'single-month');

  onDateRangeChange(value: string): void {
    this.dateRangeType.set(value as DateRangeType);
  }

  onYearChange(value: string): void {
    this.selectedYear.set(parseInt(value, 10));
  }

  onMonthChange(value: string): void {
    this.selectedMonth.set(parseInt(value, 10));
  }

  onDaysToIncludeChange(value: string): void {
    this.daysToInclude.set(value as DaysToInclude);
  }

  onClose(): void {
    this.closeDialog.emit();
  }

  onDownload(): void {
    const options: PdfExportOptions = {
      dateRangeType: this.dateRangeType(),
      selectedYear: this.selectedYear(),
      selectedMonth: this.selectedMonth(),
      includeCompanyName: this.includeCompanyName(),
      includeComments: this.includeComments(),
      includeStatus: this.includeStatus(),
      daysToInclude: this.daysToInclude(),
    };

    this.download.emit(options);
    this.closeDialog.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.onClose();
    }
  }
}
