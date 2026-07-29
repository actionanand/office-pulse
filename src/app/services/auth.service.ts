import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

interface StoredAuth {
  readonly passwordHash: string;
  readonly timestamp: number;
}

const AUTH_STORAGE_KEY = 'angular_lock_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  hasStoredAuth(): boolean {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return false;

      // Keep compatibility with both the original Office Pulse object and
      // the reference project's hash-only storage format.
      if (raw === environment.passwordHash) return true;

      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      const valid = parsed.passwordHash === environment.passwordHash;
      if (!valid) {
        this.logout();
      }
      return valid;
    } catch {
      this.logout();
      return false;
    }
  }

  async login(password: string): Promise<boolean> {
    if (!(await this.verifyPassword(password))) return false;

    const auth: StoredAuth = {
      passwordHash: environment.passwordHash,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    return true;
  }

  async verifyPassword(password: string): Promise<boolean> {
    const hash = await this.sha1(password);
    return hash === environment.passwordHash;
  }

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  private async sha1(message: string): Promise<string> {
    const buffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
