import { Injectable, signal, computed } from '@angular/core';
import { SprintConfig, SprintTask, BandwidthSummary } from '../models/sprint-bandwidth.model';

@Injectable({
  providedIn: 'root'
})
export class SprintBandwidthService {
  private readonly STORAGE_KEY = 'sprint_bandwidth_config';

  private readonly defaultConfig: SprintConfig = {
    sprintName: 'Sprint 1',
    teamName: 'My Team',
    sprintDurationWeeks: 2,
    daysOffPerWeek: 2,
    hoursPerDay: 8,
    holidays: [],
    tasks: []
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

  addTask(task: Omit<SprintTask, 'id'>): void {
    const newTask: SprintTask = {
      ...task,
      id: this.generateId()
    };
    this.config.update(cfg => ({
      ...cfg,
      tasks: [...cfg.tasks, newTask]
    }));
    this.saveConfig();
  }

  updateTask(id: string, updates: Partial<SprintTask>): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    this.saveConfig();
  }

  deleteTask(id: string): void {
    this.config.update(cfg => ({
      ...cfg,
      tasks: cfg.tasks.filter(t => t.id !== id)
    }));
    this.saveConfig();
  }

  addHoliday(date: string): void {
    this.config.update(cfg => ({
      ...cfg,
      holidays: [...cfg.holidays, date].sort()
    }));
    this.saveConfig();
  }

  removeHoliday(date: string): void {
    this.config.update(cfg => ({
      ...cfg,
      holidays: cfg.holidays.filter(h => h !== date)
    }));
    this.saveConfig();
  }

  clearAll(): void {
    const teamName = this.config().teamName;
    this.config.set({
      ...this.defaultConfig,
      teamName
    });
    this.saveConfig();
  }

  resetAll(): void {
    this.config.set({ ...this.defaultConfig });
    this.saveConfig();
  }

  private calculateBandwidth(cfg: SprintConfig): BandwidthSummary {
    const totalWeeks = cfg.sprintDurationWeeks;
    const workDaysPerWeek = 7 - cfg.daysOffPerWeek;
    const totalDays = totalWeeks * 7;
    const totalDaysOff = totalWeeks * cfg.daysOffPerWeek;
    const totalHolidays = cfg.holidays.length;
    
    const availableDays = Math.max(0, (totalWeeks * workDaysPerWeek) - totalHolidays);
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
      spilloverHours: spilloverDays * cfg.hoursPerDay
    };
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
