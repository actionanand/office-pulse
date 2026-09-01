import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { LockScreenService } from '../../lock-screen/lock-screen.service';
import { SecuritySettingsService } from '../../services/security-settings.service';
import { SecurityService } from '../../services/security.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AttendanceBackupService } from '../../services/attendance-backup.service';
import { AttendanceDatabaseService } from '../../services/attendance-database.service';
import { AppThemeId, ThemeService } from '../../services/theme.service';
import { AttendanceDbRecord } from '../../models/attendance-db.model';
import { AppLocalDataDatabaseService } from '../../services/app-local-data-database.service';

const DEFAULT_COMPANY_KEY = 'office_pulse_default_company_name';

@Component({
  selector: 'app-settings',
  imports: [ConfirmationPopupComponent, ReactiveFormsModule, LucideDynamicIcon],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:biometric-enabled)': 'onBiometricEnabled()',
  },
})
export class SettingsComponent {
  protected readonly settings = inject(SecuritySettingsService);
  protected readonly security = inject(SecurityService);
  private readonly lockScreen = inject(LockScreenService);
  private readonly snackbar = inject(SnackbarService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly attendanceBackup = inject(AttendanceBackupService);
  private readonly appLocalData = inject(AppLocalDataDatabaseService);
  protected readonly attendanceDatabase = inject(AttendanceDatabaseService);
  protected readonly theme = inject(ThemeService);

  protected readonly pinDialogOpen = signal(false);
  protected readonly confirmRemove = signal(false);
  protected readonly savingPin = signal(false);
  protected readonly formError = signal('');
  protected readonly autoLockPickerOpen = signal(false);
  protected readonly backupDialogOpen = signal(false);
  protected readonly restoreDialogOpen = signal(false);
  protected readonly portabilityBusy = signal(false);
  protected readonly portabilityError = signal('');
  protected readonly backupPassword = signal('');
  protected readonly backupConfirmation = signal('');
  protected readonly restorePassword = signal('');
  protected readonly defaultCompanyName = signal('');
  protected readonly defaultCompanySaving = signal(false);
  protected readonly showBackupPassword = signal(false);
  protected readonly showBackupConfirmation = signal(false);
  protected readonly showRestorePassword = signal(false);
  protected readonly restoreFile = signal<File | null>(null);
  protected readonly restoreChoiceOpen = signal(false);
  protected readonly pendingRestoreRecords = signal<readonly AttendanceDbRecord[]>([]);
  protected readonly pendingRestoreCount = computed(() => this.pendingRestoreRecords().length);
  protected readonly currentAttendanceCount = computed(() => this.attendanceDatabase.records().length);
  protected readonly restoreChoiceSummary = computed(
    () =>
      `${this.pendingRestoreCount()} backup record${this.pendingRestoreCount() === 1 ? '' : 's'} verified. ${this.currentAttendanceCount()} record${this.currentAttendanceCount() === 1 ? '' : 's'} currently exist on this device.`,
  );
  protected readonly pinForm = this.formBuilder.nonNullable.group({
    pin: ['', [Validators.required, Validators.pattern(/^\d{4,8}$/)]],
    confirmation: ['', [Validators.required, Validators.pattern(/^\d{4,8}$/)]],
  });
  protected readonly autoLockOptions = [
    { value: 0, label: 'Immediately' },
    { value: 1, label: 'After 1 minute' },
    { value: 5, label: 'After 5 minutes' },
    { value: 10, label: 'After 10 minutes' },
    { value: 15, label: 'After 15 minutes' },
    { value: 30, label: 'After 30 minutes' },
    { value: 60, label: 'After 1 hour' },
  ] as const;
  protected readonly selectedAutoLockLabel = computed(
    () =>
      this.autoLockOptions.find(option => option.value === this.settings.settings().autoLockMinutes)?.label ??
      'After 5 minutes',
  );

  protected readonly biometricDescription = computed(() => {
    if (!this.security.biometricAvailable) return 'Available in the Android app on supported devices';
    if (!this.settings.settings().pinEnabled) return 'Set a PIN first';
    return this.settings.settings().biometricEnabled ? 'Enabled with PIN fallback' : 'Use your enrolled fingerprint';
  });

  private readonly autoLockTrigger = viewChild.required<ElementRef<HTMLButtonElement>>('autoLockTrigger');
  private readonly autoLockSheet = viewChild<ElementRef<HTMLElement>>('autoLockSheet');

  constructor() {
    void this.attendanceDatabase.initialize();
    this.defaultCompanyName.set(this.appLocalData.getItem(DEFAULT_COMPANY_KEY) ?? '');
    effect(onCleanup => {
      if (!this.autoLockPickerOpen()) return;

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => {
        const sheet = this.autoLockSheet()?.nativeElement;
        const selected = sheet?.querySelector<HTMLElement>('.picker-option.selected');
        (selected ?? sheet)?.focus();
      });

      onCleanup(() => {
        document.body.style.overflow = previousOverflow;
      });
    });
  }

