/**
 * Utility script for testing and managing the lock screen system
 *
 * You can run these functions in the browser console:
 *
 * Example usage:
 * - LockScreenUtils.generateHash('mypassword')
 * - LockScreenUtils.clearAuth()
 * - LockScreenUtils.getStoredAuth()
 * - LockScreenUtils.testExpiry(10000) // Test with 10 second expiry
 */

interface AuthData {
  passwordHash: string;
  timestamp: number;
}

export class LockScreenUtils {
  /**
   * Generate SHA1 hash for a password
   * Usage: LockScreenUtils.generateHash('mypassword')
   */
  static async generateHash(password: string): Promise<string> {
    const buffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`SHA1 hash for "${password}":`, hash);
    return hash;
  }

  /**
   * Clear authentication data from localStorage
   * Usage: LockScreenUtils.clearAuth()
   */
  static clearAuth(storageKey = 'angular_lock_auth'): void {
    localStorage.removeItem(storageKey);
    console.log('Authentication data cleared from localStorage');
  }

  /**
   * Get current authentication data from localStorage
   * Usage: LockScreenUtils.getStoredAuth()
   */
  static getStoredAuth(storageKey = 'angular_lock_auth'): AuthData | null {
    try {
      const data = localStorage.getItem(storageKey);
      const parsed = data ? JSON.parse(data) : null;
      if (parsed) {
        const age = Date.now() - parsed.timestamp;
        const ageMinutes = Math.floor(age / 60000);
        console.log('Stored auth data:', {
          passwordHash: parsed.passwordHash,
          timestamp: new Date(parsed.timestamp).toLocaleString(),
          age: `${ageMinutes} minutes ago`,
        });
      } else {
        console.log('No auth data found');
      }
      return parsed;
    } catch (error) {
      console.error('Error reading auth data:', error);
      return null;
    }
  }

  /**
   * Manually set authentication (for testing)
   * Usage: LockScreenUtils.setAuth('cbfdac6008f9cab4083784cbd1874f76618d2a97')
   */
  static setAuth(passwordHash: string, storageKey = 'angular_lock_auth'): void {
    const authData = {
      passwordHash,
      timestamp: Date.now(),
    };
    localStorage.setItem(storageKey, JSON.stringify(authData));
    console.log('Auth data set:', authData);
  }

  /**
   * Test expiry by setting an old timestamp
   * Usage: LockScreenUtils.testExpiry(10000) // Makes session look 10 seconds old
   */
  static testExpiry(ageInMs: number, storageKey = 'angular_lock_auth'): void {
    const currentData = this.getStoredAuth(storageKey);
    if (currentData) {
      const oldTimestamp = Date.now() - ageInMs;
      const authData = {
        passwordHash: currentData.passwordHash,
        timestamp: oldTimestamp,
      };
      localStorage.setItem(storageKey, JSON.stringify(authData));
      console.log(`Session timestamp set to ${ageInMs}ms ago (${new Date(oldTimestamp).toLocaleString()})`);
    } else {
      console.log('No existing auth data to modify');
    }
  }

  /**
   * Get all common password hashes (for testing)
   */
  static async getCommonHashes(): Promise<void> {
    const passwords = ['password', 'password123', 'admin', 'test', '12345'];
    console.log('Common password hashes:');
    for (const pwd of passwords) {
      const hash = await this.generateHash(pwd);
      console.log(`  "${pwd}" => "${hash}"`);
    }
  }

  /**
   * Check if session would be valid with given expiry time
   */
  static checkSessionValidity(expiryTimeMs: number, storageKey = 'angular_lock_auth'): void {
    const authData = this.getStoredAuth(storageKey);
    if (!authData) {
      console.log('No session found');
      return;
    }

    const elapsed = Date.now() - authData.timestamp;
    const isExpired = expiryTimeMs > 0 && elapsed > expiryTimeMs;
    const remainingMs = expiryTimeMs > 0 ? Math.max(0, expiryTimeMs - elapsed) : Infinity;
    const remainingMinutes = remainingMs === Infinity ? 'never' : Math.floor(remainingMs / 60000);

    console.log('Session validity check:', {
      elapsed: `${Math.floor(elapsed / 60000)} minutes`,
      expiryTime: expiryTimeMs === 0 ? 'No expiry' : `${expiryTimeMs / 60000} minutes`,
      isExpired,
      remaining: remainingMinutes === 'never' ? 'never expires' : `${remainingMinutes} minutes`,
    });
  }

  /**
   * Show help with all available methods
   * Usage: LockScreenUtils.help()
   */
  static help(): void {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LockScreen Utilities Help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available Methods:
────────────────────────────────────────────────────────────

  Password & Hash Management
  ───────────────────────────────────────────────────────────
  LockScreenUtils.generateHash('password')
    → Generate SHA1 hash for a password
    
  LockScreenUtils.getCommonHashes()
    → Show SHA1 hashes for common passwords

  Authentication Management
  ───────────────────────────────────────────────────────────
  LockScreenUtils.getStoredAuth()
    → View current authentication data in localStorage
    
  LockScreenUtils.setAuth('hash')
    → Manually set authentication (for testing)
    
  LockScreenUtils.clearAuth()
    → Clear authentication data (force re-login)

  Session Testing
  ───────────────────────────────────────────────────────────
  LockScreenUtils.testExpiry(10000)
    → Make session appear 10 seconds old (test expiry)
    
  LockScreenUtils.checkSessionValidity(3600000)
    → Check if session is valid with given expiry (1 hour)

  Help
  ───────────────────────────────────────────────────────────
  LockScreenUtils.help()
    → Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick Examples:
────────────────────────────────────────────────────────────

  // Generate hash for your password
  LockScreenUtils.generateHash('mySecretPassword')
  
  // Check current session
  LockScreenUtils.getStoredAuth()
  
  // Clear session to test lock screen
  LockScreenUtils.clearAuth()
  
  // Test session expiry
  LockScreenUtils.testExpiry(3600000) // 1 hour old
  
  // Get common password hashes
  LockScreenUtils.getCommonHashes()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Default Configuration:
────────────────────────────────────────────────────────────
  Storage Key: 'angular_lock_auth'
  Default Password: 'password123'
  Default Hash: 'cbfdac6008f9cab4083784cbd1874f76618d2a97'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
}

// Make it available globally for browser console usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['LockScreenUtils'] = LockScreenUtils;
}
