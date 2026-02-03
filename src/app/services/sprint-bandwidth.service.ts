import { Injectable, signal, computed } from '@angular/core';
import { SprintConfig, SprintTask, BandwidthSummary, TaskStatus } from '../models/sprint-bandwidth.model';

@Injectable({
  providedIn: 'root',
})
export class SprintBandwidthService {
  private readonly STORAGE_KEY = 'sprint_bandwidth_config';

  private readonly defaultConfig: SprintConfig = {
    sprintName: 'Sprint 1',
    teamName: 'My Team',
    sprintDurationWeeks: 2,
    sprintEndDate: undefined,
    weekOffDays: [0, 6], // Sunday and Saturday
    hoursPerDay: 8,
    holidays: [],
    tasks: [],
    sprintStarted: false,
    sprintStartDate: undefined,
  };

  readonly config = signal<SprintConfig>(this.loadConfig());

  readonly summary = computed<BandwidthSummary>(() => {
    const cfg = this.config();
    return this.calculateBandwidth(cfg);
  });

  private loadConfig(): SprintConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all tasks have required fields (for backward compatibility)
        if (parsed.tasks) {
          parsed.tasks = parsed.tasks.map((task: Partial<SprintTask>) => ({
            ...task,
            status: task.status || 'open',
            createdAt: task.createdAt || new Date().toISOString(),
            addedAfterSprintStart: task.addedAfterSprintStart || false,
          }));
        }
        // Ensure weekOffDays exists
        if (!parsed.weekOffDays) {
          parsed.weekOffDays = [0, 6];
        }
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (e) {
      console.error('Error loading sprint config:', e);
    }
    return { ...this.defaultConfig };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config()));
    } catch (e) {
      console.error('Error saving sprint config:', e);
    }
  }

  updateConfig(partial: Partial<SprintConfig>): void {
    this.config.update(cfg => ({ ...cfg, ...partial }));
    this.saveConfig();
  }

  addTask(task: Omit<SprintTask, 'id' | 'createdAt'>): void {
    const newTask: SprintTask = {
      ...task,
      id: this.generateId(),
      status: 'open',
      createdAt: new Date().toISOString(),
      addedAfterSprintStart: this.config().sprintStarted,
    };
    this.config.update(cfg => ({
      ...cfg,
      tasks: [...cfg.tasks, newTask],
    }));
    this.saveConfig();
  }

  updateTask(id: string, updates: Partial<SprintTask>): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
    this.saveConfig();
  }

  deleteTask(id: string): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.filter(t => t.id !== id),
    }));
    this.saveConfig();
  }

  addHoliday(date: string): void {
    // Only add if within sprint range when sprint dates are set
    const sprintStart = this.config().sprintStartDate ? new Date(this.config().sprintStartDate!) : null;
    const sprintEnd = this.config().sprintEndDate ? new Date(this.config().sprintEndDate!) : null;

    if (sprintStart && sprintEnd) {
      const checkDate = new Date(date);
      if (checkDate < sprintStart || checkDate > sprintEnd) {
        return; // Skip holidays outside sprint range
      }
    }

    if (!this.config().holidays.includes(date)) {
      this.config.update(cfg => ({
        ...cfg,
        holidays: [...cfg.holidays, date].sort(),
      }));
      this.saveConfig();
    }
  }

  removeHoliday(date: string): void {
    this.config.update(cfg => ({
      ...cfg,
      holidays: cfg.holidays.filter(h => h !== date),
    }));
    this.saveConfig();
  }

  addHolidayRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    const sprintStart = this.config().sprintStartDate ? new Date(this.config().sprintStartDate!) : null;
    const sprintEnd = this.config().sprintEndDate ? new Date(this.config().sprintEndDate!) : null;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      // Skip if it's a weekoff day
      if (this.config().weekOffDays.includes(dayOfWeek)) {
        continue;
      }

      // If sprint dates are set, only include holidays within sprint range
      if (sprintStart && sprintEnd) {
        const checkDate = new Date(dateStr);
        if (checkDate < sprintStart || checkDate > sprintEnd) {
          continue;
        }
      }

      dates.push(dateStr);
    }

    this.config.update(cfg => ({
      ...cfg,
      holidays: [...new Set([...cfg.holidays, ...dates])].sort(),
    }));
    this.saveConfig();
  }

  updateWeekOffDays(days: number[]): void {
    this.config.update(cfg => ({
      ...cfg,
      weekOffDays: days.sort(),
    }));
    this.saveConfig();
  }

  updateSprintEndDate(date: string | undefined): void {
    this.config.update(cfg => ({
      ...cfg,
      sprintEndDate: date,
    }));
    this.saveConfig();
  }

  startSprint(): void {
    this.config.update(cfg => ({
      ...cfg,
      sprintStarted: true,
      sprintStartDate: new Date().toISOString(),
    }));
    this.saveConfig();
  }

  completeSprint(): void {
    this.config.update(cfg => ({
      ...cfg,
      sprintStarted: false,
      sprintCompleted: true,
    }));
    this.saveConfig();
  }

  updateTaskStatus(id: string, status: TaskStatus): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.map(t => (t.id === id ? { ...t, status } : t)),
    }));
    this.saveConfig();
  }

  moveTaskToNextSprint(id: string): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.map(t =>
        t.id === id
          ? { ...t, moveToNextSprint: !t.moveToNextSprint, deadline: !t.moveToNextSprint ? undefined : t.deadline }
          : t,
      ),
    }));
    this.saveConfig();
  }

  startNewSprint(): void {
    const teamName = this.config().teamName;
    const sprintName = this.config().sprintName;
    const currentTasks = this.config().tasks;

    // Get tasks marked to move to next sprint
    const markedTasks = currentTasks.filter(t => t.moveToNextSprint === true);

    // Get remaining incomplete tasks (non-completed, non-cancelled, not marked)
    const autoMoveTasks = currentTasks.filter(
      t => t.status !== 'completed' && t.status !== 'cancelled' && !t.moveToNextSprint,
    );

    // Combine marked and auto-move tasks, clear deadlines when moving to spillover
    const tasksToMove = [...markedTasks, ...autoMoveTasks].map(t => ({
      ...t,
      isSpillover: true,
      status: 'open' as TaskStatus,
      addedAfterSprintStart: false,
      moveToNextSprint: false,
      deadline: undefined, // Clear deadline when moving to next sprint
      createdAt: new Date().toISOString(),
    }));

    // Calculate next sprint number by finding the last number after a space
    const match = sprintName.match(/\s(\d+)$/);
    let nextSprintName: string;

    if (match) {
      // Found a number at the end after a space
      const currentNumber = parseInt(match[1]);
      const nextNumber = currentNumber + 1;
      nextSprintName = sprintName.replace(/\s\d+$/, ` ${nextNumber}`);
    } else if (sprintName.trim()) {
      // Has name but no trailing number, append " 2"
      nextSprintName = `${sprintName.trim()} 2`;
    } else {
      // No name given, use default
      nextSprintName = 'Sprint 1';
    }

    this.config.set({
      ...this.defaultConfig,
      teamName,
      sprintName: nextSprintName,
      weekOffDays: this.config().weekOffDays,
      hoursPerDay: this.config().hoursPerDay,
      tasks: tasksToMove,
      sprintCompleted: false,
    });
    this.saveConfig();
  }

  clearAll(): void {
    const teamName = this.config().teamName;
    this.config.set({
      ...this.defaultConfig,
      teamName,
    });
    this.saveConfig();
  }

  resetAll(): void {
    this.config.set({ ...this.defaultConfig });
    this.saveConfig();
  }

  private calculateBandwidth(cfg: SprintConfig): BandwidthSummary {
    const totalWeeks = cfg.sprintDurationWeeks;
    const workDaysPerWeek = 7 - cfg.weekOffDays.length;
    const totalDays = totalWeeks * 7;
    const totalDaysOff = totalWeeks * cfg.weekOffDays.length;
    const totalHolidays = cfg.holidays.length;

    let availableDays = Math.max(0, totalWeeks * workDaysPerWeek - totalHolidays);

    // If sprint end date is set, calculate actual available days from today or sprint start
    if (cfg.sprintEndDate) {
      const startDate = cfg.sprintStartDate ? new Date(cfg.sprintStartDate) : new Date();
      const endDate = new Date(cfg.sprintEndDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      let actualWorkDays = 0;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];

        // Count if not a weekoff and not a holiday
        if (!cfg.weekOffDays.includes(dayOfWeek) && !cfg.holidays.includes(dateStr)) {
          actualWorkDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      availableDays = actualWorkDays;
    }

    const availableHours = availableDays * cfg.hoursPerDay;

    const regularTasks = cfg.tasks.filter(t => !t.isSpillover);
    const spilloverTasks = cfg.tasks.filter(t => t.isSpillover);

    const allocatedDays = regularTasks.reduce((sum, t) => sum + t.requiredDays, 0);
    const spilloverDays = spilloverTasks.reduce((sum, t) => sum + t.requiredDays, 0);

    const totalAllocatedDays = allocatedDays + spilloverDays;
    const remainingDays = availableDays - totalAllocatedDays;

    return {
      totalWeeks,
      totalDays,
      totalDaysOff,
      totalHolidays,
      availableDays,
      availableHours,
      allocatedDays,
      allocatedHours: allocatedDays * cfg.hoursPerDay,
      remainingDays,
      remainingHours: remainingDays * cfg.hoursPerDay,
      spilloverDays,
      spilloverHours: spilloverDays * cfg.hoursPerDay,
    };
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
