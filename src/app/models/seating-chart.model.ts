export interface SeatingEntry {
  sno: number;
  organization: string;
  venue: string;
  floor: string;
  seatNumber: string;
  time?: string;
  /** YYYY-MM-DD for single-date entries (column G) */
  date?: string;
  /** YYYY-MM-DD start of date range (column H) */
  dateRangeStart?: string;
  /** YYYY-MM-DD end of date range (column H) */
  dateRangeEnd?: string;
  notes?: string;
  /** Human-readable date label (formatted value from gviz) */
  dateDisplay?: string;
  /** Raw date range string from sheet, e.g. "May 15 2026 - May 16 2026" */
  dateRangeDisplay?: string;
}
