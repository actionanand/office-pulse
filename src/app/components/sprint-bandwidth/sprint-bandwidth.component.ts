import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SprintBandwidthService } from '../../services/sprint-bandwidth.service';
import { SprintTask } from '../../models/sprint-bandwidth.model';

@Component({
  selector: 'app-sprint-bandwidth',
  imports: [CommonModule, FormsModule],
  templateUrl: './sprint-bandwidth.component.html',
  styleUrl: './sprint-bandwidth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SprintBandwidthComponent {
  private bandwidthService = inject(SprintBandwidthService);

  readonly config = this.bandwidthService.config;
  readonly summary = this.bandwidthService.summary;

  // Expose Math for template
  readonly Math = Math;

  // Form signals
  readonly showAddTaskForm = signal(false);
  readonly showHolidayForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);

  // New task form
  readonly newTaskName = signal('');
  readonly newTaskJiraLink = signal('');
  readonly newTaskDays = signal(1);
  readonly newTaskDeadline = signal('');
  readonly newTaskIsSpillover = signal(false);

  // Holiday form
  readonly newHoliday = signal('');

  // Computed for bandwidth status
  readonly bandwidthStatus = computed(() => {
    const s = this.summary();
    if (s.remainingDays < 0) return 'over-allocated';
    if (s.remainingDays === 0) return 'fully-allocated';
    if (s.remainingDays <= s.availableDays * 0.2) return 'nearly-full';
    return 'available';
  });

  readonly regularTasks = computed(() => 
    this.config().tasks.filter(t => !t.isSpillover)
  );

  readonly spilloverTasks = computed(() => 
    this.config().tasks.filter(t => t.isSpillover)
  );

  updateSprintName(value: string): void {
    this.bandwidthService.updateConfig({ sprintName: value });
  }

  updateTeamName(value: string): void {
    this.bandwidthService.updateConfig({ teamName: value });
  }

  updateSprintDuration(value: number): void {
    this.bandwidthService.updateConfig({ sprintDurationWeeks: Math.max(1, value) });
  }

  updateDaysOff(value: number): void {
    this.bandwidthService.updateConfig({ daysOffPerWeek: Math.max(0, Math.min(6, value)) });
  }

  updateHoursPerDay(value: number): void {
    this.bandwidthService.updateConfig({ hoursPerDay: Math.max(1, Math.min(24, value)) });
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
      isSpillover: this.newTaskIsSpillover()
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
      isSpillover: this.newTaskIsSpillover()
    });

    this.closeAddTaskForm();
  }

  deleteTask(id: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
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

  removeHoliday(date: string): void {
    this.bandwidthService.removeHoliday(date);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  clearAll(): void {
    if (confirm('Clear all data except team name?')) {
      this.bandwidthService.clearAll();
    }
  }

  resetAll(): void {
    if (confirm('Reset everything to defaults?')) {
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
}
