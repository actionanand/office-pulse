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
  protected readonly attendanceDatabase = inject(AttendanceDatabaseService);

  protected readonly pinDialogOpen = signal(false);
  protected readonly confirmRemove = signal(false);
  protected readonly savingPin = signal(false);
  protected readonly formError = signal('');
  protected readonly autoLockPickerOpen = signal(false);
  protected readonly backupDialogOpen = signal(false);
  protected readonly restoreDialogOpen = signal(false);
  protected readonly confirmRestore = signal(false);
  protected readonly portabilityBusy = signal(false);
  protected readonly portabilityError = signal('');
  protected readonly backupPassword = signal('');
  protected readonly backupConfirmation = signal('');
  protected readonly restorePassword = signal('');
  protected readonly restoreFile = signal<File | null>(null);
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
    this.portabilityError.set('');
    this.restoreDialogOpen.set(true);
  }

  protected closeRestoreDialog(): void {
    if (!this.portabilityBusy()) this.restoreDialogOpen.set(false);
  }

  protected requestRestore(): void {
    if (this.restorePassword().length < 8) {
      this.portabilityError.set('Enter the password used when this backup was created.');
      return;
    }
    this.restoreDialogOpen.set(false);
    this.confirmRestore.set(true);
  }

  protected async restoreAttendanceBackup(): Promise<void> {
    const file = this.restoreFile();
    this.confirmRestore.set(false);
    if (!file) return;

    this.portabilityBusy.set(true);
    try {
      const count = await this.attendanceBackup.restoreEncryptedBackup(file, this.restorePassword());
      this.restoreFile.set(null);
      this.snackbar.success(`Restored ${count} attendance record${count === 1 ? '' : 's'}.`);
    } catch (error) {
      this.portabilityError.set(this.errorMessage(error, 'Unable to restore the attendance backup.'));
      this.restoreDialogOpen.set(true);
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

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
