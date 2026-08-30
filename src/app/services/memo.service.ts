import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { Memo, MemoData, MemoStatusOverride, MemoColorOverride, LocalMemo } from '../models/memo.model';
import { AppLocalDataDatabaseService } from './app-local-data-database.service';

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
  private readonly appLocalData = inject(AppLocalDataDatabaseService);

  private readonly MEMO_STATUS_OVERRIDES_KEY = 'memo_status_overrides';
  private readonly MEMO_COLOR_OVERRIDES_KEY = 'memo_color_overrides';
  private readonly LOCAL_MEMOS_KEY = 'local_memos';
  private readonly LOCAL_MEMO_START_SNO = 500;

  private memosCache$?: Observable<MemoData>;

  fetchMemos(): Observable<MemoData> {
    if (!this.memosCache$) {
      const url = this.buildGVizUrl(environment.MEMO_SHEET_GID);
      this.memosCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => {
          const data = this.parseMemos(response);

          // Cleanup orphaned overrides for API memos
          const apiSNos = data.memos.map((m: Memo) => m.sno);
          this.cleanupOrphanedOverrides(apiSNos);

          // Apply color overrides to API memos
          const colorOverrides = this.getColorOverrides();
          data.memos = data.memos.map((memo: Memo) => {
            const colorOverride = colorOverrides.find((o: MemoColorOverride) => o.sno === memo.sno);
            return colorOverride ? { ...memo, color: colorOverride.color } : memo;
          });
          return data;
        }),
        catchError((error: unknown) => {
          console.error('Error fetching memos:', error);
          // Don't cleanup on error - return empty array
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
    const data = this.appLocalData.getItem(this.MEMO_STATUS_OVERRIDES_KEY);
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

    this.appLocalData.setItem(this.MEMO_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  // Color override methods
  private getColorOverrides(): MemoColorOverride[] {
    const data = this.appLocalData.getItem(this.MEMO_COLOR_OVERRIDES_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  updateMemoColor(sno: number, color: string): void {
    const overrides = this.getColorOverrides();
    const existingIndex = overrides.findIndex((o: MemoColorOverride) => o.sno === sno);

    const override: MemoColorOverride = {
      sno,
      color,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }

    this.appLocalData.setItem(this.MEMO_COLOR_OVERRIDES_KEY, JSON.stringify(overrides));
    this.clearCache(); // Clear cache to refresh
  }

  /**
   * Remove overrides for S Nos that no longer exist in API response
   * Only removes overrides for non-local memos (S No < 500)
   */
  private cleanupOrphanedOverrides(apiSNos: number[]): void {
    // Cleanup status overrides
    const statusOverrides = this.getStatusOverrides();
    const validStatusOverrides = statusOverrides.filter(
      (o: MemoStatusOverride) => o.sno >= this.LOCAL_MEMO_START_SNO || apiSNos.includes(o.sno),
    );
    if (validStatusOverrides.length !== statusOverrides.length) {
      this.appLocalData.setItem(this.MEMO_STATUS_OVERRIDES_KEY, JSON.stringify(validStatusOverrides));
    }

    // Cleanup color overrides
    const colorOverrides = this.getColorOverrides();
    const validColorOverrides = colorOverrides.filter(
      (o: MemoColorOverride) => o.sno >= this.LOCAL_MEMO_START_SNO || apiSNos.includes(o.sno),
    );
    if (validColorOverrides.length !== colorOverrides.length) {
      this.appLocalData.setItem(this.MEMO_COLOR_OVERRIDES_KEY, JSON.stringify(validColorOverrides));
    }
  }

  // Local memos management
  getLocalMemos(): LocalMemo[] {
    const data = this.appLocalData.getItem(this.LOCAL_MEMOS_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private saveLocalMemos(memos: LocalMemo[]): void {
    this.appLocalData.setItem(this.LOCAL_MEMOS_KEY, JSON.stringify(memos));
  }

  createLocalMemo(title: string, description: string, color: string = '#ffffff'): LocalMemo {
    const localMemos = this.getLocalMemos();
    const nextSno = localMemos.length > 0 ? Math.max(...localMemos.map(m => m.sno)) + 1 : this.LOCAL_MEMO_START_SNO;

    const newMemo: LocalMemo = {
      sno: nextSno,
      title,
      description,
      status: false,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    localMemos.push(newMemo);
    this.saveLocalMemos(localMemos);
    this.clearCache(); // Clear cache to refresh

    return newMemo;
  }

  updateLocalMemo(sno: number, title: string, description: string, status: boolean, color: string = '#ffffff'): void {
    const localMemos = this.getLocalMemos();
    const index = localMemos.findIndex(m => m.sno === sno);

    if (index >= 0) {
      localMemos[index] = {
        ...localMemos[index],
        title,
        description,
        status,
        color,
        updatedAt: new Date(),
      };
      this.saveLocalMemos(localMemos);
      this.clearCache(); // Clear cache to refresh
    }
  }

  deleteLocalMemo(sno: number): void {
    const localMemos = this.getLocalMemos();
    const filtered = localMemos.filter(m => m.sno !== sno);
    this.saveLocalMemos(filtered);
    this.clearCache(); // Clear cache to refresh
  }

  getAllMemos(): Memo[] {
    // Combine API memos and local memos
    const localMemos = this.getLocalMemos();
    return localMemos.map((lm: LocalMemo) => ({
      sno: lm.sno,
      title: lm.title,
      description: lm.description,
      status: lm.status,
      color: lm.color,
      isLocal: true,
    }));
  }
}
