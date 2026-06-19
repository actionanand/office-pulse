export interface StationSchedule {
  place: string;
  hours: number;
  minutes: number;
  day: number;
  /** day * 24 * 60 + hours * 60 + minutes — for sorting */
  effectiveMinutes: number;
  /** e.g. "2:30 AM" */
  display12h: string;
  /** e.g. "Same Day", "Next Day", "Day 3" */
  dayLabel: string;
}

export interface VacantSeatEntry {
  sno: number;
  coach: string;
  /** Raw seat string as entered in the sheet */
  seats: string;
  /** Expanded individual seat numbers */
  seatList: string[];
  seatCount: number;
  berth: string;
  fromStation: string;
  toStation: string;
  /** Looked-up schedule for fromStation */
  fromSchedule?: StationSchedule;
  /** Looked-up schedule for toStation */
  toSchedule?: StationSchedule;
  /** Travel time between fromSchedule and toSchedule, when both are known */
  durationMinutes?: number;
  /** e.g. "4h 35m" */
  displayDuration?: string;
}

export type VacantSeatSortKey = 'duration' | 'from' | 'to' | 'coach';
export type VacantSeatSortDir = 'asc' | 'desc';
