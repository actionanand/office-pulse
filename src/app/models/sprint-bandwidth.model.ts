export interface SprintTask {
  id: string;
  name: string;
  jiraLink?: string;
  requiredDays: number;
  deadline?: string;
  isSpillover: boolean;
}

export interface SprintConfig {
  sprintName: string;
  teamName: string;
  sprintDurationWeeks: number;
  daysOffPerWeek: number;
  hoursPerDay: number;
  holidays: string[];
  tasks: SprintTask[];
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
