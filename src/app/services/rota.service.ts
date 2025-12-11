import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Rota, RotaMeta, RotaResponse } from '../models/rota.model';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SheetRow {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root',
})
export class RotaService {
  private http = inject(HttpClient);
  private cache: RotaResponse | null = null;
  private readonly CACHE_KEY = 'office_rota_cache';
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  constructor() {
    this.loadFromLocalStorage();
  }

  fetchRotas(): Observable<RotaResponse> {
    // Return cached data if available
    if (this.cache) {
      return of(this.cache);
    }

    const url = `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/export?format=csv&gid=${environment.ROTA_SHEET_GID}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(csv => this.parseRotaCSV(csv)),
      tap(data => {
        this.cache = data;
        this.saveToLocalStorage(data);
      }),
      catchError(error => {
        console.error('Error fetching rotas:', error);
        // Try to return cached data from localStorage
        const cached = this.getFromLocalStorage();
        if (cached) {
          return of(cached);
        }
        throw error;
      }),
    );
  }

  private parseRotaCSV(csv: string): RotaResponse {
    const lines = csv.split('\n').filter(line => line.trim());
    const rotas: Rota[] = [];
    const metaRows: string[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const columns = this.parseCSVLine(lines[i]);

      if (columns.length < 8) continue;

      const [sNoStr, monthStr, dateStr, dateRangeStr, categoryStr, othersStr, commentsStr, metaStr] = columns;

      // Parse S No
      const sNo = parseInt(sNoStr?.trim() || '0', 10);
      if (sNo === 0) continue;

      // Collect meta information
      if (metaStr?.trim()) {
        metaRows.push(metaStr.trim());
      }

      // Create rota object
      const rota: Rota = { sNo };

      // Month (1-12)
      if (monthStr?.trim()) {
        const month = parseInt(monthStr.trim(), 10);
        if (month >= 1 && month <= 12) {
          rota.month = month;
        }
      }

      // Date (YYYY-MM-DD)
      if (dateStr?.trim()) {
        rota.date = dateStr.trim();
      }

      // Date Range
      if (dateRangeStr?.trim()) {
        rota.dateRange = dateRangeStr.trim();
      }

      // Category
      if (categoryStr?.trim()) {
        rota.category = categoryStr.trim();
      }

      // Others Involved
      if (othersStr?.trim()) {
        rota.othersInvolved = othersStr.trim();
      }

      // Comments
      if (commentsStr?.trim()) {
        rota.comments = commentsStr.trim();
      }

      rotas.push(rota);
    }

    // Extract meta: first row is title, rest are notes
    const meta: RotaMeta = {
      title: metaRows.length > 0 ? metaRows[0] : 'Rota Schedule',
      notes: metaRows.slice(1),
    };

    return { rotas, meta };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map(field => field.trim().replace(/^"|"$/g, ''));
  }

  clearCache(): void {
    this.cache = null;
    localStorage.removeItem(this.CACHE_KEY);
  }

  private saveToLocalStorage(data: RotaResponse): void {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
  }

  private loadFromLocalStorage(): void {
    const cached = this.getFromLocalStorage();
    if (cached) {
      this.cache = cached;
    }
  }

  private getFromLocalStorage(): RotaResponse | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < this.CACHE_DURATION) {
        return data;
      } else {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }
    } catch {
      return null;
    }
  }
}
