import { Injectable } from '@angular/core';
import { LOGGER_CONFIG, LoggerConfig } from './logger.config';

/**
 * Logger Service
 *
 * Provides logging functionality that can be enabled/disabled via localStorage.
 * By default, all console.log statements are disabled.
 *
 * To enable logs:
 * - Open browser console
 * - Run: localStorage.setItem('enableLog', 'ON')
 * - Refresh the page
 *
 * To disable logs:
 * - Run: localStorage.removeItem('enableLog')
 * - Or: localStorage.setItem('enableLog', 'OFF')
 * - Refresh the page
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly config: LoggerConfig = LOGGER_CONFIG;
  private isEnabled: boolean = false;

  constructor() {
    this.checkLogStatus();
  }

  /**
   * Check if logging is enabled based on localStorage
   */
  private checkLogStatus(): void {
    try {
      const storedValue = localStorage.getItem(this.config.storageKey);
      this.isEnabled = storedValue === this.config.enableValue;
    } catch {
      this.isEnabled = false;
    }
  }

  /**
   * Check if logging is currently enabled
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Log a message (only if enabled)
   */
  log(...args: unknown[]): void {
    if (this.isEnabled) {
      console.log(this.config.logPrefix, ...args);
    }
  }

  /**
   * Log a warning (only if enabled)
   */
  warn(...args: unknown[]): void {
    if (this.isEnabled) {
      console.warn(this.config.logPrefix, ...args);
    }
  }

  /**
   * Log an error (only if enabled)
   */
  error(...args: unknown[]): void {
    if (this.isEnabled) {
      console.error(this.config.logPrefix, ...args);
    }
  }

  /**
   * Log info (only if enabled)
   */
  info(...args: unknown[]): void {
    if (this.isEnabled) {
      console.info(this.config.logPrefix, ...args);
    }
  }

  /**
   * Log debug information (only if enabled)
   */
  debug(...args: unknown[]): void {
    if (this.isEnabled) {
      console.debug(this.config.logPrefix, ...args);
    }
  }

  /**
   * Log a table (only if enabled)
   */
  table(data: unknown): void {
    if (this.isEnabled) {
      console.log(this.config.logPrefix);
      console.table(data);
    }
  }

  /**
   * Start a timer (only if enabled)
   */
  time(label: string): void {
    if (this.isEnabled) {
      console.time(`${this.config.logPrefix} ${label}`);
    }
  }

  /**
   * End a timer (only if enabled)
   */
  timeEnd(label: string): void {
    if (this.isEnabled) {
      console.timeEnd(`${this.config.logPrefix} ${label}`);
    }
  }

  /**
   * Group logs (only if enabled)
   */
  group(label: string): void {
    if (this.isEnabled) {
      console.group(`${this.config.logPrefix} ${label}`);
    }
  }

  /**
   * Group logs collapsed (only if enabled)
   */
  groupCollapsed(label: string): void {
    if (this.isEnabled) {
      console.groupCollapsed(`${this.config.logPrefix} ${label}`);
    }
  }

  /**
   * End a group (only if enabled)
   */
  groupEnd(): void {
    if (this.isEnabled) {
      console.groupEnd();
    }
  }

  /**
   * Enable logging programmatically
   */
  enableLogging(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.config.enableValue);
      this.isEnabled = true;
      console.log(this.config.logPrefix, 'Logging enabled');
    } catch (error) {
      console.error('Failed to enable logging:', error);
    }
  }

  /**
   * Disable logging programmatically
   */
  disableLogging(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
      this.isEnabled = false;
    } catch (error) {
      console.error('Failed to disable logging:', error);
    }
  }
}
