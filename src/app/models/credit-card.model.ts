/** Age bucket based on days since last use (or 'frequent' for always-safe cards) */
export type CreditCardAge = 'frequent' | 'recent' | 'moderate' | 'old' | 'very-old';

export type CreditCardSortKey = 'recent' | 'bank' | 'digits' | 'frequent';
export type CreditCardSortDir = 'asc' | 'desc';

export interface CreditCard {
  sno: number;
  bank: string;
  name: string;
  /** Last 4 digits as a string (preserves leading zeros) */
  digits: string;
  /** YYYY-MM-DD */
  lastUsedDate: string;
  /** Human-readable formatted date, e.g. "May-31-2026" */
  lastUsedDisplay: string;
  frequentlyUsed: boolean;
  age: CreditCardAge;
  daysAgo: number;
}
