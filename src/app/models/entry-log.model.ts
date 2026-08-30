export interface EntryLog {
  entryTime: string; // ISO string format
  exitTime?: string; // ISO string format
  date: string; // YYYY-MM-DD format
  isSubmitted?: boolean; // Flag to track Google Form submission
  companyName?: string; // Pending company value for legacy logger submission
  comments?: string; // Pending comments value for legacy logger submission
}

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TodoItem {
  id: string;
  time: string; // HH:mm format
  description: string;
  completed: boolean;
  createdAt: string; // ISO string format
  isDefaultTodo?: boolean; // True for app default todos, false/undefined for user-created

  // Scheduling fields
  startDate: string; // YYYY-MM-DD format - when the todo starts
  endDate?: string; // YYYY-MM-DD format - when recurring todo ends (optional)
  recurrenceType: RecurrenceType;

  // For weekly/biweekly recurrence
  daysOfWeek?: DayOfWeek[]; // e.g., ['monday', 'thursday']

  // For biweekly - which week offset (0 or 1)
  biweeklyOffset?: number; // 0 = this week, 1 = next week

  // For monthly
  dayOfMonth?: number; // 1-31

  // For yearly
  monthOfYear?: number; // 1-12

  // Track completion per date for recurring todos
  completedDates?: string[]; // Array of YYYY-MM-DD dates when completed
}

export interface AppSettings {
  defaultWorkHours: number; // Default 6 hours
  exitCalculatorTime: string; // HH:mm format, default 18:00
  showTodoList: boolean; // Toggle to show/hide todo list
}
