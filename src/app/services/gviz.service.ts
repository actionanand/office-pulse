import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface SheetEntry {
  timestamp: string;
  entryTime: string;
  exitTime: string;
  companyName?: string;
  comments?: string;
  date: string; // Derived from entry time
  duration?: string; // Calculated duration
}

export interface GVizResponse {
  version: string;
  reqId: string;
  status: string;
  sig: string;
  table: {
    cols: Array<{ id: string; label: string; type: string }>;
    rows: Array<{
      c: Array<{ v: string | null; f?: string }>;
    }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GvizService {
  private http = inject(HttpClient);

  /**
   * Fetch entries from Google Sheets using Google Visualization API
   * @param sheetId - The Google Sheet ID (from the sheet URL)
   * @param gid - The specific sheet GID (default is 0 for first sheet)
   * @param days - Number of days to fetch (default 31)
   * @returns Observable of SheetEntry array
   */
  fetchEntries(sheetId: string, gid: number = 0, days: number = 31): Observable<SheetEntry[]> {
    // Build the gviz query URL
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;

    // SQL-like query to get last N entries ordered by timestamp descending
    // Adjust column letters (A, B, C, D, E) based on your actual sheet structure
    // Expected columns: Timestamp, Entry Time, Exit Time, Company Name, Comments
    const query = `SELECT A, B, C, D, E ORDER BY A DESC LIMIT ${days}`;

    const params = {
      tq: query,
      gid: gid.toString(),
      headers: '1', // First row contains headers
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}?${queryString}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => this.parseGVizResponse(response)),
      catchError(error => {
        console.error('Error fetching Google Sheets data:', error);
        return of([]);
      }),
    );
  }

  /**
   * Fetch entries for a specific month
   * @param sheetId - The Google Sheet ID
   * @param year - Year (e.g., 2025)
   * @param month - Month (1-12)
   * @param gid - Sheet GID
   * @returns Observable of SheetEntry array for that month
   */
  fetchEntriesForMonth(sheetId: string, year: number, month: number, gid: number = 0): Observable<SheetEntry[]> {
    // Fetch last 31 days and filter client-side for the specific month
    // Alternatively, you can build a more complex WHERE clause in the tq query
    return this.fetchEntries(sheetId, gid, 90).pipe(map(entries => this.filterEntriesByMonth(entries, year, month)));
  }

  /**
   * Parse the Google Visualization API response
   * The response is in a special format: google.visualization.Query.setResponse(...)
   */
  private parseGVizResponse(response: string): SheetEntry[] {
    try {
      // Remove the JSONP wrapper to extract JSON
      const jsonString = response
        .replace(/\/\*O_o\*\/\s*/, '') // Remove /*O_o*/ prefix
        .replace(/google\.visualization\.Query\.setResponse\(/, '')
        .replace(/\);?\s*$/, '');

      const data: GVizResponse = JSON.parse(jsonString);

      if (data.status !== 'ok' || !data.table || !data.table.rows) {
        console.error('Invalid gviz response:', data);
        return [];
      }

      // Map rows to SheetEntry objects
      const entries: SheetEntry[] = data.table.rows.map(row => {
        const cells = row.c;

        // Extract values - prefer formatted (f) for datetime types, fallback to value (v)
        const timestamp = cells[0]?.f || this.parseGVizDate(cells[0]?.v) || '';
        const entryTime = cells[1]?.f || this.parseGVizDate(cells[1]?.v) || '';
        const exitTime = cells[2]?.f || this.parseGVizDate(cells[2]?.v) || '';
        const companyName = cells[3]?.v || '';
        const comments = cells[4]?.v || '';

        // Parse entry time to get date
        const date = this.extractDate(entryTime);
        const duration = this.calculateDuration(entryTime, exitTime);

        return {
          timestamp,
          entryTime,
          exitTime,
          companyName,
          comments,
          date,
          duration,
        };
      });

      return entries;
    } catch (error) {
      console.error('Error parsing gviz response:', error);
      return [];
    }
  }

  /**
   * Parse gviz date format: "Date(2025,11,1,21,45,15)" to a readable string
   */
  private parseGVizDate(dateValue: string | null): string {
    if (!dateValue || typeof dateValue !== 'string') return '';

    // Check if it's in Date(...) format
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      // Note: month in Date() is 0-indexed in the response, so we use it as-is
      const date = new Date(
        parseInt(year),
        parseInt(month), // Already correct (0-11)
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second),
      );

      // Return in format: "M/d/yyyy H:mm:ss"
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }

    return dateValue;
  }

  /**
   * Extract date from entry time string
   * Expected formats: "12/1/2025 21:38:00" or "M/d/yyyy H:mm:ss"
   */
  private extractDate(entryTime: string): string {
    if (!entryTime) return '';

    try {
      // Parse the date string
      const date = new Date(entryTime);
      if (isNaN(date.getTime())) return '';

      // Return in YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch {
      // Fallback: try to extract date portion with regex
      const match = entryTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return '';
    }
  }

  /**
   * Calculate duration between entry and exit times
   */
  private calculateDuration(entryTime: string, exitTime: string): string {
    if (!entryTime || !exitTime) return '';

    try {
      const entry = new Date(entryTime);
      const exit = new Date(exitTime);

      if (isNaN(entry.getTime()) || isNaN(exit.getTime())) return '';

      const diffMs = exit.getTime() - entry.getTime();

      if (diffMs < 0) return '';

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}h ${minutes}m`;
    } catch {
      return '';
    }
  }

  /**
   * Filter entries by specific year and month
   */
  private filterEntriesByMonth(entries: SheetEntry[], year: number, month: number): SheetEntry[] {
    const targetYearMonth = `${year}-${String(month).padStart(2, '0')}`;

    return entries.filter(entry => {
      return entry.date.startsWith(targetYearMonth);
    });
  }

  /**
   * Group entries by date and keep only the latest entry per day
   */
  groupByDateLatestOnly(entries: SheetEntry[]): Map<string, SheetEntry> {
    const grouped = new Map<string, SheetEntry>();

    entries.forEach(entry => {
      if (!entry.date) return;

      const existing = grouped.get(entry.date);

      if (!existing) {
        grouped.set(entry.date, entry);
      } else {
        // Compare timestamps to keep the latest
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
