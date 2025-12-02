import { Injectable, signal, computed } from '@angular/core';
import { GvizService, SheetEntry } from './gviz.service';
import { StorageService } from './storage.service';
import { environment as env } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceStateService {
  private gvizService = new GvizService();
  private storageService = new StorageService();

  // All entries from API
  allEntries = signal<SheetEntry[]>([]);
  isLoading = signal<boolean>(false);
  lastFetchTime = signal<Date | null>(null);
  
  // Signal to trigger reactivity when local storage changes
  // Increment this whenever local storage is updated
  private localStorageVersion = signal<number>(0);

  // Computed: Today's entry from API (based on entry date only)
  // NOTE: If entry exists in API with today's entry date, it means BOTH entry and exit are submitted
  // because data only goes to API after complete submission via Google Form
  todayEntryFromAPI = computed(() => {
    const today = this.getTodayDateString();
    const entries = this.allEntries();
    
    // Find entries where the ENTRY TIME date is today (not exit time)
    // This supports night shift: entry on Day 1, exit on Day 2
    const todayEntries = entries.filter(entry => {
      if (!entry.entryTime) return false;
      const entryDate = this.getDateFromTimeString(entry.entryTime);
      return entryDate === today;
    });
    
    if (todayEntries.length === 0) return null;
    
    // Return latest entry for today based on entry time
    return todayEntries.reduce((latest, current) => {
      const latestTime = new Date(latest.entryTime).getTime();
      const currentTime = new Date(current.entryTime).getTime();
      return currentTime > latestTime ? current : latest;
    });
  });

  // Computed: Check if entry exists today
  // Two scenarios:
  // 1. Local Storage: Entry time is from today (pending, not yet submitted to API)
  // 2. API: Entry with today's entry date exists (already submitted with both entry & exit)
  hasEntryToday = computed(() => {
    // Depend on localStorageVersion to trigger reactivity
    this.localStorageVersion();
    
    const today = this.getTodayDateString();
    
    // Check local storage - entry exists but not yet submitted to API
    const localEntry = this.storageService.getEntryLog();
    if (localEntry && localEntry.entryTime) {
      const entryDate = this.getDateFromTimeString(localEntry.entryTime);
      if (entryDate === today) {
        return true;
      }
    }
    
    // Check API - if entry with today's entry date exists, both entry & exit are submitted
    return !!this.todayEntryFromAPI();
  });

  // Computed: Check if exit marked today
  // Two scenarios:
  // 1. Local Storage: Exit time exists for today's entry (marked but not yet submitted)
  // 2. API: Entry with today's entry date exists in API (means both entry & exit submitted)
  hasExitToday = computed(() => {
    // Depend on localStorageVersion to trigger reactivity
    this.localStorageVersion();
    
    const today = this.getTodayDateString();
    
    // Check local storage first - exit marked but not yet submitted
    const localEntry = this.storageService.getEntryLog();
    if (localEntry && localEntry.entryTime) {
      const entryDate = this.getDateFromTimeString(localEntry.entryTime);
      if (entryDate === today && localEntry.exitTime) {
        return true;
      }
    }
    
    // Check API data - if entry with today's entry date exists, exit must be there too
    // because data only goes to API after complete submission
    const apiEntry = this.todayEntryFromAPI();
    return !!(apiEntry && apiEntry.exitTime);
  });

  // Computed: Check if submitted today
  // Two scenarios:
  // 1. Local Storage: isSubmitted flag is true (user clicked submit button)
  // 2. API: Entry with today's entry date exists (means Google Form was submitted)
  isSubmittedToday = computed(() => {
    // Depend on localStorageVersion to trigger reactivity
    this.localStorageVersion();
    
    const today = this.getTodayDateString();
    
    // Check local storage submission flag
    const localEntry = this.storageService.getEntryLog();
    if (localEntry && localEntry.entryTime) {
      const entryDate = this.getDateFromTimeString(localEntry.entryTime);
      if (entryDate === today && localEntry.isSubmitted === true) {
        return true;
      }
    }
    
    // Check API - if entry with today's entry date exists with both times, it's submitted
    const apiEntry = this.todayEntryFromAPI();
    return !!(apiEntry && apiEntry.entryTime && apiEntry.exitTime);
  });

  /**
   * Fetch attendance data from Google Sheets
   */
  async fetchAttendanceData(): Promise<void> {
    if (!env.GOOGLE_SHEET_ID || env.GOOGLE_SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
      console.warn('Google Sheet ID not configured');
      return;
    }

    this.isLoading.set(true);

    try {
      const entries = await this.gvizService.fetchEntries(
        env.GOOGLE_SHEET_ID,
        env.SHEET_GID,
        90 // Fetch last 90 days
      ).toPromise();

      this.allEntries.set(entries || []);
      this.lastFetchTime.set(new Date());
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Notify that local storage has been updated
   * This triggers reactivity in computed properties
   */
  notifyLocalStorageChanged(): void {
    this.localStorageVersion.update(v => v + 1);
  }

  /**
   * Refresh data if it's been more than N minutes
   */
  async refreshIfNeeded(maxAgeMinutes: number = 5): Promise<void> {
    const lastFetch = this.lastFetchTime();
    
    if (!lastFetch) {
      await this.fetchAttendanceData();
      return;
    }

    const ageMinutes = (Date.now() - lastFetch.getTime()) / 1000 / 60;
    
    if (ageMinutes > maxAgeMinutes) {
      await this.fetchAttendanceData();
    }
  }

  private getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDateFromTimeString(timeStr: string): string {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }
}