  protected openPinDialog(): void {
    this.formError.set('');
    this.pinForm.reset({ pin: '', confirmation: '' });
    this.pinDialogOpen.set(true);
  }

  protected closePinDialog(): void {
    this.pinDialogOpen.set(false);
    this.formError.set('');
  }

  protected async savePin(): Promise<void> {
    const { pin, confirmation } = this.pinForm.getRawValue();
    if (this.pinForm.invalid || pin !== confirmation) {
      this.formError.set('Use 4 to 8 digits and enter the same PIN twice.');
      return;
    }

    this.savingPin.set(true);
    try {
      const credentials = await this.security.createPin(pin);
      this.security.disableBiometric();
      this.settings.update({
        pinEnabled: true,
        biometricEnabled: false,
        ...credentials,
      });
      this.lockScreen.pinConfigured();
      this.closePinDialog();
      this.snackbar.success('PIN protection enabled.');
    } catch {
      this.formError.set('PIN setup failed. Please try again.');
    } finally {
      this.savingPin.set(false);
    }
  }

  protected toggleBiometric(): void {
    const current = this.settings.settings();
    if (!current.pinEnabled || !current.pinVerifier) {
      this.snackbar.warning('Set a PIN before enabling fingerprint unlock.');
      return;
    }
    if (!this.security.biometricAvailable) {
      this.snackbar.info('Fingerprint unlock is only available in the supported Android app.');
      return;
    }

    if (current.biometricEnabled) {
      this.security.disableBiometric();
      this.settings.update({ biometricEnabled: false });
      this.snackbar.success('Fingerprint unlock disabled.');
      return;
    }

    if (this.security.enableBiometric(current.pinVerifier)) {
      this.snackbar.info('Confirm your fingerprint in the Android prompt.');
    }
  }

  protected onBiometricEnabled(): void {
    this.settings.update({ biometricEnabled: true });
    this.snackbar.success('Fingerprint unlock enabled.');
  }

  protected toggleBackgroundLock(): void {
    this.settings.update({ lockInBackground: !this.settings.settings().lockInBackground });
  }

  protected openAutoLockPicker(): void {
    if (this.settings.settings().pinEnabled && this.settings.settings().lockInBackground) {
      this.autoLockPickerOpen.set(true);
    }
  }

  protected closeAutoLockPicker(): void {
    if (!this.autoLockPickerOpen()) return;

    this.autoLockPickerOpen.set(false);
    window.setTimeout(() => this.autoLockTrigger().nativeElement.focus());
  }

  protected selectAutoLock(value: number): void {
    this.settings.update({ autoLockMinutes: value });
    this.closeAutoLockPicker();
    this.snackbar.success('Auto-lock timing updated.');
  }

  protected selectTheme(theme: AppThemeId): void {
    if (theme === this.theme.activeTheme()) return;
    this.theme.setTheme(theme);
    this.snackbar.success('Theme updated.');
  }

  protected saveDefaultCompanyName(): void {
    if (this.defaultCompanySaving()) return;
    const value = this.defaultCompanyName().trim();
    this.defaultCompanySaving.set(true);
    try {
      if (value) this.appLocalData.setItem(DEFAULT_COMPANY_KEY, value);
      else this.appLocalData.removeItem(DEFAULT_COMPANY_KEY);
      this.defaultCompanyName.set(value);
      this.snackbar.success(value ? 'Default company saved.' : 'Default company cleared.');
    } finally {
      this.defaultCompanySaving.set(false);
    }
  }

  protected setDefaultCompanyName(event: Event): void {
    this.defaultCompanyName.set((event.target as HTMLInputElement).value);
  }

