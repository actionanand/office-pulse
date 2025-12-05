import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HolidayService } from '../../services/holiday.service';
import { ImportantDayService } from '../../services/important-day.service';
import { Holiday, HolidayMeta } from '../../models/holiday.model';
import { ImportantDay, ImportantDayMeta } from '../../models/important-day.model';

type TabType = 'holidays' | 'important-days';

@Component({
  selector: 'app-office-holidays',
  imports: [CommonModule],
  templateUrl: './office-holidays.component.html',
  styleUrl: './office-holidays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfficeHolidaysComponent implements OnInit {
  private holidayService = inject(HolidayService);
  private importantDayService = inject(ImportantDayService);

  // Active tab
  readonly activeTab = signal<TabType>('holidays');

  // Holidays data
  readonly holidays = signal<Holiday[]>([]);
  readonly holidayMeta = signal<HolidayMeta>({
    title: 'Office Holidays',
    year: new Date().getFullYear().toString(),
    notes: []
  });
  readonly isHolidaysLoading = signal(true);
  readonly holidaysError = signal<string | null>(null);

  // Important Days data
  readonly importantDays = signal<ImportantDay[]>([]);
  readonly importantDayMeta = signal<ImportantDayMeta>({
    year: new Date().getFullYear().toString(),
    notes: []
  });
  readonly isImportantDaysLoading = signal(true);
  readonly importantDaysError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadHolidays();
    this.loadImportantDays();
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  loadHolidays(): void {
    this.isHolidaysLoading.set(true);
    this.holidaysError.set(null);

    this.holidayService.fetchHolidays().subscribe({
      next: (data) => {
        this.holidays.set(data.holidays);
        this.holidayMeta.set(data.meta);
        this.isHolidaysLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading holidays:', err);
        this.holidaysError.set('Failed to load holidays. Please try again.');
        this.isHolidaysLoading.set(false);
      }
    });
  }

  loadImportantDays(): void {
    this.isImportantDaysLoading.set(true);
    this.importantDaysError.set(null);

    this.importantDayService.fetchImportantDays().subscribe({
      next: (data) => {
        this.importantDays.set(data.days);
        this.importantDayMeta.set(data.meta);
        this.isImportantDaysLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading important days:', err);
        this.importantDaysError.set('Failed to load important days. Please try again.');
        this.isImportantDaysLoading.set(false);
      }
    });
  }

  refreshData(): void {
    if (this.activeTab() === 'holidays') {
      this.holidayService.clearCache();
      this.loadHolidays();
    } else {
      this.importantDayService.clearCache();
      this.loadImportantDays();
    }
  }

  refreshAllData(): void {
    this.holidayService.clearCache();
    this.importantDayService.clearCache();
    this.loadHolidays();
    this.loadImportantDays();
  }

  isLoading(): boolean {
    return this.activeTab() === 'holidays' 
      ? this.isHolidaysLoading() 
      : this.isImportantDaysLoading();
  }

  isPastDate(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      
      return targetDate < today;
    } catch {
      return false;
    }
  }

  isUpcomingDate(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      
      // Check if within next 7 days
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      return targetDate >= today && targetDate <= weekFromNow;
    } catch {
      return false;
    }
  }

  isTodayDate(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      
      return targetDate.getTime() === today.getTime();
    } catch {
      return false;
    }
  }
}
