import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { CreditCardService } from '../../services/credit-card.service';
import { CreditCard, CreditCardAge, CreditCardSortKey, CreditCardSortDir } from '../../models/credit-card.model';

@Component({
  selector: 'app-credit-card-tracker',
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './credit-card-tracker.component.html',
  styleUrl: './credit-card-tracker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardTrackerComponent implements OnInit {
  private service = inject(CreditCardService);

  // ── view / data ─────────────────────────────────────────────────────────
  view = signal<'cards' | 'table'>('cards');
  loading = signal(true);
  error = signal<string | null>(null);
  allCards = signal<CreditCard[]>([]);

  // ── sort ─────────────────────────────────────────────────────────────────
  sortKey = signal<CreditCardSortKey>('recent');
  sortDir = signal<CreditCardSortDir>('asc');

  // ── filters (table view) ─────────────────────────────────────────────────
  filterBank = signal<string>('');
  filterAge = signal<CreditCardAge | ''>('');

  // ── derived ──────────────────────────────────────────────────────────────
  totalCards = computed(() => this.allCards().length);
  frequentCount = computed(() => this.allCards().filter((c: CreditCard) => c.frequentlyUsed).length);
  needAttentionCount = computed(
    () => this.allCards().filter((c: CreditCard) => c.age === 'old' || c.age === 'very-old').length,
  );

  availableBanks = computed(() => [...new Set(this.allCards().map((c: CreditCard) => c.bank))].sort());

  activeFilterCount = computed(() => (this.filterBank() ? 1 : 0) + (this.filterAge() ? 1 : 0));

  /** Cards after applying bank + age filters */
  filteredCards = computed(() => {
    let cards = this.allCards();
    const bank = this.filterBank();
    const age = this.filterAge();
    if (bank) cards = cards.filter((c: CreditCard) => c.bank === bank);
    if (age) cards = cards.filter((c: CreditCard) => c.age === age);
    return cards;
  });

  /** Filtered cards after sorting — used by both card and table views */
  sortedCards = computed(() => {
    const cards = [...this.filteredCards()];
    const key = this.sortKey();
    const dir = this.sortDir();

    cards.sort((a: CreditCard, b: CreditCard) => {
      let cmp = 0;
      if (key === 'recent') {
        const aEff = a.frequentlyUsed ? -1 : a.daysAgo;
        const bEff = b.frequentlyUsed ? -1 : b.daysAgo;
        cmp = aEff - bEff;
      } else if (key === 'bank') {
        cmp = a.bank.localeCompare(b.bank);
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
      } else if (key === 'digits') {
        cmp = a.digits.localeCompare(b.digits);
      } else if (key === 'frequent') {
        if (a.frequentlyUsed !== b.frequentlyUsed) {
          cmp = a.frequentlyUsed ? -1 : 1;
        } else {
          cmp = a.daysAgo - b.daysAgo;
        }
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return cards;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.fetchCards().subscribe({
      next: (cards: CreditCard[]) => {
        this.allCards.set(cards);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load credit card data. Please try again.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.service.clearCache();
    this.loadData();
  }

  clearFilters(): void {
    this.filterBank.set('');
    this.filterAge.set('');
  }

  setSort(key: CreditCardSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  getSortIcon(key: CreditCardSortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  getAgeLabel(age: CreditCardAge): string {
    switch (age) {
      case 'frequent':
        return 'Frequent';
      case 'recent':
        return '< 3 months';
      case 'moderate':
        return '3–6 months';
      case 'old':
        return '6–12 months';
      case 'very-old':
        return 'Over 1 year';
    }
  }

  getRelativeTime(daysAgo: number): string {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) {
      const weeks = Math.floor(daysAgo / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    if (daysAgo < 365) {
      const months = Math.floor(daysAgo / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(daysAgo / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}
