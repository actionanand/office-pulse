import { Component, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StorageService } from '../../services/storage.service';
import { EntryLog } from '../../models/entry-log.model';
import { TodoListComponent } from '../todo-list/todo-list.component';
import { GoogleFormDialogComponent } from '../google-form-dialog/google-form-dialog.component';
import { environment as env } from '../../../environments/environment';

@Component({
  selector: 'app-entry-logger',
  imports: [CommonModule, FormsModule, TodoListComponent, GoogleFormDialogComponent],
  templateUrl: './entry-logger.component.html',
  styleUrls: ['./entry-logger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryLoggerComponent implements OnInit {
  private storageService = new StorageService();
  
  entryLog = signal<EntryLog | null>(null);
  currentTime = signal<string>('');
  workHours = signal<number>(6);
  showEntryDialog = signal<boolean>(false);
  showExitDialog = signal<boolean>(false);
  showSubmissionDialog = signal<boolean>(false);
  showGoogleFormDialog = signal<boolean>(false);
  googleFormUrl = signal<string>('');
  pendingFormData = signal<{ log: EntryLog; formData: { companyName: string; comment: string } } | null>(null);
  
  hasEnteredToday = computed(() => {
    const log = this.entryLog();
    if (!log) return false;
    
    const today = this.getTodayDateString();
    return log.date === today && !!log.entryTime;
  });
  
  isSubmittedToday = computed(() => {
    const log = this.entryLog();
    if (!log) return false;
    
    const today = this.getTodayDateString();
    return log.date === today && log.isSubmitted === true;
  });
  
  hasExitedToday = computed(() => {
    const log = this.entryLog();
    if (!log) return false;
    
    const today = this.getTodayDateString();
    return log.date === today && !!log.exitTime;
  });
  
  canShowTodos = computed(() => {
    return this.hasEnteredToday();
  });
  
  entryTimeDisplay = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';
    return this.formatTo12Hour(new Date(log.entryTime));
  });
  
  exitTimeDisplay = computed(() => {
    const log = this.entryLog();
    if (!log || !log.exitTime) return '';
    return this.formatTo12Hour(new Date(log.exitTime));
  });
  
  calculatedExitTime = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';
    
    const entryDate = new Date(log.entryTime);
    const exitDate = new Date(entryDate.getTime() + this.workHours() * 60 * 60 * 1000);
    return this.formatTo12Hour(exitDate);
  });

  durationSinceEntry = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';
    
    // Depend on currentTime to trigger updates every second
    this.currentTime();
    
    const entryDate = new Date(log.entryTime);
    const now = new Date();
    const diffMs = now.getTime() - entryDate.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  });

  totalDuration = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime || !log.exitTime) return '';
    
    const entryDate = new Date(log.entryTime);
    const exitDate = new Date(log.exitTime);
    const diffMs = exitDate.getTime() - entryDate.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  });

  constructor() {
    // Update current time every second
    setInterval(() => {
      this.currentTime.set(this.formatTo12Hour(new Date()));
    }, 1000);
  }

  ngOnInit(): void {
    this.loadData();
    this.currentTime.set(this.formatTo12Hour(new Date()));
  }

  loadData(): void {
    const log = this.storageService.getEntryLog();
    const settings = this.storageService.getSettings();
    
    // Check if entry is from today
    if (log && log.date === this.getTodayDateString()) {
      this.entryLog.set(log);
    } else {
      this.entryLog.set(null);
    }
    
    this.workHours.set(settings.defaultWorkHours);
  }

  openEntryDialog(): void {
    // Prevent entry if already submitted today
    if (this.isSubmittedToday()) {
      alert('You have already submitted your entry/exit for today. You can make a new entry tomorrow.');
      return;
    }
    
    // Prevent second entry if already entered today (but not submitted)
    if (this.hasEnteredToday()) {
      alert('You have already marked entry for today. Please mark exit first.');
      return;
    }
    
    this.showEntryDialog.set(true);
  }

  closeEntryDialog(): void {
    this.showEntryDialog.set(false);
  }

  handleEntrySubmit(useCustomTime: boolean, customDateTimeValue?: string): void {
    let entryTime: Date;
    
    if (useCustomTime && customDateTimeValue) {
      entryTime = new Date(customDateTimeValue);
    } else {
      entryTime = new Date();
    }
    
    const log: EntryLog = {
      entryTime: entryTime.toISOString(),
      date: this.getTodayDateString()
    };
    
    this.storageService.saveEntryLog(log);
    this.entryLog.set(log);
    this.closeEntryDialog();
  }

  openExitDialog(): void {
    if (!this.hasEnteredToday()) {
      alert('Please mark entry first before exit!');
      return;
    }
    
    if (this.hasExitedToday()) {
      alert('You have already marked exit for today.');
      return;
    }
    
    this.showExitDialog.set(true);
  }

  closeExitDialog(): void {
    this.showExitDialog.set(false);
  }

  handleExitSubmit(formData: { companyName: string; comment: string }): void {
    const log = this.entryLog();
    if (!log) return;
    
    const exitTime = new Date();
    log.exitTime = exitTime.toISOString();
    
    // Update storage with exit time
    this.storageService.saveEntryLog(log);
    this.entryLog.set(log);
    
    // Store pending form data and show confirmation dialog
    this.pendingFormData.set({ log, formData });
    this.closeExitDialog();
    this.showSubmissionDialog.set(true);
  }

  confirmSubmission(): void {
    const pending = this.pendingFormData();
    if (!pending) return;
    
    const { log, formData } = pending;
    
    // Build Google Form URL with embedded format
    const formUrl = this.buildGoogleFormUrl(log, formData);
    this.googleFormUrl.set(formUrl);
    
    // DON'T mark as submitted yet - wait for actual form submission
    // log.isSubmitted = true;
    // this.storageService.saveEntryLog(log);
    // this.entryLog.set(log);
    
    // Show Google Form dialog
    this.showSubmissionDialog.set(false);
    this.showGoogleFormDialog.set(true);
  }

  onGoogleFormClose(): void {
    // User closed without submitting - revert exit time
    const pending = this.pendingFormData();
    if (pending) {
      const log = pending.log;
      log.exitTime = undefined;
      this.storageService.saveEntryLog(log);
      this.entryLog.set({ ...log });
    }
    
    this.showGoogleFormDialog.set(false);
    this.pendingFormData.set(null);
  }

  onGoogleFormSubmitted(): void {
    // Form was actually submitted - now mark as submitted
    const pending = this.pendingFormData();
    if (pending) {
      const log = pending.log;
      log.isSubmitted = true;
      this.storageService.saveEntryLog(log);
      this.entryLog.set({ ...log });
    }
    
    this.showGoogleFormDialog.set(false);
    this.pendingFormData.set(null);
  }

  buildGoogleFormUrl(log: EntryLog, formData: { companyName: string; comment: string }): string {
    // Get Form ID from environment
    const formId = env.YOUR_FORM_ID;
    
    // Base URL for embedded form
    const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
    
    // Format times to YYYY-MM-DD HH:mm format for Google Forms
    const entryTime = this.formatForGoogleForm(new Date(log.entryTime));
    const exitTime = this.formatForGoogleForm(new Date(log.exitTime!));
    
    // Build query parameters with actual field IDs
    const params = new URLSearchParams({
      'usp': 'pp_url',
      'entry.160031710': entryTime,        // Entry Time (required)
      'entry.1057727999': exitTime,        // Exit Time (required)
      'entry.302638121': formData.companyName || '',   // Company Name (optional)
      'entry.1773816160': formData.comment || '',      // Comments (optional)
      'embedded': 'true'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  cancelSubmission(): void {
    // Optionally clear exit time if user cancels
    const log = this.entryLog();
    if (log) {
      log.exitTime = undefined;
      this.storageService.saveEntryLog(log);
      this.entryLog.set(log);
    }
    
    this.pendingFormData.set(null);
    this.showSubmissionDialog.set(false);
  }

  closeSubmissionDialog(): void {
    this.showSubmissionDialog.set(false);
  }

  updateWorkHours(hours: number): void {
    this.workHours.set(hours);
    const settings = this.storageService.getSettings();
    settings.defaultWorkHours = hours;
    this.storageService.saveSettings(settings);
  }

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private formatTo12Hour(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  private formatTimeOnly(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatForGoogleForm(date: Date): string {
    // Format: YYYY-MM-DD HH:mm (24-hour format for Google Forms)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
