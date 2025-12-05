import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Holiday, HolidayMeta, HolidayData } from '../models/holiday.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly HOLIDAY_SHEET_GID = environment.HOLIDAY_SHEET_GID;
  private http = inject(HttpClient);

  // Cache for holiday data
  private cachedData = signal<HolidayData | null>(null);
  private lastFetchTime = signal<Date | null>(null);
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Fetch holidays from Google Sheets
   */
  fetchHolidays(): Observable<HolidayData> {
    // Check cache first
    const cached = this.cachedData();
    const lastFetch = this.lastFetchTime();
    
    if (cached && lastFetch) {
      const now = new Date();
      if (now.getTime() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return of(cached);
      }
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.HOLIDAY_SHEET_GID}`;
    
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        const data = this.parseHolidayResponse(response);
        this.cachedData.set(data);
        this.lastFetchTime.set(new Date());
        return data;
      }),
      catchError(error => {
        console.error('Error fetching holidays:', error);
        return of(this.getDefaultHolidayData());
      })
    );
  }

  /**
   * Parse Google Sheets JSON response
   */
  private parseHolidayResponse(response: string): HolidayData {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return this.getDefaultHolidayData();
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];
      
      const holidays: Holiday[] = [];
      const meta: HolidayMeta = {
        title: 'Office Holidays',
        year: new Date().getFullYear().toString(),
        notes: []
      };

      // Process all rows (no header row in data rows, it's in cols)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];
        
        // Get cell values safely
        const sno = cells[0]?.v;
        const name = cells[1]?.v;
        const date = cells[2]?.v || cells[2]?.f; // Use formatted value if available
        const day = cells[3]?.v;
        const metaValue = cells[4]?.v;

        // Process meta column
        if (metaValue) {
          if (i === 0) {
            // First data row meta = title
            meta.title = metaValue;
          } else if (i === 1) {
            // Second data row meta = year
            meta.year = metaValue.toString();
          } else {
            // Other rows with meta = notes/comments
            meta.notes.push(metaValue);
          }
        }

        // Only add to holidays if we have valid data
        if (sno && name && date && day) {
          holidays.push({
            sno: typeof sno === 'number' ? sno : parseInt(sno) || i,
            name: name.toString(),
            date: this.formatDate(date),
            day: day.toString()
          });
        }
      }

      return { holidays, meta };
    } catch (error) {
      console.error('Error parsing holiday response:', error);
      return this.getDefaultHolidayData();
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
   * Get default holiday data when fetch fails
   */
  private getDefaultHolidayData(): HolidayData {
    return {
      holidays: [],
      meta: {
        title: 'Office Holidays',
        year: new Date().getFullYear().toString(),
        notes: ['Unable to fetch holiday data. Please try again later.']
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
