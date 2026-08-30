export type TodoRecurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type TodoDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface TodoDbRecord {
  readonly id: string;
  readonly title: string;
  readonly notes?: string;
  readonly dueTime?: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly recurrence: TodoRecurrence;
  readonly daysOfWeek: readonly TodoDay[];
  readonly reminderEnabled: boolean;
  readonly reminderMinutesBefore: number;
  readonly completedDates: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
