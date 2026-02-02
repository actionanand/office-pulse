import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment.development';
import {
  DemoTicket,
  DemoTicketData,
  ReleaseTicket,
  ReleaseTicketData,
  SpilloverTicket,
  SpilloverTicketData,
  TrackedTicket,
  TrackedTicketData,
  TicketStatusOverride,
} from '../models/ticket-tracking.model';

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
export class TicketTrackingService {
  private http = inject(HttpClient);

  private readonly DEMO_STATUS_OVERRIDES_KEY = 'demo_ticket_status_overrides';
  private readonly TRACKED_STATUS_OVERRIDES_KEY = 'tracked_ticket_status_overrides';

  private demoTicketsCache$?: Observable<DemoTicketData>;
  private releaseTicketsCache$?: Observable<ReleaseTicketData>;
  private spilloverTicketsCache$?: Observable<SpilloverTicketData>;
  private trackedTicketsCache$?: Observable<TrackedTicketData>;

  fetchDemoTickets(): Observable<DemoTicketData> {
    if (!this.demoTicketsCache$) {
      const url = this.buildGVizUrl(environment.DEMO_TICKET_SHEET_GID);
      this.demoTicketsCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => {
          const data = this.parseDemoTickets(response);

          // Cleanup orphaned status overrides for demo tickets
          const apiSNos = data.tickets.map((t: DemoTicket) => t.sno);
          this.cleanupDemoTicketOverrides(apiSNos);

          return data;
        }),
        catchError((error: unknown) => {
          console.error('Error fetching demo tickets:', error);
          // Don't cleanup on error
          return of({ tickets: [] });
        }),
        shareReplay(1),
      );
    }
    return this.demoTicketsCache$;
  }

  fetchReleaseTickets(): Observable<ReleaseTicketData> {
    if (!this.releaseTicketsCache$) {
      const url = this.buildGVizUrl(environment.RELEASE_TICKETS_SHEET_GID);
      this.releaseTicketsCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseReleaseTickets(response)),
        catchError((error: unknown) => {
          console.error('Error fetching release tickets:', error);
          return of({ tickets: [] });
        }),
        shareReplay(1),
      );
    }
    return this.releaseTicketsCache$;
  }

  fetchSpilloverTickets(): Observable<SpilloverTicketData> {
    if (!this.spilloverTicketsCache$) {
      const url = this.buildGVizUrl(environment.SPILLOVER_TICKETS_SHEET_GID);
      this.spilloverTicketsCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => this.parseSpilloverTickets(response)),
        catchError((error: unknown) => {
          console.error('Error fetching spillover tickets:', error);
          return of({ tickets: [] });
        }),
        shareReplay(1),
      );
    }
    return this.spilloverTicketsCache$;
  }

  fetchTrackedTickets(): Observable<TrackedTicketData> {
    if (!this.trackedTicketsCache$) {
      const url = this.buildGVizUrl(environment.TICKETS_TO_TRACK_SHEET_GID);
      this.trackedTicketsCache$ = this.http.get(url, { responseType: 'text' }).pipe(
        map((response: string) => {
          const data = this.parseTrackedTickets(response);

          // Cleanup orphaned status overrides for tracked tickets
          const apiSNos = data.tickets.map((t: TrackedTicket) => t.sno);
          this.cleanupTrackedTicketOverrides(apiSNos);

          return data;
        }),
        catchError((error: unknown) => {
          console.error('Error fetching tracked tickets:', error);
          // Don't cleanup on error
          return of({ tickets: [] });
        }),
        shareReplay(1),
      );
    }
    return this.trackedTicketsCache$;
  }

  clearCache(): void {
    this.demoTicketsCache$ = undefined;
    this.releaseTicketsCache$ = undefined;
    this.spilloverTicketsCache$ = undefined;
    this.trackedTicketsCache$ = undefined;
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

  private parseDemoTickets(response: string): DemoTicketData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return { tickets: [] };
    }

    const statusOverrides = this.getDemoStatusOverrides();

    const tickets: DemoTicket[] = data.table.rows
      .map(row => {
        const cells = row.c;
        // S No, Url, Title, Status
        if (!cells[0] || cells[0].v === null) return null;

        const url = (cells[1]?.v as string) || '';
        let status = cells[3]?.v === true;

        // Override status from local storage if exists
        const override = statusOverrides.find((o: TicketStatusOverride) => o.url === url);
        if (override !== undefined) {
          status = override.status;
        }

        return {
          sno: typeof cells[0]?.v === 'number' ? cells[0].v : 0,
          url,
          title: (cells[2]?.v as string) || '',
          status,
        };
      })
      .filter((ticket): ticket is DemoTicket => ticket !== null && ticket.sno > 0);

    return { tickets };
  }

  private parseReleaseTickets(response: string): ReleaseTicketData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return { tickets: [] };
    }

    const tickets: ReleaseTicket[] = data.table.rows
      .map(row => {
        const cells = row.c;
        // S No, Title, Url, Component Name, Deployment Type, Version Number
        if (!cells[0] || cells[0].v === null) return null;

        return {
          sno: typeof cells[0]?.v === 'number' ? cells[0].v : 0,
          title: (cells[1]?.v as string) || '',
          url: (cells[2]?.v as string) || '',
          componentName: (cells[3]?.v as string) || '',
          deploymentType: (cells[4]?.v as string) || '',
          versionNumber: cells[5]?.v ? String(cells[5].v) : '',
        };
      })
      .filter((ticket): ticket is ReleaseTicket => ticket !== null && ticket.sno > 0);

    return { tickets };
  }

  private parseSpilloverTickets(response: string): SpilloverTicketData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return { tickets: [] };
    }

    const tickets: SpilloverTicket[] = data.table.rows
      .map(row => {
        const cells = row.c;
        // S No, Date, Sprint Name, Title, Url, Reason for spilling, Solution, Support tickets created, Impediments
        if (!cells[0] || cells[0].v === null) return null;

        return {
          sno: typeof cells[0]?.v === 'number' ? cells[0].v : 0,
          date: (cells[1]?.f as string) || '',
          sprintName: (cells[2]?.v as string) || '',
          title: (cells[3]?.v as string) || '',
          url: (cells[4]?.v as string) || '',
          reasonForSpilling: (cells[5]?.v as string) || '',
          solution: (cells[6]?.v as string) || '',
          supportTicketsCreated: (cells[7]?.v as string) || '',
          impediment: (cells[8]?.v as string) || '',
        };
      })
      .filter((ticket): ticket is SpilloverTicket => ticket !== null && ticket.sno > 0);

    return { tickets };
  }

  private parseTrackedTickets(response: string): TrackedTicketData {
    const data = this.parseGVizResponse(response);

    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return { tickets: [] };
    }

    const statusOverrides = this.getTrackedStatusOverrides();

    const tickets: TrackedTicket[] = data.table.rows
      .map(row => {
        const cells = row.c;
        // S No, Title, Url, Status
        if (!cells[0] || cells[0].v === null) return null;

        const url = (cells[2]?.v as string) || '';
        let status = cells[3]?.v === true;

        // Override status from local storage if exists
        const override = statusOverrides.find((o: TicketStatusOverride) => o.url === url);
        if (override !== undefined) {
          status = override.status;
        }

        return {
          sno: typeof cells[0]?.v === 'number' ? cells[0].v : 0,
          title: (cells[1]?.v as string) || '',
          url,
          status,
        };
      })
      .filter((ticket): ticket is TrackedTicket => ticket !== null && ticket.sno > 0);

    return { tickets };
  }

  // Status override methods for Demo Tickets
  private getDemoStatusOverrides(): TicketStatusOverride[] {
    const data = localStorage.getItem(this.DEMO_STATUS_OVERRIDES_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  updateDemoTicketStatus(url: string, status: boolean): void {
    const overrides = this.getDemoStatusOverrides();
    const existingIndex = overrides.findIndex((o: TicketStatusOverride) => o.url === url);

    const override: TicketStatusOverride = {
      url,
      status,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }

    localStorage.setItem(this.DEMO_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  // Status override methods for Tracked Tickets
  private getTrackedStatusOverrides(): TicketStatusOverride[] {
    const data = localStorage.getItem(this.TRACKED_STATUS_OVERRIDES_KEY);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  updateTrackedTicketStatus(url: string, status: boolean): void {
    const overrides = this.getTrackedStatusOverrides();
    const existingIndex = overrides.findIndex((o: TicketStatusOverride) => o.url === url);

    const override: TicketStatusOverride = {
      url,
      status,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      overrides[existingIndex] = override;
    } else {
      overrides.push(override);
    }

    localStorage.setItem(this.TRACKED_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  /**
   * Remove status overrides for demo tickets that no longer exist in API response
   */
  private cleanupDemoTicketOverrides(apiSNos: number[]): void {
    const statusOverrides = this.getDemoStatusOverrides();
    const validOverrides = statusOverrides.filter((o: TicketStatusOverride) => {
      // Extract S No from URL (format: JIRA-123)
      const match = o.url.match(/JIRA-(\d+)/);
      if (!match) return false;
      const sno = parseInt(match[1]);
      return apiSNos.includes(sno);
    });

    if (validOverrides.length !== statusOverrides.length) {
      localStorage.setItem(this.DEMO_STATUS_OVERRIDES_KEY, JSON.stringify(validOverrides));
    }
  }

  /**
   * Remove status overrides for tracked tickets that no longer exist in API response
   */
  private cleanupTrackedTicketOverrides(apiSNos: number[]): void {
    const statusOverrides = this.getTrackedStatusOverrides();
    const validOverrides = statusOverrides.filter((o: TicketStatusOverride) => {
      // Extract S No from URL (format: JIRA-123)
      const match = o.url.match(/JIRA-(\d+)/);
      if (!match) return false;
      const sno = parseInt(match[1]);
      return apiSNos.includes(sno);
    });

    if (validOverrides.length !== statusOverrides.length) {
      localStorage.setItem(this.TRACKED_STATUS_OVERRIDES_KEY, JSON.stringify(validOverrides));
    }
  }
}
