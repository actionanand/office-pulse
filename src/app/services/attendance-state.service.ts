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

  // Computed: Today's entry from API
  todayEntryFromAPI = computed(() => {
    const today = this.getTodayDateString();
    const entries = this.allEntries();
    const todayEntries = entries.filter(entry => entry.date === today);
    
    if (todayEntries.length === 0) return null;
    
    // Return latest entry for today
    return todayEntries.reduce((latest, current) => {
      const latestTime = new Date(latest.timestamp || latest.entryTime).getTime();
      const currentTime = new Date(current.timestamp || current.entryTime).getTime();
      return currentTime > latestTime ? current : latest;
    });
  });

  // Computed: Check if entry exists today (from local storage or API)
  hasEntryToday = computed(() => {
    // Check local storage
    const localEntry = this.storageService.getEntryLog();
    const today = this.getTodayDateString();
    
    if (localEntry && localEntry.date === today && localEntry.entryTime) {
      return true;
    }
    
    // Check API data
    return !!this.todayEntryFromAPI();
  });

  // Computed: Check if exit marked today (from local storage or API)
  hasExitToday = computed(() => {
    // Check local storage first
    const localEntry = this.storageService.getEntryLog();
    const today = this.getTodayDateString();
    
    if (localEntry && localEntry.date === today && localEntry.exitTime) {
      return true;
    }
    
    // Check API data
    const apiEntry = this.todayEntryFromAPI();
    return !!(apiEntry && apiEntry.exitTime);
  });

  // Computed: Check if submitted today (from local storage)
  isSubmittedToday = computed(() => {
    const localEntry = this.storageService.getEntryLog();
    const today = this.getTodayDateString();
    
    if (localEntry && localEntry.date === today && localEntry.isSubmitted === true) {
      return true;
    }
    
    // If API has entry with both entry and exit time, consider it submitted
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
}
