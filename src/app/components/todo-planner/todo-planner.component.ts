import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { TodoDay, TodoDbRecord, TodoRecurrence } from '../../models/todo-db.model';
import { SnackbarService } from '../../services/snackbar.service';
import { TodoDatabaseService } from '../../services/todo-database.service';
import { TodoReminderService } from '../../services/todo-reminder.service';
import { todoOccursOn } from '../../utils/todo-recurrence';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';

interface TodoDraft {
  id?: string;
  title: string;
  notes: string;
  dueTime: string;
  startDate: string;
  endDate: string;
  recurrence: TodoRecurrence;
  daysOfWeek: TodoDay[];
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

@Component({
  selector: 'app-todo-planner',
  imports: [FormsModule, LucideDynamicIcon, ConfirmationPopupComponent],
  templateUrl: './todo-planner.component.html',
  styleUrl: './todo-planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoPlannerComponent implements OnInit {
  protected readonly database = inject(TodoDatabaseService);
  private readonly reminders = inject(TodoReminderService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly view = signal<'day' | 'all'>('day');
  protected readonly selectedDate = signal(this.localDate(new Date()));
  protected readonly editorOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly deletingTodo = signal<TodoDbRecord | null>(null);
  protected readonly permissionTodo = signal<TodoDbRecord | null>(null);
  protected draft = this.emptyDraft();
  protected readonly recurrenceOptions: readonly { value: TodoRecurrence; label: string }[] = [
    { value: 'once', label: 'One time' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];
  protected readonly weekdays: readonly { value: TodoDay; label: string }[] = [
    { value: 'mon', label: 'M' },
    { value: 'tue', label: 'T' },
    { value: 'wed', label: 'W' },
    { value: 'thu', label: 'T' },
    { value: 'fri', label: 'F' },
    { value: 'sat', label: 'S' },
    { value: 'sun', label: 'S' },
  ];
  protected readonly reminderOptions = [0, 5, 10, 15, 30, 60] as const;
  protected readonly tasksForDate = computed(() =>
    this.database
      .todos()
      .filter(todo => todoOccursOn(todo, this.selectedDate()))
      .sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99')),
  );
  protected readonly completedCount = computed(
    () => this.tasksForDate().filter(todo => todo.completedDates.includes(this.selectedDate())).length,
  );

  async ngOnInit(): Promise<void> {
    try {
      await this.database.initialize();
      await this.reminders.syncAll(this.database.todos());
    } catch {
      this.snackbar.error('Unable to open tasks.');
    }
  }

  protected changeDate(days: number): void {
    const date = this.parseDate(this.selectedDate());
    date.setDate(date.getDate() + days);
    this.selectedDate.set(this.localDate(date));
  }

  protected goToToday(): void {
    this.selectedDate.set(this.localDate(new Date()));
  }

  protected openNewTask(): void {
    this.draft = this.emptyDraft(this.selectedDate());
    this.editorOpen.set(true);
  }

  protected editTask(todo: TodoDbRecord): void {
    this.draft = {
      id: todo.id,
      title: todo.title,
      notes: todo.notes ?? '',
      dueTime: todo.dueTime ?? '',
      startDate: todo.startDate,
      endDate: todo.endDate ?? '',
      recurrence: todo.recurrence,
      daysOfWeek: [...todo.daysOfWeek],
      reminderEnabled: todo.reminderEnabled,
      reminderMinutesBefore: todo.reminderMinutesBefore,
    };
    this.editorOpen.set(true);
  }

  protected closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }

  protected setRecurrence(value: TodoRecurrence): void {
    this.draft.recurrence = value;
    if ((value === 'weekly' || value === 'biweekly') && this.draft.daysOfWeek.length === 0) {
      this.draft.daysOfWeek = [this.dayName(this.parseDate(this.draft.startDate))];
    }
  }

  protected toggleWeekday(day: TodoDay): void {
    this.draft.daysOfWeek = this.draft.daysOfWeek.includes(day)
      ? this.draft.daysOfWeek.filter(value => value !== day)
      : [...this.draft.daysOfWeek, day];
  }

  protected async saveTask(): Promise<void> {
    if (this.saving()) return;
    const title = this.draft.title.trim();
    if (!title) {
      this.snackbar.warning('Enter a task title.');
      return;
    }
    if (!this.draft.startDate) {
      this.snackbar.warning('Choose a start date.');
      return;
    }
    if (this.draft.endDate && this.draft.endDate < this.draft.startDate) {
      this.snackbar.warning('End date cannot be before start date.');
      return;
    }
    if ((this.draft.recurrence === 'weekly' || this.draft.recurrence === 'biweekly') && !this.draft.daysOfWeek.length) {
      this.snackbar.warning('Choose at least one weekday.');
      return;
    }
    if (this.draft.reminderEnabled && !this.draft.dueTime) {
      this.snackbar.warning('Choose a task time for the reminder.');
      return;
    }

    const existing = this.database.todos().find(todo => todo.id === this.draft.id);
    const now = new Date().toISOString();
    const todo: TodoDbRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      title,
      notes: this.draft.notes.trim() || undefined,
      dueTime: this.draft.dueTime || undefined,
      startDate: this.draft.startDate,
      endDate: this.draft.recurrence === 'once' ? undefined : this.draft.endDate || undefined,
      recurrence: this.draft.recurrence,
      daysOfWeek:
        this.draft.recurrence === 'weekly' || this.draft.recurrence === 'biweekly' ? this.draft.daysOfWeek : [],
      reminderEnabled: this.draft.reminderEnabled,
      reminderMinutesBefore: this.draft.reminderMinutesBefore,
      completedDates: existing?.completedDates ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.saving.set(true);
    try {
      await this.database.save(todo);
      this.editorOpen.set(false);
      this.snackbar.success(existing ? 'Task updated.' : 'Task created.');
      if (todo.reminderEnabled && (await this.reminders.shouldRequestPermission())) this.permissionTodo.set(todo);
      else if (todo.reminderEnabled) await this.reminders.schedule(todo);
      else await this.reminders.cancel(todo.id);
    } catch {
      this.snackbar.error('Task could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleCompleted(todo: TodoDbRecord): Promise<void> {
    const date = this.selectedDate();
    const completed = todo.completedDates.includes(date);
    const updated = {
      ...todo,
      completedDates: completed ? todo.completedDates.filter(value => value !== date) : [...todo.completedDates, date],
      updatedAt: new Date().toISOString(),
    };
    await this.database.save(updated);
    await this.reminders.schedule(updated);
  }

  protected async confirmDelete(): Promise<void> {
    const todo = this.deletingTodo();
    this.deletingTodo.set(null);
    if (!todo) return;
    try {
      await this.database.remove(todo.id);
      await this.reminders.cancel(todo.id);
      this.snackbar.success('Task deleted.');
    } catch {
      this.snackbar.error('Task could not be deleted.');
    }
  }

  protected async confirmReminderPermission(): Promise<void> {
    const todo = this.permissionTodo();
    this.permissionTodo.set(null);
    if (!todo) return;
    if (await this.reminders.requestPermission()) {
      await this.reminders.schedule(todo);
      this.snackbar.success('Task reminders enabled.');
    } else {
      await this.disableReminder(todo);
      this.snackbar.warning('Reminder permission was not enabled.');
    }
  }

  protected async declineReminderPermission(): Promise<void> {
    const todo = this.permissionTodo();
    this.permissionTodo.set(null);
    if (todo) await this.disableReminder(todo);
  }

  protected isCompleted(todo: TodoDbRecord): boolean {
    return todo.completedDates.includes(this.selectedDate());
  }

  protected formattedSelectedDate(): string {
    return this.parseDate(this.selectedDate()).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected recurrenceLabel(todo: TodoDbRecord): string {
    const labels: Record<TodoRecurrence, string> = {
      once: 'One time',
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Every 2 weeks',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    if (todo.recurrence === 'weekly' || todo.recurrence === 'biweekly')
      return `${labels[todo.recurrence]} · ${todo.daysOfWeek.map(day => day.toUpperCase()).join(', ')}`;
    return labels[todo.recurrence];
  }

  protected reminderLabel(minutes: number): string {
    return minutes === 0 ? 'At time' : minutes === 60 ? '1 hour before' : `${minutes} min before`;
  }

  private async disableReminder(todo: TodoDbRecord): Promise<void> {
    const updated = { ...todo, reminderEnabled: false, updatedAt: new Date().toISOString() };
    await this.database.save(updated);
    await this.reminders.cancel(todo.id);
  }

  private emptyDraft(date = this.localDate(new Date())): TodoDraft {
    return {
      title: '',
      notes: '',
      dueTime: '09:00',
      startDate: date,
      endDate: '',
      recurrence: 'once',
      daysOfWeek: [],
      reminderEnabled: false,
      reminderMinutesBefore: 0,
    };
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private parseDate(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  private dayName(date: Date): TodoDay {
    return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[date.getDay()];
  }
}
