import { Component, signal, computed, effect, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StorageService } from '../../services/storage.service';
import { AttendanceStateService } from '../../services/attendance-state.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AndroidLogoffNotificationService } from '../../services/android-logoff-notification.service';
import { EntryLog } from '../../models/entry-log.model';
import { TodoListComponent } from '../todo-list/todo-list.component';
import { GoogleFormDialogComponent } from '../google-form-dialog/google-form-dialog.component';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { environment as env } from '../../../environments/environment';

@Component({
  selector: 'app-entry-logger',
  imports: [CommonModule, FormsModule, TodoListComponent, GoogleFormDialogComponent, ConfirmationPopupComponent],
  templateUrl: './entry-logger.component.html',
  styleUrls: ['./entry-logger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryLoggerComponent implements OnInit {
  private storageService = new StorageService();
  private attendanceState = inject(AttendanceStateService);
  private snackbarService = inject(SnackbarService);
  private logoffNotifications = inject(AndroidLogoffNotificationService);

  entryLog = signal<EntryLog | null>(null);
  currentTime = signal<string>('');
  workHours = signal<number>(6);
  showEntryDialog = signal<boolean>(false);
  showExitDialog = signal<boolean>(false);
  showSubmissionDialog = signal<boolean>(false);
  showGoogleFormDialog = signal<boolean>(false);
  googleFormUrl = signal<string>('');
  pendingFormData = signal<{
    log: EntryLog;
    formData: { companyName: string; comment: string; status: string };
  } | null>(null);
  showLeaveToggle = signal<boolean>(false);
  showPastDateDialog = signal<boolean>(false);
  showPastActionDialog = signal<boolean>(false);
  selectedPastDate = signal<string>('');
  showTodoList = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  selectedExitStatus = signal<string>('Office');
  exitEntryDateTime = signal<string>('');
  exitExitDateTime = signal<string>('');
  showLeaveConfirmation = signal<boolean>(false);

  private readonly googleFormEntryIds = {
    entryTime: 'entry.160031710',
    exitTime: 'entry.1057727999',
    companyName: 'entry.302638121',
    comment: 'entry.1773816160',
    status: 'entry.1264867401',
  };

  maxDate = computed(() => {
    // Use IST for yesterday
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    ist.setDate(ist.getDate() - 1);
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // ============================================================================
  // ENTRY/EXIT LOGIC EXPLANATION:
  // ============================================================================
  // 1. LOCAL STORAGE: Stores pending entry/exit that hasn't been submitted yet
  //    - Entry marked -> stored in local storage
  //    - Exit marked -> stored in local storage
  //    - Form submitted -> data goes to API, can clear local storage
  //
  // 2. API DATA: Contains completed submissions with both entry & exit times
  //    - If API has entry with today's entry date -> Both entry & exit are there
  //    - Entry date determines the "day" (not exit date - supports night shift)
  //    - Night shift example: Enter Dec 1 11PM, Exit Dec 2 7AM = Dec 1's entry
  //
  // 3. BUTTON RESTRICTIONS:
  //    - Entry Button: Disabled if today's entry exists (local storage OR API)
  //    - Exit Button: Disabled if no entry OR exit already marked OR submitted
  //    - Check entry DATE (from entry time), not exit date
  // ============================================================================

  // Use attendance state service for checking today's entry
  hasEnteredToday = computed(() => this.attendanceState.hasEntryToday());
  isSubmittedToday = computed(() => this.attendanceState.isSubmittedToday());
  hasExitedToday = computed(() => this.attendanceState.hasExitToday());

  // Get today's entry from API for display
  todayApiEntry = computed(() => this.attendanceState.todayEntryFromAPI());

  // Check if today's entry is a Day Off
  isDayOffToday = computed(() => {
    const apiEntry = this.todayApiEntry();
    return apiEntry?.status === 'Day Off';
  });

  canShowTodos = computed(() => {
    return this.hasEnteredToday();
  });

  // Show leave toggle only when not entered and not submitted
  shouldShowLeaveToggle = computed(() => {
    return !this.hasEnteredToday() && !this.isSubmittedToday();
  });

  // Show button when: no API data for today AND localStorage has isSubmitted=true AND entryTime+exitTime for today
  canLoadOfflineEntry = computed(() => {
    // Only show if there is no API data for today
    const apiEntry = this.todayApiEntry();
    if (apiEntry) return false;

    // Check localStorage for a submitted entry for today with both entry and exit time
    const storedLog = this.storageService.getEntryLog();
    if (!storedLog?.isSubmitted || !storedLog.entryTime || !storedLog.exitTime) return false;

    // Get IST date for entryTime and exitTime
    const getISTDate = (iso: string) => {
      const d = new Date(iso);
      const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const y = ist.getFullYear();
      const m = String(ist.getMonth() + 1).padStart(2, '0');
      const day = String(ist.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const exitIST = getISTDate(storedLog.exitTime);
    const todayIST = getISTDate(new Date().toISOString());
    return exitIST === todayIST;
  });

  entryTimeDisplay = computed(() => {
    // First check API entry
    const apiEntry = this.todayApiEntry();
    if (apiEntry) {
      // If Day Off, don't show entry time
      if (apiEntry.status === 'Day Off') {
        return 'Day Off';
      }
      if (apiEntry.entryTime) {
        return this.formatTimeString(apiEntry.entryTime);
      }
    }

    // Fallback to local storage
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';
    return this.formatTo12Hour(new Date(log.entryTime));
  });

  exitTimeDisplay = computed(() => {
    // First check API entry
    const apiEntry = this.todayApiEntry();
    if (apiEntry) {
      // If Day Off, don't show exit time
      if (apiEntry.status === 'Day Off') {
        return '';
      }
      if (apiEntry.exitTime) {
        return this.formatTimeString(apiEntry.exitTime);
      }
    }

    // Fallback to local storage
    const log = this.entryLog();
    if (!log || !log.exitTime) return '';
    return this.formatTo12Hour(new Date(log.exitTime));
  });

  durationDisplay = computed(() => {
    const apiEntry = this.todayApiEntry();
    if (apiEntry?.duration) {
      return apiEntry.duration;
    }
    // If exitTime is present, show total duration, else show duration since entry
    const log = this.entryLog();
    if (log && log.entryTime && log.exitTime) {
      return this.totalDuration();
    } else if (log && log.entryTime) {
      // Duration so far
      const entryDate = new Date(log.entryTime);
      const now = new Date();
      const diffMs = now.getTime() - entryDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) {
        return `${hours} hr ${minutes} min`;
      }
      return `${minutes} min`;
    }
    return '';
  });

  calculatedExitTime = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';

    const entryDate = new Date(log.entryTime);
    const exitDate = new Date(entryDate.getTime() + this.workHours() * 60 * 60 * 1000);
    return this.formatTo12Hour(exitDate);
  });

  calculatedExitDate = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';

    const entryDate = new Date(log.entryTime);
    const exitDate = new Date(entryDate.getTime() + this.workHours() * 60 * 60 * 1000);

    // Return only date part (DD/MM/YYYY)
    return exitDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  });

  calculatedExitTimeOnly = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';

    const entryDate = new Date(log.entryTime);
    const exitDate = new Date(entryDate.getTime() + this.workHours() * 60 * 60 * 1000);

    // Return only time part (HH:MM:SS AM/PM)
    return exitDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
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
    if (!log || !log.entryTime) return '';
    // If exitTime is present, use it, else use now
    const entryDate = new Date(log.entryTime);
    const endDate = log.exitTime ? new Date(log.exitTime) : new Date();
    const diffMs = endDate.getTime() - entryDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  });

  remainingTime = computed(() => {
    const log = this.entryLog();
    if (!log || !log.entryTime) return '';

    // Depend on currentTime to trigger updates every second
    this.currentTime();

    const entryDate = new Date(log.entryTime);
    const targetExitDate = new Date(entryDate.getTime() + this.workHours() * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = targetExitDate.getTime() - now.getTime();

    // If time has passed, show 0
    if (diffMs <= 0) {
      return 'Time to log off!';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  });

  constructor() {
    effect(() => {
      this.currentTime();
      const log = this.entryLog();
      const workHours = this.workHours();
      const remainingText = this.remainingTime();
      const hasFinishedToday = this.hasExitedToday() || this.isSubmittedToday();

      if (!log?.entryTime || !remainingText || log.exitTime || log.isSubmitted || hasFinishedToday) {
        void this.logoffNotifications.cancel();
        return;
      }

      void this.logoffNotifications.syncFromRemainingText(log.entryTime, workHours, remainingText, new Date());
    });

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

    // NOTE: Entry date is determined by entry time, not exit time (supports night shift)
    // Local storage holds pending entries that haven't been submitted to API yet
    // Once submitted to API (via Google Form), the entry includes both entry & exit times
    // Always load the entry from localStorage, regardless of date
    if (log && log.entryTime) {
      this.entryLog.set(log);
    } else {
      this.entryLog.set(null);
    }

    this.workHours.set(settings.defaultWorkHours);
    this.showTodoList.set(settings.showTodoList);
  }

  loadOfflineEntry(): void {
    const storedLog = this.storageService.getEntryLog();
    if (!storedLog || !storedLog.isSubmitted || !storedLog.entryTime || !storedLog.exitTime) {
      this.snackbarService.error('No complete offline entry found for today');
      return;
    }
    // Check if exitTime (IST) is today
    const getISTDate = (iso: string) => {
      const d = new Date(iso);
      const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const y = ist.getFullYear();
      const m = String(ist.getMonth() + 1).padStart(2, '0');
      const day = String(ist.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const exitIST = getISTDate(storedLog.exitTime);
    const todayIST = getISTDate(new Date().toISOString());
    if (exitIST !== todayIST) {
      this.snackbarService.error('Offline entry is not for today');
      return;
    }
    // Do NOT modify localStorage!
    this.entryLog.set(storedLog);
    this.attendanceState.notifyLocalStorageChanged();
    const formData = {
      companyName: '',
      comment: '',
      status: 'Office',
    };
    this.pendingFormData.set({ log: storedLog, formData });
    this.showSubmissionDialog.set(true);
  }

  openEntryDialog(): void {
    // Prevent entry if already submitted today
    if (this.isSubmittedToday()) {
      this.snackbarService.error(
        'You have already submitted your entry/exit for today. You can make a new entry tomorrow.',
      );
      return;
    }

    // Prevent second entry if already entered today (but not submitted)
    if (this.hasEnteredToday()) {
      this.snackbarService.error('You have already marked entry for today. Please mark exit first.');
      return;
    }

    this.showEntryDialog.set(true);
  }

  closeEntryDialog(): void {
    this.showEntryDialog.set(false);
  }

  openLeaveConfirmation(event?: Event): void {
    const checkbox = event?.target as HTMLInputElement | null;
    if (checkbox) {
      checkbox.checked = false;
    }

    if (this.isSubmittedToday() || this.hasEnteredToday()) {
      this.snackbarService.error('You have already marked attendance for today.');
      return;
    }

    this.showLeaveConfirmation.set(true);
  }

  closeLeaveConfirmation(): void {
    if (this.isSubmitting()) return;
    this.showLeaveConfirmation.set(false);
  }

  async confirmApplyLeave(): Promise<void> {
    if (this.isSubmitting()) return;

    if (this.isSubmittedToday() || this.hasEnteredToday()) {
      this.showLeaveConfirmation.set(false);
      this.snackbarService.error('You have already marked attendance for today.');
      return;
    }

    const currentTime = new Date();

    const log: EntryLog = {
      entryTime: currentTime.toISOString(),
      exitTime: currentTime.toISOString(),
      date: this.getISTDateStringFromDate(currentTime),
    };

    const submitted = await this.submitAttendance(log, {
      companyName: '',
      comment: 'Day Off - Leave Applied',
      status: 'Day Off',
    });

    if (submitted) {
      this.showLeaveConfirmation.set(false);
    }
  }

  handleEntrySubmit(useCustomTime: boolean, customDateTimeValue?: string): void {
    let entryTime: Date;

    if (useCustomTime && customDateTimeValue) {
      entryTime = new Date(customDateTimeValue);
    } else {
      entryTime = new Date();
    }

    // Get date in Asia/Kolkata (IST) timezone
    const istDate = new Date(entryTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    const istDateString = `${year}-${month}-${day}`;

    const log: EntryLog = {
      entryTime: entryTime.toISOString(),
      date: istDateString,
    };

    this.storageService.saveEntryLog(log);
    this.entryLog.set(log);

    // Notify attendance state service to trigger reactivity
    this.attendanceState.notifyLocalStorageChanged();

    // Auto-enable todo list after entry
    if (!this.showTodoList()) {
      this.showTodoList.set(true);
      const settings = this.storageService.getSettings();
      settings.showTodoList = true;
      this.storageService.saveSettings(settings);
    }

    this.closeEntryDialog();
  }

  openExitDialog(): void {
    const log = this.entryLog();
    const canExit = this.hasEnteredToday() || (log && log.entryTime && !log.exitTime);
    if (!canExit) {
      this.snackbarService.error('Please mark entry first before exit!');
      return;
    }

    if (this.hasExitedToday()) {
      this.snackbarService.error('You have already marked exit for today.');
      return;
    }

    const now = new Date();
    this.selectedExitStatus.set('Office');
    this.exitEntryDateTime.set(this.formatForDateTimeLocal(new Date(log?.entryTime || now)));
    this.exitExitDateTime.set(this.formatForDateTimeLocal(now));
    this.showExitDialog.set(true);
  }

  closeExitDialog(): void {
    if (this.isSubmitting()) return;
    this.showExitDialog.set(false);
  }

  async handleExitSubmit(formData: {
    entryDateTime: string;
    exitDateTime: string;
    companyName: string;
    comment: string;
    status: string;
  }): Promise<void> {
    if (this.isSubmitting()) return;

    const log = this.entryLog();
    if (!log) return;

    const entryTime = new Date(formData.entryDateTime);
    const exitTime = new Date(formData.exitDateTime);
    if (isNaN(entryTime.getTime()) || isNaN(exitTime.getTime())) {
      this.snackbarService.error('Please enter valid entry and exit times.');
      return;
    }

    if (exitTime < entryTime) {
      this.snackbarService.error('Exit time cannot be before entry time.');
      return;
    }

    const submittedLog: EntryLog = {
      ...log,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      date: this.getISTDateStringFromDate(entryTime),
    };

    await this.submitAttendance(submittedLog, {
      companyName: formData.companyName,
      comment: formData.comment,
      status: formData.status,
    });
  }

  private async submitAttendance(
    submittedLog: EntryLog,
    formData: { companyName: string; comment: string; status: string },
  ): Promise<boolean> {
    this.isSubmitting.set(true);
    this.snackbarService.info('Submitting attendance...', 5000);

    try {
      await this.submitToGoogleForms(submittedLog, formData);

      submittedLog.isSubmitted = true;
      this.storageService.saveEntryLog(submittedLog);
      this.entryLog.set({ ...submittedLog });
      this.attendanceState.notifyLocalStorageChanged();

      this.pendingFormData.set(null);
      this.showExitDialog.set(false);
      this.snackbarService.success('Attendance submitted successfully.');
      this.attendanceState.fetchAttendanceData();
      return true;
    } catch (error) {
      console.error('Attendance submission error:', error);
      this.snackbarService.error('Failed to submit attendance. Please try again.');
      return false;
    } finally {
      this.isSubmitting.set(false);
    }
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
    // User closed without submitting - revert exit time & isSubmitted only for today's entry
    const pending = this.pendingFormData();
    if (pending) {
      const log = pending.log;
      log.exitTime = undefined;
      log.isSubmitted = undefined;
      this.storageService.saveEntryLog(log);
      this.entryLog.set({ ...log });

      // Notify attendance state service to trigger reactivity
      this.attendanceState.notifyLocalStorageChanged();
    }

    this.showGoogleFormDialog.set(false);
    this.pendingFormData.set(null);
    this.selectedPastDate.set(''); // Clear past date selection
  }

  onGoogleFormSubmitted(): void {
    // Form was actually submitted - now mark as submitted
    const pending = this.pendingFormData();
    if (pending) {
      const log = pending.log;
      log.isSubmitted = true;
      this.storageService.saveEntryLog(log);
      this.entryLog.set({ ...log });

      // Notify attendance state service to trigger reactivity
      this.attendanceState.notifyLocalStorageChanged();
    }

    this.showGoogleFormDialog.set(false);
    this.pendingFormData.set(null);
    this.selectedPastDate.set(''); // Clear past date selection

    // Refresh attendance data to show the newly added entry
    this.attendanceState.fetchAttendanceData();
  }

  buildGoogleFormUrl(log: EntryLog, formData: { companyName: string; comment: string; status: string }): string {
    // Get Form ID from environment
    const formId = env.YOUR_FORM_ID;

    // Base URL for embedded form
    const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;

    // Format times to YYYY-MM-DD HH:mm format for Google Forms
    const entryTime = this.formatForGoogleForm(new Date(log.entryTime));
    const exitTime = this.formatForGoogleForm(new Date(log.exitTime!));

    // Build query parameters with actual field IDs
    const params = new URLSearchParams({
      usp: 'pp_url',
      [this.googleFormEntryIds.entryTime]: entryTime, // Entry Time (required)
      [this.googleFormEntryIds.exitTime]: exitTime, // Exit Time (required)
      [this.googleFormEntryIds.companyName]: formData.companyName || '', // Company Name (optional)
      [this.googleFormEntryIds.comment]: formData.comment || '', // Comments (optional)
      [this.googleFormEntryIds.status]: formData.status || 'Office', // Status (radio button)
      embedded: 'true',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private async submitToGoogleForms(
    log: EntryLog,
    formData: { companyName: string; comment: string; status: string },
  ): Promise<void> {
    const formUrl = `https://docs.google.com/forms/d/e/${env.YOUR_FORM_ID}/formResponse`;
    const formBody = this.buildGoogleFormBody(log, formData);

    await fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });
  }

  private buildGoogleFormBody(
    log: EntryLog,
    formData: { companyName: string; comment: string; status: string },
  ): string {
    const entryTime = this.formatForGoogleForm(new Date(log.entryTime));
    const exitTime = this.formatForGoogleForm(new Date(log.exitTime!));

    const formBody = new URLSearchParams();
    formBody.append(this.googleFormEntryIds.entryTime, entryTime);
    formBody.append(this.googleFormEntryIds.exitTime, exitTime);
    formBody.append(this.googleFormEntryIds.companyName, formData.companyName || '');
    formBody.append(this.googleFormEntryIds.comment, formData.comment || '');
    formBody.append(this.googleFormEntryIds.status, formData.status || 'Office');

    return formBody.toString();
  }

  cancelSubmission(): void {
    // Optionally clear exit time & IsSubmitted if user cancels
    const log = this.entryLog();
    if (log) {
      log.exitTime = undefined;
      log.isSubmitted = undefined;
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

  toggleTodoList(): void {
    const newValue = !this.showTodoList();
    this.showTodoList.set(newValue);
    const settings = this.storageService.getSettings();
    settings.showTodoList = newValue;
    this.storageService.saveSettings(settings);
  }

  private getISTDateStringFromDate(date: Date): string {
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatForDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
      hour12: true,
    });
  }

  private formatTimeString(timeStr: string): string {
    if (!timeStr) return '';
    try {
      // Handle format: "12/1/2025 21:38:00"
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return this.formatTo12Hour(date);
    } catch {
      return timeStr;
    }
  }

  private formatTimeOnly(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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

  private getDateFromTimeString(timeStr: string): string {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  openPastDateDialog(): void {
    this.showPastDateDialog.set(true);
  }

  closePastDateDialog(): void {
    this.showPastDateDialog.set(false);
    this.selectedPastDate.set('');
  }

  handlePastDateSelected(dateStr: string): void {
    if (!dateStr) {
      this.snackbarService.error('Please select a date');
      return;
    }

    // Validate that the date is in the past
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate >= today) {
      this.snackbarService.error('Please select a past date (not today or future)');
      return;
    }

    this.selectedPastDate.set(dateStr);
    this.showPastDateDialog.set(false);
    this.showPastActionDialog.set(true);
  }

  closePastActionDialog(): void {
    this.showPastActionDialog.set(false);
    // Keep selectedPastDate for potential back navigation
  }

  applyLeaveForPastDate(): void {
    const dateStr = this.selectedPastDate();
    if (!dateStr) return;

    // Parse the selected date
    const dateObj = new Date(dateStr + 'T00:00:00');

    // Set entry and exit time to noon of that day
    const entryTime = new Date(dateObj);
    entryTime.setHours(12, 0, 0, 0);

    const exitTime = new Date(dateObj);
    exitTime.setHours(12, 0, 0, 0);

    // Build Google Form URL with Day Off data
    const formUrl = this.buildGoogleFormUrlForPastDate(entryTime, exitTime, '', 'Day Off - Leave Applied', 'Day Off');
    this.googleFormUrl.set(formUrl);

    this.closePastActionDialog();
    this.showGoogleFormDialog.set(true);
  }

  addEntryForPastDate(): void {
    const dateStr = this.selectedPastDate();
    if (!dateStr) return;

    // Parse the selected date
    const dateObj = new Date(dateStr + 'T00:00:00');

    // Set entry time to 9 AM and exit time to 6 PM of that day
    const entryTime = new Date(dateObj);
    entryTime.setHours(9, 0, 0, 0);

    const exitTime = new Date(dateObj);
    exitTime.setHours(18, 0, 0, 0);

    // Build Google Form URL with default entry/exit times
    const formUrl = this.buildGoogleFormUrlForPastDate(entryTime, exitTime, '', '', 'Office');
    this.googleFormUrl.set(formUrl);

    this.closePastActionDialog();
    this.showGoogleFormDialog.set(true);
  }

  private buildGoogleFormUrlForPastDate(
    entryTime: Date,
    exitTime: Date,
    companyName: string,
    comment: string,
    status: string,
  ): string {
    const formId = env.YOUR_FORM_ID;
    const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;

    const formattedEntry = this.formatForGoogleForm(entryTime);
    const formattedExit = this.formatForGoogleForm(exitTime);

    const params = new URLSearchParams({
      usp: 'pp_url',
      'entry.160031710': formattedEntry, // Entry Time
      'entry.1057727999': formattedExit, // Exit Time
      'entry.302638121': companyName, // Company Name
      'entry.1773816160': comment, // Comments
      'entry.1264867401': status, // Status
      embedded: 'true',
    });

    return `${baseUrl}?${params.toString()}`;
  }
}
