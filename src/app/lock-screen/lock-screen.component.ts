import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthService } from '../services/auth.service';
import { SecuritySettingsService } from '../services/security-settings.service';
import { SecurityService } from '../services/security.service';
import { LockScreenService } from './lock-screen.service';

@Component({
  selector: 'app-lock-screen',
  imports: [FormsModule, LucideDynamicIcon],
  templateUrl: './lock-screen.component.html',
  styleUrl: './lock-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockScreenComponent implements OnInit {
  private readonly lockService = inject(LockScreenService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly settings = inject(SecuritySettingsService);
  protected readonly security = inject(SecurityService);
  protected readonly lockMode = this.lockService.lockMode;

  protected readonly password = signal<string>('');
  protected readonly pin = signal<string>('');
  protected readonly errorMessage = signal<string>('');
  protected readonly isLoading = signal<boolean>(false);
  protected readonly resetOpen = signal(false);
  protected readonly resetStep = signal<'password' | 'pin'>('password');
  protected readonly masterPassword = signal('');
  protected readonly newPin = signal('');
  protected readonly confirmPin = signal('');
  protected readonly resetError = signal('');
  protected readonly resetBusy = signal(false);

  ngOnInit(): void {
    if (this.lockMode() === 'pin' && this.settings.settings().biometricEnabled && this.security.biometricAvailable) {
      window.setTimeout(() => this.security.requestBiometric(), 250);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.lockMode() === 'password') {
      await this.submitPassword();
      return;
    }

    await this.submitPin();
  }

  protected onPasswordChange(value: string): void {
    this.password.set(value);
    this.errorMessage.set('');
  }

  protected onPinChange(value: string): void {
    this.pin.set(value.replace(/\D/g, '').slice(0, 8));
    this.errorMessage.set('');
  }

  private async submitPassword(): Promise<void> {
    if (!this.password()) {
      this.errorMessage.set('Password is required.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      if (!(await this.lockService.validatePassword(this.password()))) {
        this.errorMessage.set('Invalid password. Please try again.');
        this.password.set('');
        return;
      }

      this.password.set('');
      if (this.lockMode() === 'pin') {
        if (this.settings.settings().biometricEnabled && this.security.biometricAvailable) {
          window.setTimeout(() => this.security.requestBiometric(), 250);
        }
        return;
      }

      await this.finishUnlock();
    } finally {
      this.isLoading.set(false);
    }
  }

  private async submitPin(): Promise<void> {
    const value = this.pin();

    if (!/^\d{4,8}$/.test(value)) {
      this.errorMessage.set('Enter your 4 to 8 digit PIN.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      if (await this.lockService.validatePin(value)) {
        await this.finishUnlock();
      } else {
        this.errorMessage.set(this.lockMode() === 'password' ? 'Please sign in again.' : 'Wrong PIN. Try again.');
        this.pin.set('');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private async finishUnlock(): Promise<void> {
    const targetUrl = this.lockService.consumePendingUrl() ?? this.router.url ?? '/';
    await this.router.navigateByUrl('/__office_pulse_auth_resume', { skipLocationChange: true });
    await this.router.navigateByUrl(targetUrl, { replaceUrl: true });
    this.lockService.hideLock();
  }

  protected openReset(): void {
    this.resetStep.set('password');
    this.masterPassword.set('');
    this.newPin.set('');
    this.confirmPin.set('');
    this.resetError.set('');
    this.resetOpen.set(true);
  }

  protected closeReset(): void {
    this.resetOpen.set(false);
    this.resetBusy.set(false);
    this.resetError.set('');
    this.masterPassword.set('');
    this.newPin.set('');
    this.confirmPin.set('');
  }

  protected onMasterPasswordChange(value: string): void {
    this.masterPassword.set(value);
    this.resetError.set('');
  }

  protected onNewPinChange(value: string): void {
    this.newPin.set(value.replace(/\D/g, '').slice(0, 8));
    this.resetError.set('');
  }

  protected onConfirmPinChange(value: string): void {
    this.confirmPin.set(value.replace(/\D/g, '').slice(0, 8));
    this.resetError.set('');
  }

  protected async verifyMasterPassword(): Promise<void> {
    if (!this.masterPassword()) {
      this.resetError.set('Enter the master password.');
      return;
    }

    this.resetBusy.set(true);
    try {
      if (!(await this.auth.verifyPassword(this.masterPassword()))) {
        this.resetError.set('Incorrect master password.');
        this.masterPassword.set('');
        return;
      }

      this.masterPassword.set('');
      this.resetError.set('');
      this.resetStep.set('pin');
    } catch {
      this.resetError.set('Password verification failed. Please try again.');
    } finally {
      this.resetBusy.set(false);
    }
  }

  protected async saveResetPin(): Promise<void> {
    const pin = this.newPin();
    if (!/^\d{4,8}$/.test(pin) || pin !== this.confirmPin()) {
      this.resetError.set('Use 4 to 8 digits and enter the same PIN twice.');
      return;
    }

    this.resetBusy.set(true);
    try {
      const credentials = await this.security.createPin(pin);
      this.security.disableBiometric();
      this.settings.update({
        pinEnabled: true,
        biometricEnabled: false,
        ...credentials,
      });
      this.pin.set('');
      this.errorMessage.set('');
      this.lockService.pinConfigured(false);
      this.closeReset();
      await this.finishUnlock();
    } catch {
      this.resetError.set('PIN reset failed. Please try again.');
    } finally {
      this.resetBusy.set(false);
    }
  }
}
