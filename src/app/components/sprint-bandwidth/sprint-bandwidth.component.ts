import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SprintBandwidthService } from '../../services/sprint-bandwidth.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { SprintTask, TaskStatus } from '../../models/sprint-bandwidth.model';

import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-sprint-bandwidth',
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent],
  templateUrl: './sprint-bandwidth.component.html',
  styleUrl: './sprint-bandwidth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SprintBandwidthComponent {
  private bandwidthService = inject(SprintBandwidthService);
  private snackbarService = inject(SnackbarService);
  private confirmationService = inject(ConfirmationDialogService);

  readonly config = this.bandwidthService.config;
  readonly summary = this.bandwidthService.summary;

  // Expose Math for template
  readonly Math = Math;

  // Form signals
  readonly showAddTaskForm = signal(false);
  readonly showHolidayForm = signal(false);
  readonly showHolidayRangeForm = signal(false);
  readonly showWeekoffForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);

  // New task form
  readonly newTaskName = signal('');
  readonly newTaskJiraLink = signal('');
  readonly newTaskDays = signal(1);
  readonly newTaskDeadline = signal('');
  readonly newTaskIsSpillover = signal(false);

  // Holiday form
  readonly newHoliday = signal('');
  readonly holidayRangeStart = signal('');
  readonly holidayRangeEnd = signal('');

  // Sprint settings
  readonly sprintEndDate = signal('');
  readonly selectedWeekoffDays = signal<number[]>([]);

  // Computed for bandwidth status
  readonly bandwidthStatus = computed(() => {
    const s = this.summary();
    if (s.remainingDays < 0) return 'over-allocated';
    if (s.remainingDays === 0) return 'fully-allocated';
    if (s.remainingDays <= s.availableDays * 0.2) return 'nearly-full';
    return 'available';
  });

  readonly regularTasks = computed(() => this.config().tasks.filter((t: SprintTask) => !t.isSpillover));

  readonly spilloverTasks = computed(() => this.config().tasks.filter((t: SprintTask) => t.isSpillover));

  updateSprintName(value: string): void {
    this.bandwidthService.updateConfig({ sprintName: value });
  }

  updateTeamName(value: string): void {
    this.bandwidthService.updateConfig({ teamName: value });
  }

  updateSprintDuration(value: number): void {
    this.bandwidthService.updateConfig({ sprintDurationWeeks: Math.max(1, value) });
  }

  updateHoursPerDay(value: number): void {
    this.bandwidthService.updateConfig({ hoursPerDay: Math.max(1, Math.min(24, value)) });
  }

  openWeekoffForm(): void {
    this.selectedWeekoffDays.set([...this.config().weekOffDays]);
    this.showWeekoffForm.set(true);
  }

  closeWeekoffForm(): void {
    this.showWeekoffForm.set(false);
    this.selectedWeekoffDays.set([]);
  }

  toggleWeekoffDay(day: number): void {
    this.selectedWeekoffDays.update((days: number[]) => {
      const index = days.indexOf(day);
      if (index > -1) {
        return days.filter((_: number, i: number) => i !== index);
      } else {
        return [...days, day];
      }
    });
  }

  saveWeekoffDays(): void {
    if (this.selectedWeekoffDays().length === 0) {
      this.snackbarService.error('At least one weekoff day is required');
      return;
    }
    this.bandwidthService.updateWeekOffDays(this.selectedWeekoffDays());
    this.closeWeekoffForm();
  }

  updateSprintEndDate(value: string): void {
    this.sprintEndDate.set(value);
    this.bandwidthService.updateSprintEndDate(value || undefined);
  }

  openAddTaskForm(isSpillover: boolean = false): void {
    this.resetTaskForm();
    this.newTaskIsSpillover.set(isSpillover);
    this.showAddTaskForm.set(true);
  }

  closeAddTaskForm(): void {
    this.showAddTaskForm.set(false);
    this.resetTaskForm();
  }

  resetTaskForm(): void {
    this.newTaskName.set('');
    this.newTaskJiraLink.set('');
    this.newTaskDays.set(1);
    this.newTaskDeadline.set('');
    this.newTaskIsSpillover.set(false);
    this.editingTaskId.set(null);
  }

  addTask(): void {
    if (!this.newTaskName().trim()) return;

    this.bandwidthService.addTask({
      name: this.newTaskName().trim(),
      jiraLink: this.newTaskJiraLink().trim() || undefined,
      requiredDays: this.newTaskDays(),
      deadline: this.newTaskDeadline() || undefined,
      isSpillover: this.newTaskIsSpillover(),
      status: 'open',
    });

    this.closeAddTaskForm();
  }

  startEditTask(task: SprintTask): void {
    this.editingTaskId.set(task.id);
    this.newTaskName.set(task.name);
    this.newTaskJiraLink.set(task.jiraLink || '');
    this.newTaskDays.set(task.requiredDays);
    this.newTaskDeadline.set(task.deadline || '');
    this.newTaskIsSpillover.set(task.isSpillover);
    this.showAddTaskForm.set(true);
  }

  saveEditTask(): void {
    const id = this.editingTaskId();
    if (!id || !this.newTaskName().trim()) return;

    this.bandwidthService.updateTask(id, {
      name: this.newTaskName().trim(),
      jiraLink: this.newTaskJiraLink().trim() || undefined,
      requiredDays: this.newTaskDays(),
      deadline: this.newTaskDeadline() || undefined,
      isSpillover: this.newTaskIsSpillover(),
      status: 'open',
    });

    this.closeAddTaskForm();
  }

  async deleteTask(id: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.bandwidthService.deleteTask(id);
    }
  }

  openHolidayForm(): void {
    this.newHoliday.set('');
    this.showHolidayForm.set(true);
  }

  closeHolidayForm(): void {
    this.showHolidayForm.set(false);
    this.newHoliday.set('');
  }

  addHoliday(): void {
    const date = this.newHoliday();
    if (date && !this.config().holidays.includes(date)) {
      this.bandwidthService.addHoliday(date);
    }
    this.closeHolidayForm();
  }

  openHolidayRangeForm(): void {
    this.holidayRangeStart.set('');
    this.holidayRangeEnd.set('');
    this.showHolidayRangeForm.set(true);
  }

  closeHolidayRangeForm(): void {
    this.showHolidayRangeForm.set(false);
    this.holidayRangeStart.set('');
    this.holidayRangeEnd.set('');
  }

  addHolidayRange(): void {
    const start = this.holidayRangeStart();
    const end = this.holidayRangeEnd();
    if (start && end && start <= end) {
      this.bandwidthService.addHolidayRange(start, end);
    }
    this.closeHolidayRangeForm();
  }

  removeHoliday(date: string): void {
    this.bandwidthService.removeHoliday(date);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  async clearAll(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Clear All Data',
      message: 'Clear all data except team name?',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.bandwidthService.clearAll();
    }
  }

  async resetAll(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Reset All',
      message: 'Reset everything to defaults?',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.bandwidthService.resetAll();
    }
  }

  openJiraLink(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  isDeadlineUrgent(deadline: string): boolean {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }

  getDeadlineText(deadline: string): string {
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return this.formatDate(deadline);
  }

  async startSprint(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Start Sprint',
      message: 'Start sprint? This will enable task tracking and disable configuration changes.',
      confirmText: 'Start Sprint',
      cancelText: 'Cancel',
      confirmColor: 'success',
    });

    if (confirmed) {
      this.bandwidthService.startSprint();
    }
  }

  async completeSprint(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Complete Sprint',
      message: 'Complete this sprint? You can then move incomplete tasks to the next sprint.',
      confirmText: 'Complete',
      cancelText: 'Cancel',
      confirmColor: 'success',
    });

    if (confirmed) {
      this.bandwidthService.completeSprint();
    }
  }

  async startNewSprint(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Start New Sprint',
      message: 'Start new sprint? This will move all incomplete tasks to spillover and reset the sprint configuration.',
      confirmText: 'Start New Sprint',
      cancelText: 'Cancel',
      confirmColor: 'primary',
    });

    if (confirmed) {
      this.bandwidthService.startNewSprint();
    }
  }

  moveTaskToNextSprint(taskId: string): void {
    this.bandwidthService.moveTaskToNextSprint(taskId);
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.bandwidthService.updateTaskStatus(taskId, status);
  }

  getNextStatus(currentStatus: TaskStatus): TaskStatus | null {
    const workflow: Record<TaskStatus, TaskStatus | null> = {
      open: 'working',
      working: 'dev-finished',
      'dev-finished': 'testing',
      testing: 'completed',
      completed: null,
      reopened: 'working',
      cancelled: null,
    };
    return workflow[currentStatus];
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      open: 'Open',
      working: 'Working',
      'dev-finished': 'Dev Finished',
      testing: 'Testing',
      completed: 'Completed',
      reopened: 'Reopened',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }

  getStatusIcon(status: TaskStatus): string {
    const icons: Record<TaskStatus, string> = {
      open: '⚪',
      working: '🔵',
      'dev-finished': '🟢',
      testing: '🟡',
      completed: '✅',
      reopened: '🔴',
      cancelled: '⛔',
    };
    return icons[status];
  }

  canReopenTask(status: TaskStatus): boolean {
    return status === 'completed' || status === 'testing';
  }

  canCancelTask(status: TaskStatus): boolean {
    return status !== 'completed' && status !== 'cancelled';
  }

  async cancelTask(taskId: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Cancel Task',
      message: 'Cancel this task? Cancelled tasks cannot be reopened.',
      confirmText: 'Cancel Task',
      cancelText: 'Keep Task',
      confirmColor: 'danger',
    });

    if (confirmed) {
      this.bandwidthService.updateTaskStatus(taskId, 'cancelled');
    }
  }

  getSprintDaysRemaining(): number {
    const cfg = this.config();
    if (!cfg.sprintStartDate || !cfg.sprintEndDate) return -1;

    const endDate = new Date(cfg.sprintEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  sanitizeUrl(url: string): string {
    // Ensure absolute URL for external links
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }

  getWeekdayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  isTaskAddedAfterSprintStart(task: SprintTask): boolean {
    return task.addedAfterSprintStart === true;
  }

  // Clear all tasks in Sprint Tasks or Spillover Stories section
  async clearAllTasks(isSpillover: boolean): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Clear All Tasks',
      message: isSpillover
        ? 'Clear all spillover stories? Marked-for-move tasks will be preserved.'
        : 'Clear all sprint tasks? Marked-for-move tasks will be preserved.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });
    if (confirmed) {
      this.bandwidthService.clearAllTasks(isSpillover);
      this.snackbarService.success('Tasks cleared.');
    }
  }
}
