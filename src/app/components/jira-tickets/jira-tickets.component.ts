import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraTicketService } from '../../services/jira-ticket.service';
import { JiraTicket } from '../../models/jira-ticket.model';

@Component({
  selector: 'app-jira-tickets',
  imports: [CommonModule, FormsModule],
  templateUrl: './jira-tickets.component.html',
  styleUrls: ['./jira-tickets.component.scss'],
})
export class JiraTicketsComponent implements OnInit {
  private jiraTicketService = inject(JiraTicketService);

  // Expose Math to template
  protected readonly Math = Math;

  // State
  allTickets = signal<JiraTicket[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  itemsPerPage = 25;

  // Computed values
  totalPages = computed(() => Math.ceil(this.allTickets().length / this.itemsPerPage));

  paginatedTickets = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.allTickets().slice(start, end);
  });

  totalTickets = computed(() => this.allTickets().length);

  // Status options for dropdown (boolean: true = Completed, false = Open)
  statusOptions = [
    { label: 'Open', value: false },
    { label: 'Completed', value: true },
  ];

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.jiraTicketService.fetchTickets().subscribe({
      next: data => {
        this.allTickets.set(data.tickets);
        this.loading.set(false);
      },
      error: err => {
        console.error('Error loading tickets:', err);
        this.error.set('Failed to load tickets. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  onStatusChange(ticket: JiraTicket, newStatus: boolean): void {
    this.jiraTicketService.updateTicketStatus(ticket.url, newStatus);

    // Update the ticket in the local array
    const tickets = this.allTickets();
    const index = tickets.findIndex((t: JiraTicket) => t.url === ticket.url);
    if (index >= 0) {
      tickets[index] = { ...ticket, status: newStatus };
      this.allTickets.set([...tickets]);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  refresh(): void {
    this.jiraTicketService.clearCache();
    this.loadTickets();
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, current - 1);
    const rangeEnd = Math.min(total - 1, current + 1);

    // Add ellipsis if needed
    if (rangeStart > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add pages around current
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add ellipsis if needed
    if (rangeEnd < total - 1) {
      pages.push(-1);
    }

    // Always show last page if there's more than one page
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  getTeamClass(team: string | undefined): string {
    if (!team) return '';
    // You can add team-specific styling here if needed
    return '';
  }

  getStatusClass(status: boolean): string {
    return status ? 'status-completed' : 'status-open';
  }

  getStatusLabel(status: boolean): string {
    return status ? 'Completed' : 'Open';
  }
}
