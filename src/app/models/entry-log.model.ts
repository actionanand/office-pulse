export interface EntryLog {
  entryTime: string; // ISO string format
  exitTime?: string; // ISO string format
  date: string; // YYYY-MM-DD format
  isSubmitted?: boolean; // Flag to track Google Form submission
}

export interface TodoItem {
  id: string;
  time: string; // HH:mm format
  description: string;
  completed: boolean;
  createdAt: string; // ISO string format
}

export interface AppSettings {
  defaultWorkHours: number; // Default 6 hours
  exitCalculatorTime: string; // HH:mm format, default 18:00
}
