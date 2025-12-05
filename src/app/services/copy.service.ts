import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { CopyItem, CopyFormData } from '../models/utilities.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CopyService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly COPY_SHEET_GID = environment.COPY_SHEET_GID;
  private readonly COPY_FORM_ID = environment.COPY_FORM_ID;
  private http = inject(HttpClient);

  // Form field IDs from prefilled URL
  private readonly FORM_FIELDS = {
    link: 'entry.2117199076',
    comment: 'entry.1175965496'
  };

  // Cache for copy data
  private cachedData = signal<CopyItem[] | null>(null);
  private lastFetchTime = signal<Date | null>(null);
  private readonly CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes cache

  /**
   * Fetch copied items from Google Sheets
   */
  fetchCopiedItems(): Observable<CopyItem[]> {
    // Check cache first
    const cached = this.cachedData();
    const lastFetch = this.lastFetchTime();
    
    if (cached && lastFetch) {
      const now = new Date();
      if (now.getTime() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return of(cached);
      }
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.COPY_SHEET_GID}`;
    
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        const data = this.parseCopyResponse(response);
        this.cachedData.set(data);
        this.lastFetchTime.set(new Date());
        return data;
      }),
      catchError(error => {
        console.error('Error fetching copied items:', error);
        return of([]);
      })
    );
  }

  /**
   * Parse Google Sheets JSON response
   * Expected columns: Timestamp, Link, Comment
   */
  private parseCopyResponse(response: string): CopyItem[] {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return [];
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];
      
      const items: CopyItem[] = [];

      // Process all rows (most recent first)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];
        
        // Get cell values safely
        // Columns: Timestamp (0), Link (1), Comment (2)
        const timestamp = cells[0]?.v || cells[0]?.f || '';
        const link = cells[1]?.v || '';
        const comment = cells[2]?.v || '';

        // Add if we have at least link or comment
        if (link || comment) {
          items.push({
            timestamp: this.formatTimestamp(timestamp),
            link: link.toString(),
            comment: comment.toString()
          });
        }
      }

      // Return most recent first
      return items.reverse();
    } catch (error) {
      console.error('Error parsing copy response:', error);
      return [];
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: string | Date): string {
    if (!timestamp) return '';
    
    // Handle Google Sheets Date format: Date(year, month, day, hour, min, sec)
    if (typeof timestamp === 'string' && timestamp.includes('Date(')) {
      const match = timestamp.match(/Date\((\d+),\s*(\d+),\s*(\d+),?\s*(\d+)?,?\s*(\d+)?,?\s*(\d+)?\)/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const hour = parseInt(match[4] || '0');
        const min = parseInt(match[5] || '0');
        const sec = parseInt(match[6] || '0');
        const d = new Date(year, month, day, hour, min, sec);
        return d.toLocaleString('en-IN', { 
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    try {
      const d = new Date(timestamp);
      return d.toLocaleString('en-IN', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp.toString();
    }
  }

  /**
   * Generate prefilled Google Form URL
   */
  generateFormUrl(data?: CopyFormData, embedded: boolean = false): string {
    const baseUrl = `https://docs.google.com/forms/d/e/${this.COPY_FORM_ID}/viewform`;
    
    const params = new URLSearchParams();
    params.set('usp', 'pp_url');
    
    if (embedded) {
      params.set('embedded', 'true');
    }
    
    if (data) {
      if (data.link) {
        params.set(this.FORM_FIELDS.link, data.link);
      }
      if (data.comment) {
        params.set(this.FORM_FIELDS.comment, data.comment);
      }
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Clear cached data to force refresh
   */
  clearCache(): void {
    this.cachedData.set(null);
    this.lastFetchTime.set(null);
  }
}
