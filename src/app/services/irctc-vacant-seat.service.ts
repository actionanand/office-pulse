import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { StationSchedule, VacantSeatEntry } from '../models/irctc-vacant-seat.model';

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

interface ParsedData {
  entries: VacantSeatEntry[];
  stations: StationSchedule[];
}

@Injectable({
  providedIn: 'root',
})
export class IrctcVacantSeatService {
  private http = inject(HttpClient);

  private cache$?: Observable<ParsedData>;

  fetchData(): Observable<ParsedData> {
    if (!this.cache$) {
      const url = this.buildGVizUrl(environment.IRCTC_VACANT_SEAT_GID);
      this.cache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseResponse(response)),
        catchError((error: unknown) => {
          console.error('Error fetching IRCTC vacant seats:', error);
          return of({ entries: [], stations: [] });
        }),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  clearCache(): void {
    this.cache$ = undefined;
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

  private parseResponse(response: string): ParsedData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table?.rows) {
      return { entries: [], stations: [] };
    }

    // Parse station schedule from columns H(7), I(8), J(9)
    const stations: StationSchedule[] = [];
    for (const row of data.table.rows) {
      const cells = row.c;
      const place = (cells[7]?.v as string) || '';
      const timeVal = cells[8]?.v as number | null;
      const dayVal = cells[9]?.v as number | null;

      if (place && timeVal != null) {
        const { hours, minutes } = this.parseTime(timeVal);
        const day = dayVal ?? 0;
        const effectiveMinutes = day * 24 * 60 + hours * 60 + minutes;
        const display12h = this.to12HourFormat(hours, minutes);
        const dayLabel = this.getDayLabel(day);
        stations.push({ place, hours, minutes, day, effectiveMinutes, display12h, dayLabel });
      }
    }

    // Build a lookup from station name (lowercase) → StationSchedule
    const stationLookup = new Map<string, StationSchedule>();
    for (const s of stations) {
      stationLookup.set(s.place.toLowerCase(), s);
    }

    // Parse seat entries from columns A-F
    const entries: VacantSeatEntry[] = data.table.rows
      .map(row => {
        const cells = row.c;
        const sno = (cells[0]?.v as number) ?? 0;
        if (sno <= 0) return null;

        const coach = (cells[1]?.v as string) ?? '';
        const seats = (cells[2]?.v as string) ?? '';
        const berth = (cells[3]?.v as string) ?? '';
        const fromStation = (cells[4]?.v as string) || 'From Start';
        const toStation = (cells[5]?.v as string) || 'Till End';

        const seatList = this.expandSeats(seats);
        const seatCount = seatList.length;

        const fromSchedule = stationLookup.get(fromStation.toLowerCase());
        const toSchedule = stationLookup.get(toStation.toLowerCase());

        const entry: VacantSeatEntry = {
          sno,
          coach,
          seats,
          seatList,
          seatCount,
          berth,
          fromStation,
          toStation,
          fromSchedule,
          toSchedule,
        };
        return entry;
      })
      .filter((e): e is VacantSeatEntry => e !== null);

    return { entries, stations };
  }

  /**
   * Parse time stored as decimal number.
   * Spreadsheet stores 2:30 → 2.3, 5:18 → 5.18, 21:40 → 21.4
   * The decimal part IS the minutes (trailing zero dropped by Sheets).
   */
  private parseTime(val: number): { hours: number; minutes: number } {
    const hours = Math.floor(val);
    const decimalStr = val.toString().split('.')[1] || '0';
    // Single-digit decimal means trailing zero was dropped (e.g., .3 = 30 min)
    const minuteStr = decimalStr.length === 1 ? decimalStr + '0' : decimalStr;
    const minutes = parseInt(minuteStr, 10);
    return { hours, minutes: Math.min(minutes, 59) };
  }

  private to12HourFormat(hours: number, minutes: number): string {
    const suffix = hours >= 12 ? 'PM' : 'AM';
    let h = hours % 12;
    if (h === 0) h = 12;
    const m = String(minutes).padStart(2, '0');
    return `${h}:${m} ${suffix}`;
  }

  private getDayLabel(day: number): string {
    if (day === 0) return 'Same Day';
    if (day === 1) return 'Next Day';
    return `Day ${day + 1}`;
  }

  /**
   * Expand seat string: "40, 37, 56, 1-3" → ["40", "37", "56", "1", "2", "3"]
   */
  private expandSeats(seatStr: string): string[] {
    if (!seatStr.trim()) return [];
    const result: string[] = [];
    const parts = seatStr.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            result.push(String(i));
          }
        } else {
          result.push(part);
        }
      } else {
        result.push(part);
      }
    }
    return result;
  }
}
