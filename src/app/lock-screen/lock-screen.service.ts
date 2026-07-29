import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '../services/auth.service';
import { SecuritySettingsService } from '../services/security-settings.service';
import { SecurityService } from '../services/security.service';

export type LockMode = 'password' | 'pin';

@Injectable({
  providedIn: 'root',
})
export class LockScreenService {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SecuritySettingsService);
  private readonly security = inject(SecurityService);
  private pendingUrl: string | null = null;
  private backgroundedAt: number | null = null;
  private readonly primaryAuthenticatedAtStartup = this.auth.hasStoredAuth();

  private readonly _isAuthenticated = signal(
    this.primaryAuthenticatedAtStartup && !this.settings.settings().pinEnabled,
  );
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private readonly _showLockScreen = signal(!this.primaryAuthenticatedAtStartup || this.settings.settings().pinEnabled);
  readonly showLockScreen = this._showLockScreen.asReadonly();

  private readonly _lockMode = signal<LockMode>(
    this.primaryAuthenticatedAtStartup && this.settings.settings().pinEnabled ? 'pin' : 'password',
  );
  readonly lockMode = this._lockMode.asReadonly();

  checkAuthentication(): boolean {
    if (!this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return false;
    }

    if (!this.settings.settings().pinEnabled) {
      this._isAuthenticated.set(true);
      return true;
    }

    if (!this._isAuthenticated()) {
      this._lockMode.set('pin');
      this._showLockScreen.set(true);
      return false;
    }

    return true;
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!(await this.auth.login(password))) return false;

    if (this.settings.settings().pinEnabled) {
      this._lockMode.set('pin');
      this._isAuthenticated.set(false);
      this._showLockScreen.set(true);
    } else {
      this._isAuthenticated.set(true);
    }
    return true;
  }

  async validatePin(pin: string): Promise<boolean> {
    if (!this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return false;
    }

    const valid = await this.security.verifyPin(pin, this.settings.settings());
    if (valid) {
      this._isAuthenticated.set(true);
    }
    return valid;
  }

  showLock(): void {
    if (!this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return;
    }

    this._lockMode.set(this.settings.settings().pinEnabled ? 'pin' : 'password');
    this._showLockScreen.set(true);
  }

  setPendingUrl(url: string): void {
    this.pendingUrl = url || '/';
  }

  consumePendingUrl(): string | null {
    const url = this.pendingUrl;
    this.pendingUrl = null;
    return url;
  }

  hideLock(): void {
    if (this._isAuthenticated()) {
      this._showLockScreen.set(false);
    }
  }

  lock(): void {
    if (!this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return;
    }
    if (!this.settings.settings().pinEnabled) return;

    this._isAuthenticated.set(false);
    this._lockMode.set('pin');
    this._showLockScreen.set(true);
  }

  pinConfigured(hideLockScreen = true): void {
    if (!this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return;
    }

    this._isAuthenticated.set(true);
    if (hideLockScreen) {
      this._showLockScreen.set(false);
    }
  }

  pinRemoved(): void {
    if (this.auth.hasStoredAuth()) {
      this._isAuthenticated.set(true);
      this._showLockScreen.set(false);
    } else {
      this.requirePrimaryLogin();
    }
  }

  biometricUnlock(): void {
    if (this.auth.hasStoredAuth() && this.settings.settings().pinEnabled && this.settings.settings().biometricEnabled) {
      this._isAuthenticated.set(true);
    }
  }

  handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && !this.auth.hasStoredAuth()) {
      this.requirePrimaryLogin();
      return;
    }

    const settings = this.settings.settings();
    if (!settings.pinEnabled || !settings.lockInBackground) {
      this.backgroundedAt = null;
      return;
    }

    if (document.visibilityState === 'hidden') {
      this.backgroundedAt = Date.now();
      return;
    }

    if (this.backgroundedAt !== null) {
      const elapsed = Date.now() - this.backgroundedAt;
      this.backgroundedAt = null;
      if (elapsed >= settings.autoLockMinutes * 60_000) {
        this.lock();
      }
    }
  }

  private requirePrimaryLogin(): void {
    this._isAuthenticated.set(false);
    this._lockMode.set('password');
    this._showLockScreen.set(true);
  }
}
