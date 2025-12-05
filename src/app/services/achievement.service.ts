import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Achievement, AchievementsByYear, AchievementFormData } from '../models/achievement.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly ACHIEVEMENT_SHEET_GID = environment.ACHIEVEMENT_SHEET_GID;
  private readonly ACHIEVEMENT_FORM_ID = environment.ACHIEVEMENT_FORM_ID;
  private http = inject(HttpClient);

  // Form field IDs from prefilled URL
  private readonly FORM_FIELDS = {
    title: 'entry.1476176768',
    link: 'entry.189630405',
    date: 'entry.635455555',
    comments: 'entry.225820981'
  };

  // Cache for achievement data
  private cachedData = signal<AchievementsByYear[] | null>(null);
  private lastFetchTime = signal<Date | null>(null);
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Fetch achievements from Google Sheets
   */
  fetchAchievements(): Observable<AchievementsByYear[]> {
    // Check cache first
    const cached = this.cachedData();
    const lastFetch = this.lastFetchTime();
    
    if (cached && lastFetch) {
      const now = new Date();
      if (now.getTime() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return of(cached);
      }
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.ACHIEVEMENT_SHEET_GID}`;
    
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        const data = this.parseAchievementResponse(response);
        this.cachedData.set(data);
        this.lastFetchTime.set(new Date());
        return data;
      }),
      catchError(error => {
        console.error('Error fetching achievements:', error);
        return of([]);
      })
    );
  }

  /**
   * Parse Google Sheets JSON response
   * Expected columns: S No, Title, Link, Date, Comments
   */
  private parseAchievementResponse(response: string): AchievementsByYear[] {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return [];
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];
      
      const achievements: Achievement[] = [];

      // Process all rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];
        
        // Get cell values safely
        // Columns: S No (0), Title (1), Link (2), Date (3), Comments (4)
        const sno = cells[0]?.v;
        const title = cells[1]?.v;
        const link = cells[2]?.v || '';
        const dateValue = cells[3]?.v || cells[3]?.f || '';
        const comments = cells[4]?.v || '';

        // Only add if we have at least S No and title
        if (sno && title) {
          const formattedDate = this.formatDate(dateValue);
          const year = this.extractYear(dateValue);
          
          achievements.push({
            sno: typeof sno === 'number' ? sno : parseInt(sno) || i + 1,
            title: title.toString(),
            link: link.toString(),
            date: formattedDate,
            comments: comments.toString(),
            year: year
          });
        }
      }

      // Group achievements by year (descending order)
      return this.groupByYear(achievements);
    } catch (error) {
      console.error('Error parsing achievement response:', error);
      return [];
    }
  }

  /**
   * Group achievements by year in descending order
   */
  private groupByYear(achievements: Achievement[]): AchievementsByYear[] {
    const grouped = new Map<number, Achievement[]>();
    
    achievements.forEach(achievement => {
      const year = achievement.year;
      if (!grouped.has(year)) {
        grouped.set(year, []);
      }
      grouped.get(year)!.push(achievement);
    });

    // Convert to array and sort by year descending
    return Array.from(grouped.entries())
      .map(([year, items]) => ({
        year,
        achievements: items.sort((a, b) => {
          // Sort by date descending within year, then by sno
          const dateA = new Date(a.date || '').getTime() || 0;
          const dateB = new Date(b.date || '').getTime() || 0;
          if (dateB !== dateA) return dateB - dateA;
          return b.sno - a.sno;
        })
      }))
      .sort((a, b) => b.year - a.year);
  }

  /**
   * Extract year from date value
   */
  private extractYear(dateValue: string | Date): number {
    if (!dateValue) return new Date().getFullYear();
    
    // Handle Google Sheets Date format: Date(year, month, day)
    if (typeof dateValue === 'string' && dateValue.includes('Date(')) {
      const match = dateValue.match(/Date\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    try {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        return d.getFullYear();
      }
    } catch {
      // Fall through to default
    }
    
    return new Date().getFullYear();
  }

  /**
   * Format date for display
   */
  private formatDate(date: string | Date): string {
    if (!date) return '';
    
    // If it's already a formatted string without Date(), return as is
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
   * Generate prefilled Google Form URL
   * @param data - Form data to prefill
   * @param embedded - Whether to add embedded=true for iframe display
   */
  generateFormUrl(data?: AchievementFormData, embedded: boolean = false): string {
    const baseUrl = `https://docs.google.com/forms/d/e/${this.ACHIEVEMENT_FORM_ID}/viewform`;
    
    const params = new URLSearchParams();
    params.set('usp', 'pp_url');
    
    if (embedded) {
      params.set('embedded', 'true');
    }
    
    if (data) {
      if (data.title) {
        params.set(this.FORM_FIELDS.title, data.title);
      }
      if (data.link) {
        params.set(this.FORM_FIELDS.link, data.link);
      }
      if (data.date) {
        params.set(this.FORM_FIELDS.date, data.date);
      }
      if (data.comments) {
        params.set(this.FORM_FIELDS.comments, data.comments);
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
