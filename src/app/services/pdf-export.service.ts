import { Injectable, inject } from '@angular/core';
import { SheetEntry } from './gviz.service';
import { SnackbarService } from './snackbar.service';
import { PdfExportOptions, PdfEntryRow, MonthSummary } from '../models/pdf-export.model';

declare global {
  interface Window {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
      Plugins?: {
        OfficePulseExport?: {
          exportPdf: (options: { filename: string; content: string; html?: string; title: string }) => Promise<void>;
        };
      };
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  private snackbarService = inject(SnackbarService);

  /**
   * Generate and download PDF from entries
   */
  generatePdf(entries: SheetEntry[], options: PdfExportOptions): void {
    const { title, rows, monthSummaries } = this.prepareData(entries, options);
    const html = this.generateHtml(title, rows, options, monthSummaries);
    const androidPayload = this.generateAndroidPayload(title, rows, options, monthSummaries);
    this.downloadPdf(html, this.generateFileName(options), androidPayload);
  }

  /**
   * Prepare data for PDF generation
   */
  private prepareData(
    entries: SheetEntry[],
    options: PdfExportOptions,
  ): { title: string; rows: PdfEntryRow[]; monthSummaries: MonthSummary[] } {
    const title = this.generateTitle(options);
    const dateRange = this.getDateRange(options);
    const entriesMap = this.groupByDateLatestOnly(entries);

    const rows: PdfEntryRow[] = [];
    const currentDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    while (currentDate <= endDate) {
      const dateStr = this.formatDateKey(currentDate);
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const entry = entriesMap.get(dateStr);

      const isDayOff = entry?.status === 'Day Off';
      const isWeekOff = isWeekend || isDayOff;
      const hasEntry = !!entry;
      const isNoEntry = !hasEntry && !isWeekend;

      // Determine if we should include this day based on options
      let includeDay = false;

      switch (options.daysToInclude) {
        case 'entries-only':
          includeDay = hasEntry;
          break;
        case 'include-weekends':
          includeDay = hasEntry || isWeekend;
          break;
        case 'all-days':
          includeDay = true;
          break;
      }

      if (includeDay) {
        rows.push({
          date: this.formatDisplayDate(currentDate),
          dayName: this.getDayName(currentDate),
          entryTime: isWeekOff || isNoEntry ? '-' : this.formatTime(entry?.entryTime),
          exitTime: isWeekOff || isNoEntry ? '-' : this.formatTime(entry?.exitTime),
          duration: isWeekOff || isNoEntry ? '-' : entry?.duration || '-',
          companyName: entry?.companyName || '-',
          comments: entry?.comments || '-',
          status: isWeekend ? 'Weekend' : isNoEntry ? 'No Entry' : entry?.status || '-',
          isWeekOff,
          isNoEntry,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate month-wise summaries
    const monthSummaries = this.calculateMonthSummaries(rows);

    return { title, rows, monthSummaries };
  }

  /**
   * Calculate month-wise summaries
   */
  private calculateMonthSummaries(rows: PdfEntryRow[]): MonthSummary[] {
    const summaryMap = new Map<string, MonthSummary>();

    rows.forEach(row => {
      if (!row.month || !row.year) return;

      const key = `${row.year}-${row.month}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          month: row.month,
          year: row.year,
          monthName: new Date(row.year, row.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          workingDays: 0,
          totalMinutes: 0,
        });
      }

      const summary = summaryMap.get(key)!;

      // Count working days (days with actual entries, excluding week offs)
      if (!row.isWeekOff && !row.isNoEntry) {
        summary.workingDays++;

        // Calculate duration
        if (row.duration && row.duration !== '-') {
          const match = row.duration.match(/(\d+)h\s*(\d+)m/);
          if (match) {
            summary.totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
          }
        }
      }
    });

    // Sort by year and month
    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  /**
   * Generate title based on options
   */
  private generateTitle(options: PdfExportOptions): string {
    const year = options.selectedYear;
    const today = new Date();

    switch (options.dateRangeType) {
      case 'full-year':
        return `InOut Logs for Year ${year}`;
      case 'current-month': {
        const monthName = today.toLocaleString('en-US', { month: 'long' });
        return `InOut Logs for ${monthName} ${today.getFullYear()}`;
      }
      case 'previous-month': {
        const prevMonth = today.getMonth() - 1;
        const prevYear = prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const actualPrevMonth = prevMonth < 0 ? 11 : prevMonth;
        const monthName = new Date(prevYear, actualPrevMonth).toLocaleString('en-US', { month: 'long' });
        return `InOut Logs for ${monthName} ${prevYear}`;
      }
      case 'single-month': {
        const month = options.selectedMonth || new Date().getMonth() + 1;
        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
        return `InOut Logs for ${monthName} ${year}`;
      }
      default:
        return `InOut Logs`;
    }
  }

  /**
   * Get date range based on options
   */
  private getDateRange(options: PdfExportOptions): { start: Date; end: Date } {
    const year = options.selectedYear;
    const today = new Date();

    switch (options.dateRangeType) {
      case 'full-year':
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
        };
      case 'current-month': {
        const currentMonth = today.getMonth();
        return {
          start: new Date(today.getFullYear(), currentMonth, 1),
          end: new Date(today.getFullYear(), currentMonth + 1, 0),
        };
      }
      case 'previous-month': {
        const prevMonth = today.getMonth() - 1;
        const prevYear = prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const actualPrevMonth = prevMonth < 0 ? 11 : prevMonth;
        return {
          start: new Date(prevYear, actualPrevMonth, 1),
          end: new Date(prevYear, actualPrevMonth + 1, 0),
        };
      }
      case 'single-month': {
        const month = (options.selectedMonth || 1) - 1;
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
        };
      }
      default:
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
        };
    }
  }

  /**
   * Generate HTML for PDF
   */
  private generateHtml(
    title: string,
    rows: PdfEntryRow[],
    options: PdfExportOptions,
    monthSummaries: MonthSummary[],
  ): string {
    const headers = this.getTableHeaders(options);
    const isFullYear = options.dateRangeType === 'full-year';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #667eea;
    }
    .header h1 {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #7f8c8d;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    tr:hover {
      background-color: #f0f0f0;
    }
    .week-off {
      background-color: #fff3e0 !important;
      color: #e65100;
    }
    .week-off td {
      font-style: italic;
    }
    .no-entry {
      background-color: #ffebee !important;
      color: #c62828;
    }
    .no-entry td {
      font-style: italic;
    }
    .date-col {
      white-space: nowrap;
      font-weight: 500;
    }
    .day-col {
      color: #7f8c8d;
    }
    .time-col {
      font-family: 'Courier New', monospace;
      white-space: nowrap;
    }
    .duration-col {
      font-weight: 600;
      color: #27ae60;
    }
    .status-col {
      font-size: 10px;
    }
    .comments-col {
      max-width: 150px;
      word-wrap: break-word;
    }
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #7f8c8d;
      font-size: 10px;
    }
    .summary {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      flex-wrap: wrap;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 10px;
      color: #7f8c8d;
    }
    .summary-value {
      font-size: 16px;
      font-weight: 700;
      color: #667eea;
    }
    .month-section {
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .month-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 15px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .month-title {
      font-size: 14px;
      font-weight: 700;
    }
    .month-stats {
      display: flex;
      gap: 20px;
      font-size: 11px;
    }
    .month-stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .month-stat-value {
      font-weight: 700;
    }
    .yearly-summary {
      margin-top: 25px;
      padding: 15px;
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    }
    .yearly-summary h3 {
      margin-bottom: 10px;
      color: #2e7d32;
      font-size: 14px;
    }
    .yearly-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .yearly-summary-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    .yearly-summary-label {
      font-size: 10px;
      color: #7f8c8d;
    }
    .yearly-summary-value {
      font-size: 18px;
      font-weight: 700;
      color: #2e7d32;
    }
    @media print {
      body { padding: 10px; }
      .header { margin-bottom: 15px; }
      th, td { padding: 6px; }
      .month-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  ${this.generateOverallSummary(rows, monthSummaries)}

  ${isFullYear ? this.generateMonthWiseTables(rows, options, headers, monthSummaries) : this.generateSingleTable(rows, options, headers)}

  ${isFullYear ? this.generateYearlySummary(monthSummaries, options.selectedYear) : ''}

  <div class="footer">
    <p>Office Pulse - Attendance Tracker</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate overall summary section
   */
  private generateOverallSummary(rows: PdfEntryRow[], monthSummaries: MonthSummary[]): string {
    const workingDays = rows.filter(r => !r.isWeekOff && !r.isNoEntry).length;
    const weekOffs = rows.filter(r => r.isWeekOff).length;
    const noEntryDays = rows.filter(r => r.isNoEntry).length;

    // Calculate total hours from summaries
    const totalMinutes = monthSummaries.reduce((sum, s) => sum + s.totalMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;

    return `
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${workingDays}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${weekOffs}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      ${
        noEntryDays > 0
          ? `
      <div class="summary-item">
        <div class="summary-value">${noEntryDays}</div>
        <div class="summary-label">No Entry Days</div>
      </div>
      `
          : ''
      }
      <div class="summary-item">
        <div class="summary-value">${totalHours}h ${totalMins}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`;
  }

  /**
   * Generate single table (for monthly views)
   */
  private generateSingleTable(rows: PdfEntryRow[], options: PdfExportOptions, headers: string[]): string {
    return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => this.generateTableRow(row, options)).join('')}
      </tbody>
    </table>`;
  }

  /**
   * Generate month-wise tables (for full year view)
   */
  private generateMonthWiseTables(
    rows: PdfEntryRow[],
    options: PdfExportOptions,
    headers: string[],
    monthSummaries: MonthSummary[],
  ): string {
    // Group rows by month
    const monthGroups = new Map<string, PdfEntryRow[]>();

    rows.forEach(row => {
      if (!row.month || !row.year) return;
      const key = `${row.year}-${row.month}`;
      if (!monthGroups.has(key)) {
        monthGroups.set(key, []);
      }
      monthGroups.get(key)!.push(row);
    });

    // Generate tables for each month
    let html = '';

    monthSummaries.forEach(summary => {
      const key = `${summary.year}-${summary.month}`;
      const monthRows = monthGroups.get(key) || [];

      if (monthRows.length === 0) return;

      const hours = Math.floor(summary.totalMinutes / 60);
      const mins = summary.totalMinutes % 60;

      html += `
      <div class="month-section">
        <div class="month-header">
          <span class="month-title">📅 ${summary.monthName}</span>
          <div class="month-stats">
            <span class="month-stat">
              <span>Days:</span>
              <span class="month-stat-value">${summary.workingDays}</span>
            </span>
            <span class="month-stat">
              <span>Hours:</span>
              <span class="month-stat-value">${hours}h ${mins}m</span>
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${monthRows.map(row => this.generateTableRow(row, options)).join('')}
          </tbody>
        </table>
      </div>`;
    });

    return html;
  }

  /**
   * Generate yearly summary section
   */
  private generateYearlySummary(monthSummaries: MonthSummary[], year: number): string {
    const totalDays = monthSummaries.reduce((sum, s) => sum + s.workingDays, 0);
    const totalMinutes = monthSummaries.reduce((sum, s) => sum + s.totalMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const avgMinutesPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
    const avgHours = Math.floor(avgMinutesPerDay / 60);
    const avgMins = avgMinutesPerDay % 60;

    return `
    <div class="yearly-summary">
      <h3>📊 Yearly Summary - ${year}</h3>
      <div class="yearly-summary-grid">
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${totalDays}</div>
          <div class="yearly-summary-label">Total Working Days</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${totalHours}h ${totalMins}m</div>
          <div class="yearly-summary-label">Total Hours Worked</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${avgHours}h ${avgMins}m</div>
          <div class="yearly-summary-label">Avg Hours/Day</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${monthSummaries.length}</div>
          <div class="yearly-summary-label">Months with Entries</div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate summary section (legacy - keeping for compatibility)
   */
  private generateSummary(rows: PdfEntryRow[]): string {
    const workingDays = rows.filter(r => !r.isWeekOff && !r.isNoEntry).length;
    const weekOffs = rows.filter(r => r.isWeekOff).length;

    // Calculate total hours
    let totalMinutes = 0;
    rows.forEach(row => {
      if (!row.isWeekOff && row.duration && row.duration !== '-') {
        const match = row.duration.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      }
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;

    return `
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${workingDays}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${weekOffs}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${totalHours}h ${totalMins}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`;
  }

  /**
   * Get table headers based on options
   */
  private getTableHeaders(options: PdfExportOptions): string[] {
    const headers = ['Date', 'Day', 'Entry Time', 'Exit Time', 'Duration'];

    if (options.includeCompanyName) headers.push('Company');
    if (options.includeStatus) headers.push('Status');
    if (options.includeComments) headers.push('Comments');

    return headers;
  }

  /**
   * Generate table row HTML
   */
  private generateTableRow(row: PdfEntryRow, options: PdfExportOptions): string {
    let rowClass = '';
    if (row.isWeekOff) {
      rowClass = 'week-off';
    } else if (row.isNoEntry) {
      rowClass = 'no-entry';
    }

    let cells = `
      <td class="date-col">${row.date}</td>
      <td class="day-col">${row.dayName}</td>
      <td class="time-col">${row.entryTime}</td>
      <td class="time-col">${row.exitTime}</td>
      <td class="duration-col">${row.duration}</td>
    `;

    if (options.includeCompanyName) {
      cells += `<td>${row.companyName}</td>`;
    }
    if (options.includeStatus) {
      cells += `<td class="status-col">${row.status}</td>`;
    }
    if (options.includeComments) {
      cells += `<td class="comments-col">${row.comments}</td>`;
    }

    return `<tr class="${rowClass}">${cells}</tr>`;
  }

  private generateAndroidPayload(
    title: string,
    rows: PdfEntryRow[],
    options: PdfExportOptions,
    monthSummaries: MonthSummary[],
  ): string {
    const headers = this.getTableHeaders(options);
    const isFullYear = options.dateRangeType === 'full-year';
    const totalMinutes = monthSummaries.reduce((sum, summary) => sum + summary.totalMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const noEntryDays = rows.filter(row => row.isNoEntry).length;
    const summary = [
      { label: 'Working Days', value: String(rows.filter(row => !row.isWeekOff && !row.isNoEntry).length) },
      { label: 'Week Offs', value: String(rows.filter(row => row.isWeekOff).length) },
      ...(noEntryDays > 0 ? [{ label: 'No Entry Days', value: String(noEntryDays) }] : []),
      { label: 'Total Hours', value: `${totalHours}h ${totalMins}m` },
    ];

    const sections = isFullYear
      ? monthSummaries
          .map(monthSummary => {
            const sectionRows = rows.filter(row => row.month === monthSummary.month && row.year === monthSummary.year);
            const hours = Math.floor(monthSummary.totalMinutes / 60);
            const mins = monthSummary.totalMinutes % 60;

            return {
              title: monthSummary.monthName,
              stats: [
                { label: 'Days', value: String(monthSummary.workingDays) },
                { label: 'Hours', value: `${hours}h ${mins}m` },
              ],
              rows: sectionRows.map(row => this.toAndroidRow(row, options)),
            };
          })
          .filter(section => section.rows.length > 0)
      : [
          {
            title: 'Entries',
            stats: [],
            rows: rows.map(row => this.toAndroidRow(row, options)),
          },
        ];

    return JSON.stringify({
      title,
      generatedOn: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      summary,
      headers,
      sections,
    });
  }

  private toAndroidRow(row: PdfEntryRow, options: PdfExportOptions): { state: string; cells: string[] } {
    const cells = [row.date, row.dayName, row.entryTime, row.exitTime, row.duration];

    if (options.includeCompanyName) cells.push(row.companyName || '-');
    if (options.includeStatus) cells.push(row.status || '-');
    if (options.includeComments) cells.push(row.comments || '-');

    return {
      state: row.isWeekOff ? 'week-off' : row.isNoEntry ? 'no-entry' : 'normal',
      cells,
    };
  }

  /**
   * Generate file name
   */
  private generateFileName(options: PdfExportOptions): string {
    const year = options.selectedYear;

    switch (options.dateRangeType) {
      case 'full-year':
        return `inout_logs_${year}`;
      case 'current-month':
      case 'previous-month':
      case 'single-month': {
        const month = options.selectedMonth || new Date().getMonth() + 1;
        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'short' });
        return `inout_logs_${monthName}_${year}`;
      }
      default:
        return `inout_logs`;
    }
  }

  /**
   * Download PDF using print dialog
   */
  private downloadPdf(html: string, fileName: string, androidPayload: string): void {
    const capacitor = window.Capacitor;
    const nativeExport = capacitor?.Plugins?.OfficePulseExport;
    const isNativeAndroid = capacitor?.isNativePlatform?.() === true && capacitor.getPlatform?.() === 'android';

    if (isNativeAndroid) {
      if (!nativeExport) {
        this.snackbarService.error('PDF download is not available in this Android build');
        return;
      }

      this.snackbarService.success('Preparing PDF export');
      const exportPromise = nativeExport.exportPdf({
        filename: `${fileName}.pdf`,
        content: androidPayload,
        html,
        title: 'Office Pulse PDF Export',
      });
      let timeoutId = 0;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('PDF export timed out')), 20000);
      });
      exportPromise.then(
        () => window.clearTimeout(timeoutId),
        () => window.clearTimeout(timeoutId),
      );

      Promise.race([exportPromise, timeoutPromise])
        .then(() => this.snackbarService.success('Choose an app to save or share the PDF'))
        .catch(() => this.snackbarService.error('Unable to download PDF'));
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.snackbarService.error('Please allow popups to download PDF');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }

  // ============ Helper Methods ============

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  private getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  private formatTime(timeStr: string | undefined): string {
    if (!timeStr) return '-';

    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '-';

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '-';
    }
  }

  private groupByDateLatestOnly(entries: SheetEntry[]): Map<string, SheetEntry> {
    const grouped = new Map<string, SheetEntry>();

    entries.forEach(entry => {
      if (!entry.date) return;

      const existing = grouped.get(entry.date);

      if (!existing) {
        grouped.set(entry.date, entry);
      } else {
        const existingTime = new Date(existing.timestamp || existing.entryTime).getTime();
        const currentTime = new Date(entry.timestamp || entry.entryTime).getTime();

        if (currentTime > existingTime) {
          grouped.set(entry.date, entry);
        }
      }
    });

    return grouped;
  }
}
