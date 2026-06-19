import { Injectable, signal } from '@angular/core';
import { LOCK_SCREEN_CONFIG, LockScreenConfig } from './lock-screen.config';

interface AuthData {
  passwordHash: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class LockScreenService {
  private readonly config: LockScreenConfig = LOCK_SCREEN_CONFIG;
  private pendingUrl = '/';

  // Signal to track authentication state
  private readonly _isAuthenticated = signal<boolean>(false);
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  // Signal to track if lock screen should be shown
  private readonly _showLockScreen = signal<boolean>(false);
  readonly showLockScreen = this._showLockScreen.asReadonly();

  constructor() {
    // Check authentication status on service initialization
    this.checkAuthentication();
  }

  /**
   * Check if user is authenticated and session is still valid
   */
  checkAuthentication(): boolean {
    const authData = this.getAuthData();

    if (!authData) {
      this._isAuthenticated.set(false);
      return false;
    }

    // Check if password hash matches
    if (authData.passwordHash !== this.config.passwordHash) {
      // Password has changed, clear storage and require re-authentication
      this.clearAuth();
      this._isAuthenticated.set(false);
      return false;
    }

    // Check expiry if configured
    if (this.config.expiryTime > 0) {
      const now = Date.now();
      const elapsed = now - authData.timestamp;

      if (elapsed > this.config.expiryTime) {
        // Session expired
        this.clearAuth();
        this._isAuthenticated.set(false);
        return false;
      }
    }

    this._isAuthenticated.set(true);
    return true;
  }

  /**
   * Validate password against the configured hash
   */
  async validatePassword(password: string): Promise<boolean> {
    const hash = await this.sha1(password);

    if (hash === this.config.passwordHash) {
      this.saveAuth(hash);
      this._isAuthenticated.set(true);
      return true;
    }

    return false;
  }

  /**
   * Show the lock screen
   */
  showLock(): void {
    this._showLockScreen.set(true);
  }

  setPendingUrl(url: string): void {
    this.pendingUrl = url || '/';
  }

  consumePendingUrl(): string {
    const url = this.pendingUrl;
    this.pendingUrl = '/';
    return url;
  }

  /**
   * Hide the lock screen
   */
  hideLock(): void {
    this._showLockScreen.set(false);
  }

  /**
   * Lock the application (clear auth and show lock screen)
   */
  lock(): void {
    this.clearAuth();
    this._isAuthenticated.set(false);
    this._showLockScreen.set(true);
  }

  /**
   * Get authentication data from localStorage
   */
  private getAuthData(): AuthData | null {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save authentication data to localStorage
   */
  private saveAuth(passwordHash: string): void {
    const authData: AuthData = {
      passwordHash,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.config.storageKey, JSON.stringify(authData));
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearAuth(): void {
    localStorage.removeItem(this.config.storageKey);
  }

  /**
   * Generate SHA1 hash of a string
   */
  private async sha1(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get UI configuration
   */
  getConfig(): LockScreenConfig {
    return this.config;
  }
}
