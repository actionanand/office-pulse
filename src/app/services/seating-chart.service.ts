import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { SeatingEntry } from '../models/seating-chart.model';

interface GVizCell {
  v: string | number | boolean | null;
  f?: string;
}

interface GVizResponse {
  version: string;
  reqId: string;
  status: string;
  sig: string;
  table: {
    cols: Array<{ id: string; label: string; type: string }>;
    rows: Array<{ c: Array<GVizCell | null> }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SeatingChartService {
  private http = inject(HttpClient);

  private cache$?: Observable<SeatingEntry[]>;

  fetchEntries(): Observable<SeatingEntry[]> {
    if (!this.cache$) {
      const url = this.buildGVizUrl(environment.WFO_SHEET_GID);
      this.cache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseEntries(response)),
        catchError((error: unknown) => {
          console.error('Error fetching seating data:', error);
          return of([]);
        }),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  clearCache(): void {
    this.cache$ = undefined;
  }

  /** Filter entries that apply to the given date (single date or range). */
  getEntriesForDate(entries: SeatingEntry[], date: Date): SeatingEntry[] {
    const dateStr = this.toDateString(date);
    return entries.filter(entry => {
      if (entry.date) {
        return entry.date === dateStr;
      }
      if (entry.dateRangeStart && entry.dateRangeEnd) {
        return dateStr >= entry.dateRangeStart && dateStr <= entry.dateRangeEnd;
      }
      return false;
    });
  }

  toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildGVizUrl(gid: number): string {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`;
    const params = new URLSearchParams({
      tq: 'SELECT *',
      gid: gid.toString(),
      headers: '1',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private parseGVizResponse(response: string): GVizResponse {
    const jsonString = response
      .replace(/\/\*O_o\*\/\s*/, '')
      .replace(/google\.visualization\.Query\.setResponse\(/, '')
      .replace(/\);?\s*$/, '');
    return JSON.parse(jsonString) as GVizResponse;
  }

  private parseEntries(response: string): SeatingEntry[] {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table?.rows) {
      return [];
    }

    return data.table.rows
      .map(row => {
        const cells = row.c;
        // Cols: A=S No, B=Organization, C=Venue, D=Floor, E=Seat Number, F=Time, G=Date, H=Date Range, I=Notes
        const sno = (cells[0]?.v as number) ?? 0;
        const organization = (cells[1]?.v as string) ?? '';
        const venue = (cells[2]?.v as string) ?? '';
        const floor = (cells[3]?.v as string) ?? '';
        const seatNumber = (cells[4]?.v as string) ?? '';
        const time = (cells[5]?.v as string) || undefined;
        const dateCell = cells[6];
        const dateRangeCell = cells[7];
        const notes = (cells[8]?.v as string) || undefined;

        let date: string | undefined;
        let dateDisplay: string | undefined;
        let dateRangeStart: string | undefined;
        let dateRangeEnd: string | undefined;
        let dateRangeDisplay: string | undefined;

        if (dateCell?.v) {
          const parsed = this.parseGVizDateToString(dateCell.v as string);
          date = parsed || undefined;
          dateDisplay = dateCell.f || parsed || undefined;
        }

        if (dateRangeCell?.v) {
          dateRangeDisplay = dateRangeCell.v as string;
          const parsed = this.parseDateRange(dateRangeCell.v as string);
          if (parsed) {
            dateRangeStart = parsed.start;
            dateRangeEnd = parsed.end;
          }
        }

        return {
          sno,
          organization,
          venue,
          floor,
          seatNumber,
          time,
          date,
          dateRangeStart,
          dateRangeEnd,
          notes,
          dateDisplay,
          dateRangeDisplay,
        } satisfies SeatingEntry;
      })
      .filter(e => e.sno > 0);
  }

  /** Parse gviz Date format: "Date(2026,4,12)" → "2026-05-12" (month is 0-indexed) */
  private parseGVizDateToString(dateValue: string): string {
    const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]); // 0-indexed
      const day = parseInt(match[3]);
      return this.toDateString(new Date(year, month, day));
    }
    return '';
  }

  /** Parse "May 15 2026 - May 16 2026" into start/end YYYY-MM-DD strings */
  private parseDateRange(rangeStr: string): { start: string; end: string } | null {
    const parts = rangeStr.split(' - ');
    if (parts.length !== 2) return null;
    const start = new Date(parts[0].trim());
    const end = new Date(parts[1].trim());
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    return { start: this.toDateString(start), end: this.toDateString(end) };
  }
}
