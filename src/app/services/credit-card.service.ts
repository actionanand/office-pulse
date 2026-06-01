import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreditCard, CreditCardAge } from '../models/credit-card.model';

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
export class CreditCardService {
  private http = inject(HttpClient);

  private cache$?: Observable<CreditCard[]>;

  fetchCards(): Observable<CreditCard[]> {
    if (!this.cache$) {
      const url = this.buildGVizUrl(environment.CC_SHEET_GID);
      this.cache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseCards(response)),
        catchError((error: unknown) => {
          console.error('Error fetching credit card data:', error);
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

  private buildGVizUrl(gid: number): string {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`;
    const params = new URLSearchParams({ tq: 'SELECT *', gid: gid.toString(), headers: '1' });
    return `${baseUrl}?${params.toString()}`;
  }

  private parseGVizResponse(response: string): GVizResponse {
    const jsonString = response
      .replace(/\/\*O_o\*\/\s*/, '')
      .replace(/google\.visualization\.Query\.setResponse\(/, '')
      .replace(/\);?\s*$/, '');
    return JSON.parse(jsonString) as GVizResponse;
  }

  private parseCards(response: string): CreditCard[] {
    const data = this.parseGVizResponse(response);
    if (data.status !== 'ok' || !data.table?.rows) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cards: CreditCard[] = [];

    for (const row of data.table.rows) {
      const cells = row.c;

      // Skip rows with no S No (trailing empty rows)
      const rawSno = cells[0]?.v;
      if (rawSno == null) continue;
      const sno = Math.floor(rawSno as number);
      if (!sno) continue;

      const bank = (cells[1]?.v as string) ?? '';
      if (!bank) continue;

      const name = (cells[2]?.v as string) ?? '';
      const digits = (cells[3]?.v as string) ?? '';
      const frequentlyUsed = ((cells[5]?.v as string) ?? '').trim().toUpperCase() === 'YES';

      let lastUsedDate = '';
      let lastUsedDisplay = '';

      const dateCell = cells[4];
      if (dateCell?.v) {
        const rawDate = dateCell.v as string;
        const match = rawDate.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]); // 0-indexed
          const day = parseInt(match[3]);
          const d = new Date(year, month, day);
          lastUsedDate = this.toDateString(d);
        }
        lastUsedDisplay = dateCell.f ?? lastUsedDate;
      }

      let daysAgo = 0;
      if (lastUsedDate) {
        const last = new Date(lastUsedDate + 'T00:00:00');
        daysAgo = Math.max(0, Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const age = this.computeAge(daysAgo, frequentlyUsed);

      const card: CreditCard = { sno, bank, name, digits, lastUsedDate, lastUsedDisplay, frequentlyUsed, age, daysAgo };
      cards.push(card);
    }

    return cards;
  }

  /**
   * Compute age bucket:
   * - frequentlyUsed → always 'frequent' (treated as safe/recent)
   * - < 90 days  → 'recent'   (within 3 months)
   * - < 180 days → 'moderate' (3–6 months)
   * - < 365 days → 'old'      (6–12 months)
   * - ≥ 365 days → 'very-old' (over 1 year)
   */
  private computeAge(daysAgo: number, frequentlyUsed: boolean): CreditCardAge {
    if (frequentlyUsed) return 'frequent';
    if (daysAgo < 90) return 'recent';
    if (daysAgo < 180) return 'moderate';
    if (daysAgo < 365) return 'old';
    return 'very-old';
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
