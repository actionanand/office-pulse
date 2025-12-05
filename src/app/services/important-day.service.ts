import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { ImportantDay, ImportantDayMeta, ImportantDayData } from '../models/important-day.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImportantDayService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly IMP_DAYS_SHEET_GID = environment.IMP_DAYS_SHEET_GID;
  private http = inject(HttpClient);

  // Cache for important days data
  private cachedData = signal<ImportantDayData | null>(null);
  private lastFetchTime = signal<Date | null>(null);
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Fetch important days from Google Sheets
   */
  fetchImportantDays(): Observable<ImportantDayData> {
    // Check cache first
    const cached = this.cachedData();
    const lastFetch = this.lastFetchTime();
    
    if (cached && lastFetch) {
      const now = new Date();
      if (now.getTime() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return of(cached);
      }
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.IMP_DAYS_SHEET_GID}`;
    
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        const data = this.parseImportantDaysResponse(response);
        this.cachedData.set(data);
        this.lastFetchTime.set(new Date());
        return data;
      }),
      catchError(error => {
        console.error('Error fetching important days:', error);
        return of(this.getDefaultImportantDayData());
      })
    );
  }

  /**
   * Parse Google Sheets JSON response
   * Columns: S No, Important Day, Tamil Day, Date, Day, Meta
   * Meta: Row 0 = year, remaining rows with meta = notes
   */
  private parseImportantDaysResponse(response: string): ImportantDayData {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return this.getDefaultImportantDayData();
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];
      
      const days: ImportantDay[] = [];
      const meta: ImportantDayMeta = {
        year: new Date().getFullYear().toString(),
        notes: []
      };

      // Process all rows (no header row in data rows, it's in cols)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];
        
        // Get cell values safely
        // Columns: S No (0), Important Day (1), Date (2), Day (3), Tamil Day (4), Meta (5)
        const sno = cells[0]?.v;
        const name = cells[1]?.v;
        const date = cells[2]?.v || cells[2]?.f; // Use formatted value if available
        const day = cells[3]?.v || '';           // Optional - may be null
        const tamilDay = cells[4]?.v || '';      // Optional - may be null
        const metaValue = cells[5]?.v;

        // Process meta column
        if (metaValue) {
          if (i === 0) {
            // First data row meta = year
            meta.year = metaValue.toString();
          } else {
            // Other rows with meta = notes/comments
            meta.notes.push(metaValue);
          }
        }

        // Only add to days if we have S No, name, and date (day and tamilDay are optional)
        if (sno && name && date) {
          days.push({
            sno: typeof sno === 'number' ? sno : parseInt(sno) || i + 1,
            name: name.toString(),
            date: this.formatDate(date),
            day: day ? day.toString() : '',
            tamilDay: tamilDay ? tamilDay.toString() : ''
          });
        }
      }

      return { days, meta };
    } catch (error) {
      console.error('Error parsing important days response:', error);
      return this.getDefaultImportantDayData();
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: string | Date): string {
    if (!date) return '';
    
    // If it's already a formatted string, return as is
    if (typeof date === 'string' && !date.includes('Date(')) {
      return date;
    }
    
    // Handle Google Sheets Date format: Date(year, month, day)
    if (typeof date === 'string' && date.includes('Date(')) {
      const match = date.match(/Date\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]); // 0-indexed in JS
        const day = parseInt(match[3]);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-IN', { 
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }
    
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return date.toString();
    }
  }

  /**
   * Get default data when fetch fails
   */
  private getDefaultImportantDayData(): ImportantDayData {
    return {
      days: [],
      meta: {
        year: new Date().getFullYear().toString(),
        notes: ['Unable to fetch important days data. Please try again later.']
      }
    };
  }

  /**
   * Clear cached data to force refresh
   */
  clearCache(): void {
    this.cachedData.set(null);
    this.lastFetchTime.set(null);
  }
}
