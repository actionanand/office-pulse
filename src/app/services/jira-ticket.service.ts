import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { JiraTicket, JiraTicketData, JiraTicketStatusOverride } from '../models/jira-ticket.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JiraTicketService {
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly TICKETS_BY_ME_SHEET_GID = environment.TICKETS_BY_ME_SHEET_GID;
  private readonly STATUS_OVERRIDES_KEY = 'jira_ticket_status_overrides';
  private http = inject(HttpClient);

  // Cache for ticket data
  private cachedData = signal<JiraTicketData | null>(null);
  private lastFetchTime = signal<Date | null>(null);
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Fetch Jira tickets from Google Sheets
   */
  fetchTickets(): Observable<JiraTicketData> {
    // Check cache first
    const cached = this.cachedData();
    const lastFetch = this.lastFetchTime();

    if (cached && lastFetch) {
      const now = new Date();
      if (now.getTime() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return of(cached);
      }
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.TICKETS_BY_ME_SHEET_GID}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => {
        const data = this.parseTicketResponse(response);

        // Cleanup orphaned status overrides
        const apiUrls = data.tickets.map(t => t.url);
        this.cleanupOrphanedOverrides(apiUrls);

        this.cachedData.set(data);
        this.lastFetchTime.set(new Date());
        return data;
      }),
      catchError(error => {
        console.error('Error fetching Jira tickets:', error);
        // Don't cleanup on error - return empty array
        return of({ tickets: [] });
      }),
    );
  }

  /**
   * Parse Google Sheets JSON response
   */
  private parseTicketResponse(response: string): JiraTicketData {
    try {
      // Remove the wrapper: google.visualization.Query.setResponse({...})
      const jsonMatch = response.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (!jsonMatch) {
        console.error('Invalid response format');
        return { tickets: [] };
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      const rows = jsonData.table?.rows || [];

      const tickets: JiraTicket[] = [];
      const statusOverrides = this.getStatusOverrides();

      // Process all rows (skip rows with null S No)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];

        // Get cell values safely
        // Columns: S No, Url, Title, Team, Comments, Status (boolean)
        const sno = cells[0]?.v;
        const url = cells[1]?.v;
        const title = cells[2]?.v;
        const team = cells[3]?.v;
        const comments = cells[4]?.v;
        let status = cells[5]?.v; // boolean: true = Completed, false = Open

        // Only add to tickets if we have valid data (skip rows with null S No)
        if (sno && url && title) {
          // Override status from local storage if exists
          const override = statusOverrides.find((o: JiraTicketStatusOverride) => o.url === url?.toString());
          if (override !== undefined) {
            status = override.status;
          }

          tickets.push({
            sno: typeof sno === 'number' ? sno : parseInt(sno) || i + 1,
            url: url.toString(),
            title: title.toString(),
            team: team?.toString() || '',
            comments: comments?.toString() || '',
            status: Boolean(status), // Ensure boolean type
          });
        }
      }

      return { tickets };
    } catch (error) {
      console.error('Error parsing ticket response:', error);
      return { tickets: [] };
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
          year: 'numeric',
        });
      }
    }

    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return date.toString();
    }
  }

  /**
   * Get status overrides from local storage
   */
  private getStatusOverrides(): JiraTicketStatusOverride[] {
    const data = localStorage.getItem(this.STATUS_OVERRIDES_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Update ticket status in local storage
   */
  updateTicketStatus(url: string, status: boolean): void {
    const overrides = this.getStatusOverrides();
    const existingIndex = overrides.findIndex((o: JiraTicketStatusOverride) => o.url === url);

    const override: JiraTicketStatusOverride = {
      url,
      status,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }

    localStorage.setItem(this.STATUS_OVERRIDES_KEY, JSON.stringify(overrides));

    // Update cached data if exists
    const cached = this.cachedData();
    if (cached) {
      const ticket = cached.tickets.find((t: JiraTicket) => t.url === url);
      if (ticket) {
        ticket.status = status;
        this.cachedData.set({ ...cached });
      }
    }
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.cachedData.set(null);
    this.lastFetchTime.set(null);
  }

  /**
   * Remove status overrides for tickets that no longer exist in API response
   */
  private cleanupOrphanedOverrides(apiUrls: string[]): void {
    const statusOverrides = this.getStatusOverrides();
    const validOverrides = statusOverrides.filter((o: JiraTicketStatusOverride) => apiUrls.includes(o.url));

    if (validOverrides.length !== statusOverrides.length) {
      localStorage.setItem(this.STATUS_OVERRIDES_KEY, JSON.stringify(validOverrides));
    }
  }

  /**
   * Get total ticket count from S No column
   */
  getTotalTicketCount(data: JiraTicketData): number {
    return data.tickets.length;
  }
}
