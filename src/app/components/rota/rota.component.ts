import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RotaService } from '../../services/rota.service';
import { Rota, RotaMeta } from '../../models/rota.model';

@Component({
  selector: 'app-rota',
  imports: [CommonModule],
  templateUrl: './rota.component.html',
  styleUrl: './rota.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotaComponent implements OnInit {
  private rotaService = inject(RotaService);

  readonly rotas = signal<Rota[]>([]);
  readonly meta = signal<RotaMeta>({
    title: 'Rota Schedule',
    notes: [],
  });
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  ngOnInit(): void {
    this.loadRotas();
  }

  loadRotas(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.rotaService.fetchRotas().subscribe({
      next: data => {
        this.rotas.set(data.rotas);
        this.meta.set(data.meta);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading rotas:', err);
        this.error.set('Failed to load rota schedule. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  refreshData(): void {
    this.rotaService.clearCache();
    this.loadRotas();
  }

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || '';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getRotaDescription(rota: Rota): string {
    const parts: string[] = [];

    // "You are on [category]"
    if (rota.category) {
      parts.push(`You are on <span class="highlight-category">${rota.category}</span>`);
    } else {
      parts.push('You are on <span class="highlight-category">duty</span>');
    }

    // "with [others]"
    if (rota.othersInvolved) {
      parts.push(`with <span class="highlight-people">${rota.othersInvolved}</span>`);
    }

    // "during/on [time]"
    if (rota.dateRange) {
      parts.push(`during <span class="highlight-date">${rota.dateRange}</span>`);
    } else if (rota.date) {
      parts.push(`on <span class="highlight-date">${this.formatDate(rota.date)}</span>`);
    } else if (rota.month) {
      parts.push(`in <span class="highlight-date">${this.getMonthName(rota.month)}</span>`);
    }

    return parts.join(' ');
  }

  hasTimeInfo(rota: Rota): boolean {
    return !!(rota.month || rota.date || rota.dateRange);
  }
}
