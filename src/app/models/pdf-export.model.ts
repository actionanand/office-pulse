export type DateRangeType = 'current-month' | 'previous-month' | 'single-month' | 'full-year';
export type DaysToInclude = 'entries-only' | 'include-weekends' | 'all-days';

export interface PdfExportOptions {
  dateRangeType: DateRangeType;
  selectedYear: number;
  selectedMonth?: number; // 1-12, only for 'single-month'
  includeCompanyName: boolean;
  includeComments: boolean;
  includeStatus: boolean;
  daysToInclude: DaysToInclude; // Which days to show in PDF
}

export interface PdfEntryRow {
  date: string; // Formatted date like "Mon, Dec 1"
  dayName: string; // Day name like "Monday"
  entryTime: string;
  exitTime: string;
  duration: string;
  companyName?: string;
  comments?: string;
  status?: string;
  isWeekOff: boolean;
  isNoEntry: boolean; // Day without any entry
  month?: number; // For grouping
  year?: number; // For grouping
}

export interface MonthSummary {
  month: number;
  year: number;
  monthName: string;
  workingDays: number;
  totalMinutes: number;
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  dateRangeType: 'current-month',
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  includeCompanyName: false,
  includeComments: false,
  includeStatus: false,
  daysToInclude: 'entries-only'
};