  protected onAutoLockBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeAutoLockPicker();
    }
  }

  protected onAutoLockPickerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAutoLockPicker();
      return;
    }

    if (event.key !== 'Tab') return;

    const sheet = this.autoLockSheet()?.nativeElement;
    const focusable = Array.from(sheet?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      sheet?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected lockNow(): void {
    this.lockScreen.lock();
  }

  protected removePin(): void {
    this.security.disableBiometric();
    this.settings.removePin();
    this.lockScreen.pinRemoved();
    this.confirmRemove.set(false);
    this.snackbar.success('PIN protection removed.');
  }

  protected openBackupDialog(): void {
    this.portabilityError.set('');
    this.backupPassword.set('');
    this.backupConfirmation.set('');
    this.showBackupPassword.set(false);
    this.showBackupConfirmation.set(false);
    this.backupDialogOpen.set(true);
  }

  protected closeBackupDialog(): void {
    if (!this.portabilityBusy()) this.backupDialogOpen.set(false);
  }

  protected async createAttendanceBackup(): Promise<void> {
    const password = this.backupPassword();
    if (password.length < 8 || password !== this.backupConfirmation()) {
      this.portabilityError.set('Use at least 8 characters and enter the same password twice.');
      return;
    }

    this.portabilityBusy.set(true);
    this.portabilityError.set('');
    try {
      const count = await this.attendanceBackup.createEncryptedBackup(password);
      this.backupDialogOpen.set(false);
      this.snackbar.success(`Encrypted backup created with ${count} attendance record${count === 1 ? '' : 's'}.`);
    } catch (error) {
      this.portabilityError.set(this.errorMessage(error, 'Unable to create the attendance backup.'));
    } finally {
      this.portabilityBusy.set(false);
    }
  }

  protected chooseRestoreFile(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  protected onRestoreFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.restoreFile.set(file);
    this.restorePassword.set('');
    this.showRestorePassword.set(false);
    this.pendingRestoreRecords.set([]);
    this.portabilityError.set('');
    this.restoreDialogOpen.set(true);
  }

  protected closeRestoreDialog(): void {
    if (!this.portabilityBusy()) this.restoreDialogOpen.set(false);
  }

  protected async requestRestore(): Promise<void> {
    if (this.restorePassword() && this.restorePassword().length < 8) {
      this.portabilityError.set('Backup passwords must be at least 8 characters.');
      return;
    }
    const file = this.restoreFile();
    if (!file) return;

    this.portabilityBusy.set(true);
    this.portabilityError.set('');
    try {
      const records = await this.attendanceBackup.prepareRestore(file, this.restorePassword());
      this.pendingRestoreRecords.set(records);
      this.restoreDialogOpen.set(false);
      this.restoreChoiceOpen.set(true);
    } catch (error) {
      this.portabilityError.set(this.errorMessage(error, 'Unable to read the attendance backup.'));
      this.snackbar.error(this.portabilityError());
    } finally {
      this.portabilityBusy.set(false);
    }
  }

  protected cancelRestoreChoice(): void {
    if (this.portabilityBusy()) return;
    this.restoreChoiceOpen.set(false);
    this.restoreFile.set(null);
    this.pendingRestoreRecords.set([]);
    this.restorePassword.set('');
  }

  protected async restoreAttendanceBackup(mode: 'merge' | 'replace'): Promise<void> {
    const records = this.pendingRestoreRecords();
    this.restoreDialogOpen.set(false);
    this.restoreChoiceOpen.set(false);
    if (!records.length) return;

    this.portabilityBusy.set(true);
    try {
      const count = await this.attendanceBackup.restoreRecords(records, mode);
      this.restoreFile.set(null);
      this.pendingRestoreRecords.set([]);
      this.restorePassword.set('');
      const action = mode === 'replace' ? 'Restored' : 'Merged';
      this.snackbar.success(`${action} ${count} attendance record${count === 1 ? '' : 's'}.`);
    } catch (error) {
      this.portabilityError.set(this.errorMessage(error, 'Unable to restore the attendance backup.'));
      this.restoreChoiceOpen.set(true);
      this.snackbar.error(this.portabilityError());
    } finally {
      this.portabilityBusy.set(false);
    }
  }

  protected setBackupPassword(event: Event): void {
    this.backupPassword.set((event.target as HTMLInputElement).value);
  }

  protected setBackupConfirmation(event: Event): void {
    this.backupConfirmation.set((event.target as HTMLInputElement).value);
  }

  protected setRestorePassword(event: Event): void {
    this.restorePassword.set((event.target as HTMLInputElement).value);
  }

  protected toggleBackupPasswordVisibility(): void {
    this.showBackupPassword.update(value => !value);
  }

  protected toggleBackupConfirmationVisibility(): void {
    this.showBackupConfirmation.update(value => !value);
  }

  protected toggleRestorePasswordVisibility(): void {
    this.showRestorePassword.update(value => !value);
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
