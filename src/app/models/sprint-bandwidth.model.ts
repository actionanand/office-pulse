export type TaskStatus = 'open' | 'working' | 'dev-finished' | 'testing' | 'completed' | 'reopened' | 'cancelled';

export interface SprintTask {
  id: string;
  name: string;
  jiraLink?: string;
  requiredDays: number;
  deadline?: string;
  isSpillover: boolean;
  status: TaskStatus;
  createdAt: string;
  addedAfterSprintStart?: boolean;
  moveToNextSprint?: boolean;
}

export interface SprintConfig {
  sprintName: string;
  teamName: string;
  sprintDurationWeeks: number;
  sprintEndDate?: string;
  weekOffDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default: [0, 6])
  hoursPerDay: number;
  holidays: string[];
  tasks: SprintTask[];
  sprintStarted: boolean;
  sprintStartDate?: string;
  sprintCompleted?: boolean;
}

export interface BandwidthSummary {
  totalWeeks: number;
  totalDays: number;
  totalDaysOff: number;
  totalHolidays: number;
  availableDays: number;
  availableHours: number;
  allocatedDays: number;
  allocatedHours: number;
  remainingDays: number;
  remainingHours: number;
  spilloverDays: number;
  spilloverHours: number;
}
