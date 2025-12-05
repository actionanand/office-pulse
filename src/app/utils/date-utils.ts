/**
 * Date utility functions for IST (Indian Standard Time) handling
 * IST is UTC+5:30
 */

/**
 * Get current date in IST timezone as YYYY-MM-DD string
 */
export function getISTDateString(): string {
  const now = new Date();
  // IST is UTC+5:30, so add 5 hours 30 minutes in milliseconds
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get current Date object adjusted to IST
 */
export function getISTDate(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + istOffset);
}

/**
 * Convert a Date object to IST date string (YYYY-MM-DD)
 */
export function toISTDateString(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get IST year
 */
export function getISTYear(): number {
  return getISTDate().getFullYear();
}

/**
 * Get IST month (1-12)
 */
export function getISTMonth(): number {
  return getISTDate().getMonth() + 1;
}

/**
 * Get IST day of month
 */
export function getISTDay(): number {
  return getISTDate().getDate();
}

/**
 * Get IST day of week (0 = Sunday, 6 = Saturday)
 */
export function getISTDayOfWeek(): number {
  return getISTDate().getDay();
}

/**
 * Calculate IST date string for a date offset from today
 * @param daysOffset Number of days to add (negative for past dates)
 */
export function getISTDateStringWithOffset(daysOffset: number): string {
  const istDate = getISTDate();
  istDate.setDate(istDate.getDate() + daysOffset);
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
