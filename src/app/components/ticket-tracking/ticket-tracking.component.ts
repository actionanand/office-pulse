import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketTrackingService } from '../../services/ticket-tracking.service';
import { SnackbarService } from '../../services/snackbar.service';
import { DemoTicket, ReleaseTicket, SpilloverTicket, TrackedTicket } from '../../models/ticket-tracking.model';

type TabType = 'demo' | 'release' | 'spillover' | 'tracked';

@Component({
  selector: 'app-ticket-tracking',
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-tracking.component.html',
  styleUrls: ['./ticket-tracking.component.scss'],
})
export class TicketTrackingComponent implements OnInit {
  private ticketTrackingService = inject(TicketTrackingService);
  private snackbarService = inject(SnackbarService);

  // Status options for dropdown (boolean: true = Completed, false = Open)
  statusOptions = [
    { label: 'Open', value: false },
    { label: 'Completed', value: true },
  ];

  // State
  activeTab = signal<TabType>('demo');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  demoTickets = signal<DemoTicket[]>([]);
  releaseTickets = signal<ReleaseTicket[]>([]);
  spilloverTickets = signal<SpilloverTicket[]>([]);
  trackedTickets = signal<TrackedTicket[]>([]);

  selectedDemoTickets = signal<Set<number>>(new Set());
  selectedReleaseTickets = signal<Set<number>>(new Set());
  selectedSpilloverTickets = signal<Set<number>>(new Set());
  selectedTrackedTickets = signal<Set<number>>(new Set());

  hoveredCell = signal<string | null>(null);

  // Computed values
  demoTicketsCount = computed(() => this.demoTickets().length);
  releaseTicketsCount = computed(() => this.releaseTickets().length);
  spilloverTicketsCount = computed(() => this.spilloverTickets().length);
  trackedTicketsCount = computed(() => this.trackedTickets().length);

  selectedDemoCount = computed(() => this.selectedDemoTickets().size);
  selectedReleaseCount = computed(() => this.selectedReleaseTickets().size);
  selectedSpilloverCount = computed(() => this.selectedSpilloverTickets().size);
  selectedTrackedCount = computed(() => this.selectedTrackedTickets().size);

  // Select all computeds
  allDemoSelected = computed(
    () => this.demoTickets().length > 0 && this.selectedDemoTickets().size === this.demoTickets().length,
  );
  allReleaseSelected = computed(
    () => this.releaseTickets().length > 0 && this.selectedReleaseTickets().size === this.releaseTickets().length,
  );
  allSpilloverSelected = computed(
    () => this.spilloverTickets().length > 0 && this.selectedSpilloverTickets().size === this.spilloverTickets().length,
  );
  allTrackedSelected = computed(
    () => this.trackedTickets().length > 0 && this.selectedTrackedTickets().size === this.trackedTickets().length,
  );

  ngOnInit(): void {
    this.loadAllTickets();
  }

  loadAllTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.ticketTrackingService.fetchDemoTickets().toPromise(),
      this.ticketTrackingService.fetchReleaseTickets().toPromise(),
      this.ticketTrackingService.fetchSpilloverTickets().toPromise(),
      this.ticketTrackingService.fetchTrackedTickets().toPromise(),
    ])
      .then(([demo, release, spillover, tracked]) => {
        this.demoTickets.set(demo?.tickets || []);
        this.releaseTickets.set(release?.tickets || []);
        this.spilloverTickets.set(spillover?.tickets || []);
        this.trackedTickets.set(tracked?.tickets || []);
        this.loading.set(false);
      })
      .catch(err => {
        console.error('Error loading tickets:', err);
        this.error.set('Failed to load tickets. Please try again later.');
        this.loading.set(false);
      });
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  refresh(): void {
    this.ticketTrackingService.clearCache();
    this.loadAllTickets();
  }

  // Status change methods
  onDemoStatusChange(ticket: DemoTicket, newStatus: boolean): void {
    const boolStatus = typeof newStatus === 'string' ? newStatus === 'true' : newStatus;

    this.ticketTrackingService.updateDemoTicketStatus(ticket.url, boolStatus);

    // Update the ticket in the local array with a new object
    const tickets = this.demoTickets();
    const updatedTickets = tickets.map((t: DemoTicket) => (t.url === ticket.url ? { ...t, status: boolStatus } : t));
    this.demoTickets.set(updatedTickets);
  }

  onTrackedStatusChange(ticket: TrackedTicket, newStatus: boolean): void {
    const boolStatus = typeof newStatus === 'string' ? newStatus === 'true' : newStatus;

    this.ticketTrackingService.updateTrackedTicketStatus(ticket.url, boolStatus);

    // Update the ticket in the local array with a new object
    const tickets = this.trackedTickets();
    const updatedTickets = tickets.map((t: TrackedTicket) => (t.url === ticket.url ? { ...t, status: boolStatus } : t));
    this.trackedTickets.set(updatedTickets);
  }

  // Selection methods
  isTicketSelected(sno: number, tab: TabType): boolean {
    switch (tab) {
      case 'demo':
        return this.selectedDemoTickets().has(sno);
      case 'release':
        return this.selectedReleaseTickets().has(sno);
      case 'spillover':
        return this.selectedSpilloverTickets().has(sno);
      case 'tracked':
        return this.selectedTrackedTickets().has(sno);
    }
  }

  toggleTicketSelection(sno: number, tab: TabType): void {
    switch (tab) {
      case 'demo': {
        const selected = new Set(this.selectedDemoTickets());
        if (selected.has(sno)) {
          selected.delete(sno);
        } else {
          selected.add(sno);
        }
        this.selectedDemoTickets.set(selected);
        break;
      }
      case 'release': {
        const selected = new Set(this.selectedReleaseTickets());
        if (selected.has(sno)) {
          selected.delete(sno);
        } else {
          selected.add(sno);
        }
        this.selectedReleaseTickets.set(selected);
        break;
      }
      case 'spillover': {
        const selected = new Set(this.selectedSpilloverTickets());
        if (selected.has(sno)) {
          selected.delete(sno);
        } else {
          selected.add(sno);
        }
        this.selectedSpilloverTickets.set(selected);
        break;
      }
      case 'tracked': {
        const selected = new Set(this.selectedTrackedTickets());
        if (selected.has(sno)) {
          selected.delete(sno);
        } else {
          selected.add(sno);
        }
        this.selectedTrackedTickets.set(selected);
        break;
      }
    }
  }

  clearSelection(tab: TabType): void {
    switch (tab) {
      case 'demo':
        this.selectedDemoTickets.set(new Set());
        break;
      case 'release':
        this.selectedReleaseTickets.set(new Set());
        break;
      case 'spillover':
        this.selectedSpilloverTickets.set(new Set());
        break;
      case 'tracked':
        this.selectedTrackedTickets.set(new Set());
        break;
    }
  }

  toggleSelectAll(tab: TabType): void {
    switch (tab) {
      case 'demo': {
        if (this.allDemoSelected()) {
          this.selectedDemoTickets.set(new Set());
        } else {
          const allSno = new Set(this.demoTickets().map((t: DemoTicket) => t.sno));
          this.selectedDemoTickets.set(allSno);
        }
        break;
      }
      case 'release': {
        if (this.allReleaseSelected()) {
          this.selectedReleaseTickets.set(new Set());
        } else {
          const allSno = new Set(this.releaseTickets().map((t: ReleaseTicket) => t.sno));
          this.selectedReleaseTickets.set(allSno);
        }
        break;
      }
      case 'spillover': {
        if (this.allSpilloverSelected()) {
          this.selectedSpilloverTickets.set(new Set());
        } else {
          const allSno = new Set(this.spilloverTickets().map((t: SpilloverTicket) => t.sno));
          this.selectedSpilloverTickets.set(allSno);
        }
        break;
      }
      case 'tracked': {
        if (this.allTrackedSelected()) {
          this.selectedTrackedTickets.set(new Set());
        } else {
          const allSno = new Set(this.trackedTickets().map((t: TrackedTicket) => t.sno));
          this.selectedTrackedTickets.set(allSno);
        }
        break;
      }
    }
  }

  // Copy methods
  copySelectedTickets(): void {
    const tab = this.activeTab();
    switch (tab) {
      case 'demo':
        this.copyDemoTickets();
        break;
      case 'release':
        this.copyReleaseTickets();
        break;
      case 'spillover':
        this.copySpilloverTickets();
        break;
      case 'tracked':
        this.copyTrackedTickets();
        break;
    }
  }

  private copyDemoTickets(): void {
    const selected = this.selectedDemoTickets();
    const tickets = this.demoTickets().filter((t: DemoTicket) => selected.has(t.sno));

    if (tickets.length === 0) return;

    let copyText = '';
    tickets.forEach((ticket: DemoTicket, index: number) => {
      copyText += `${index + 1}. \n`;
      copyText += `Title: ${ticket.title}\n`;
      copyText += `URL: ${ticket.url}\n`;
      copyText += `Status: ${ticket.status ? 'Completed' : 'Open'}\n`;
      copyText += `___________\n\n`;
    });

    this.copyToClipboard(copyText, tickets.length);
    this.clearSelection('demo');
  }

  private copyReleaseTickets(): void {
    const selected = this.selectedReleaseTickets();
    const tickets = this.releaseTickets().filter((t: ReleaseTicket) => selected.has(t.sno));

    if (tickets.length === 0) return;

    let copyText = '';
    tickets.forEach((ticket: ReleaseTicket, index: number) => {
      copyText += `${index + 1}. \n`;
      copyText += `Title: ${ticket.title}\n`;
      copyText += `URL: ${ticket.url}\n`;
      copyText += `Component Name: ${ticket.componentName}\n`;
      copyText += `Deployment Type: ${ticket.deploymentType}\n`;
      copyText += `Version Number: ${ticket.versionNumber || 'N/A'}\n`;
      copyText += `___________\n\n`;
    });

    this.copyToClipboard(copyText, tickets.length);
    this.clearSelection('release');
  }

  copyReleaseTicketsSpecialized(): void {
    const selected = this.selectedReleaseTickets();
    const tickets = this.releaseTickets().filter((t: ReleaseTicket) => selected.has(t.sno));

    if (tickets.length === 0) return;

    // Group tickets by deployment type
    const groupedTickets: Record<string, ReleaseTicket[]> = {};
    const jiraUrls: string[] = [];

    tickets.forEach((ticket: ReleaseTicket) => {
      // Collect non-null URLs
      if (ticket.url && ticket.url.trim()) {
        jiraUrls.push(ticket.url.trim());
      }

      // Skip tickets without deployment type
      if (!ticket.deploymentType || !ticket.deploymentType.trim()) {
        return;
      }

      const deploymentType = ticket.deploymentType.trim();
      if (!groupedTickets[deploymentType]) {
        groupedTickets[deploymentType] = [];
      }
      groupedTickets[deploymentType].push(ticket);
    });

    // Build the formatted text
    let copyText = '';

    // Sort deployment types alphabetically
    const sortedDeploymentTypes = Object.keys(groupedTickets).sort();

    sortedDeploymentTypes.forEach((deploymentType, index) => {
      copyText += `${deploymentType}:\n`;

      groupedTickets[deploymentType].forEach((ticket: ReleaseTicket) => {
        const componentName = ticket.componentName || '';
        const versionNumber = ticket.versionNumber || '';
        copyText += `${componentName}\t\t#${versionNumber}\n`;
      });

      // Add spacing between groups
      if (index < sortedDeploymentTypes.length - 1) {
        copyText += '\n\n';
      }
    });

    // Add Jira URLs at the end if any exist
    if (jiraUrls.length > 0) {
      copyText += '\n\nJira: ';
      copyText += jiraUrls.join(',\n');
    }

    this.copyToClipboard(copyText, tickets.length);
    this.clearSelection('release');
  }

  private copySpilloverTickets(): void {
    const selected = this.selectedSpilloverTickets();
    const tickets = this.spilloverTickets().filter((t: SpilloverTicket) => selected.has(t.sno));

    if (tickets.length === 0) return;

    let copyText = '';
    tickets.forEach((ticket: SpilloverTicket, index: number) => {
      copyText += `${index + 1}. \n`;
      copyText += `Title: ${ticket.title}\n`;
      copyText += `URL: ${ticket.url}\n`;
      copyText += `Reason for Spilling: ${ticket.reasonForSpilling}\n`;
      copyText += `Solution: ${ticket.solution}\n`;
      copyText += `Support Tickets Created: ${ticket.supportTicketsCreated || 'N/A'}\n`;
      copyText += `Impediment: ${ticket.impediment || 'N/A'}\n`;
      copyText += `___________\n\n`;
    });

    this.copyToClipboard(copyText, tickets.length);
    this.clearSelection('spillover');
  }

  private copyTrackedTickets(): void {
    const selected = this.selectedTrackedTickets();
    const tickets = this.trackedTickets().filter((t: TrackedTicket) => selected.has(t.sno));

    if (tickets.length === 0) return;

    let copyText = '';
    tickets.forEach((ticket: TrackedTicket, index: number) => {
      copyText += `${index + 1}. \n`;
      copyText += `Title: ${ticket.title}\n`;
      copyText += `URL: ${ticket.url}\n`;
      copyText += `Status: ${ticket.status ? 'Completed' : 'Open'}\n`;
      copyText += `___________\n\n`;
    });

    this.copyToClipboard(copyText, tickets.length);
    this.clearSelection('tracked');
  }

  private copyToClipboard(text: string, count: number): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.snackbarService.success(`Copied ${count} ticket${count > 1 ? 's' : ''} to clipboard`);
      },
      err => {
        console.error('Failed to copy:', err);
        this.snackbarService.error('Failed to copy tickets to clipboard');
      },
    );
  }

  // Hover copy methods
  setHoveredCell(cellId: string | null): void {
    this.hoveredCell.set(cellId);
  }

  copyCellContent(content: string | number | boolean | null, event: Event): void {
    event.stopPropagation();

    if (content === null || content === undefined) {
      this.snackbarService.error('No content to copy');
      return;
    }

    const textToCopy = String(content);

    navigator.clipboard.writeText(textToCopy).then(
      () => {
        this.snackbarService.success('Copied to clipboard');
      },
      err => {
        console.error('Failed to copy:', err);
        this.snackbarService.error('Failed to copy to clipboard');
      },
    );
  }

  getStatusLabel(status: boolean): string {
    return status ? 'Completed' : 'Open';
  }

  getStatusClass(status: boolean): string {
    return status ? 'status-completed' : 'status-open';
  }
}
