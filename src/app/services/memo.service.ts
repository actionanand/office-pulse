import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { Memo, MemoData, MemoStatusOverride } from '../models/memo.model';

interface GVizResponse {
  version: string;
  reqId: string;
  status: string;
  sig: string;
  table: {
    cols: Array<{ id: string; label: string; type: string }>;
    rows: Array<{
      c: Array<{ v: string | number | boolean | null; f?: string } | null>;
    }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MemoService {
  private http = inject(HttpClient);

  private readonly MEMO_STATUS_OVERRIDES_KEY = 'memo_status_overrides';
  private memosCache$?: Observable<MemoData>;

  fetchMemos(): Observable<MemoData> {
    if (!this.memosCache$) {
      const url = this.buildGVizUrl(environment.MEMO_SHEET_GID);
      this.memosCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseMemos(response)),
        catchError((error: unknown) => {
          console.error('Error fetching memos:', error);
          return of({ memos: [] });
        }),
        shareReplay(1),
      );
    }
    return this.memosCache$;
  }

  clearCache(): void {
    this.memosCache$ = undefined;
  }

  private buildGVizUrl(gid: number): string {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`;
    const query = 'SELECT *';
    const params = new URLSearchParams({
      tq: query,
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
    return JSON.parse(jsonString);
  }

  private parseMemos(response: string): MemoData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return { memos: [] };
    }

    const statusOverrides = this.getStatusOverrides();

    const memos: Memo[] = data.table.rows
      .map(row => {
        const cells = row.c;
        // S No, Title, Description, Status
        if (!cells[0] || cells[0].v === null) return null;

        const sno = typeof cells[0]?.v === 'number' ? cells[0].v : 0;
        let status = cells[3]?.v === true;

        // Override status from local storage if exists
        const override = statusOverrides.find((o: MemoStatusOverride) => o.sno === sno);
        if (override !== undefined) {
          status = override.status;
        }

        return {
          sno,
          title: (cells[1]?.v as string) || '',
          description: (cells[2]?.v as string) || '',
          status,
        };
      })
      .filter((memo): memo is Memo => memo !== null && memo.sno > 0);

    return { memos };
  }

  // Status override methods
  private getStatusOverrides(): MemoStatusOverride[] {
    const data = localStorage.getItem(this.MEMO_STATUS_OVERRIDES_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  updateMemoStatus(sno: number, status: boolean): void {
    const overrides = this.getStatusOverrides();
    const existingIndex = overrides.findIndex((o: MemoStatusOverride) => o.sno === sno);

    const override: MemoStatusOverride = {
      sno,
      status,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }

    localStorage.setItem(this.MEMO_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  }
}
