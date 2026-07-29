/**
 * Logger Utilities
 *
 * Provides global utility functions for easy access to logger functionality.
 * These can be used in browser console for testing and debugging.
 */

export class LoggerUtils {
  /**
   * Enable logging by setting localStorage['enableLog'] = 'ON'
   * Then reload the page for changes to take effect
   */
  static enable(): void {
    try {
      localStorage.setItem('enableLog', 'ON');
      console.log('Logging ENABLED. Please refresh the page for changes to take effect.');
      console.log('Run: location.reload()');
    } catch (error) {
      console.error('Failed to enable logging:', error);
    }
  }

  /**
   * Disable logging by removing localStorage['enableLog']
   * Then reload the page for changes to take effect
   */
  static disable(): void {
    try {
      localStorage.removeItem('enableLog');
      console.log('Logging DISABLED. Please refresh the page for changes to take effect.');
      console.log('Run: location.reload()');
    } catch (error) {
      console.error('Failed to disable logging:', error);
    }
  }

  /**
   * Check current logging status
   */
  static status(): void {
    try {
      const value = localStorage.getItem('enableLog');
      const isEnabled = value === 'ON';
      console.log('Current logging status:', isEnabled ? 'ENABLED' : 'DISABLED');
      console.log('localStorage["enableLog"]:', value || '(not set)');

      if (isEnabled) {
        console.log('\nTo disable: LoggerUtils.disable()');
      } else {
        console.log('\nTo enable: LoggerUtils.enable()');
      }
    } catch (error) {
      console.error('Failed to check logging status:', error);
    }
  }

  /**
   * Toggle logging on/off
   */
  static toggle(): void {
    try {
      const currentValue = localStorage.getItem('enableLog');
      if (currentValue === 'ON') {
        this.disable();
      } else {
        this.enable();
      }
    } catch (error) {
      console.error('Failed to toggle logging:', error);
    }
  }

  /**
   * Quick enable and reload
   */
  static enableAndReload(): void {
    this.enable();
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  /**
   * Quick disable and reload
   */
  static disableAndReload(): void {
    this.disable();
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  /**
   * Show help message
   */
  static help(): void {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger Utilities Help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available Commands:
──────────────────────────────────────────────

  LoggerUtils.enable()          - Enable logging
  LoggerUtils.disable()         - Disable logging
  LoggerUtils.status()          - Check current status
  LoggerUtils.toggle()          - Toggle on/off
  
  LoggerUtils.enableAndReload() - Enable & auto-reload
  LoggerUtils.disableAndReload()- Disable & auto-reload
  
  LoggerUtils.help()            - Show this help

How It Works:
──────────────────────────────────────────────

  1. Logging is DISABLED by default
  2. Set localStorage['enableLog'] = 'ON' to enable
  3. Any other value (or undefined) = disabled
  4. Refresh page after changing setting

Quick Start:
──────────────────────────────────────────────

  // Enable logs and reload
  LoggerUtils.enableAndReload()
  
  // Or manually:
  LoggerUtils.enable()
  location.reload()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['LoggerUtils'] = LoggerUtils;
}
