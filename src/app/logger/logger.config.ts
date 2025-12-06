export interface LoggerConfig {
  /**
   * LocalStorage key to check for enabling logs
   */
  storageKey: string;

  /**
   * Value that must be set in localStorage to enable logging
   * If localStorage[storageKey] === enableValue, logs are enabled
   * Otherwise, all logs are disabled
   */
  enableValue: string;

  /**
   * Prefix to add to all log messages
   */
  logPrefix: string;
}

export const LOGGER_CONFIG: LoggerConfig = {
  storageKey: 'enableLog',
  enableValue: 'ON',
  logPrefix: '[App]',
};
