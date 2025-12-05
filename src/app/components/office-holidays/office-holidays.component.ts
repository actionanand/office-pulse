import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HolidayService } from '../../services/holiday.service';
import { Holiday, HolidayMeta } from '../../models/holiday.model';

@Component({
  selector: 'app-office-holidays',
  imports: [CommonModule],
  templateUrl: './office-holidays.component.html',
  styleUrl: './office-holidays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfficeHolidaysComponent implements OnInit {
  private holidayService = inject(HolidayService);

  readonly holidays = signal<Holiday[]>([]);
  readonly meta = signal<HolidayMeta>({
    title: 'Office Holidays',
    year: new Date().getFullYear().toString(),
    notes: []
  });
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadHolidays();
  }

  loadHolidays(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.holidayService.fetchHolidays().subscribe({
      next: (data) => {
        this.holidays.set(data.holidays);
        this.meta.set(data.meta);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading holidays:', err);
        this.error.set('Failed to load holidays. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  refreshData(): void {
    this.holidayService.clearCache();
    this.loadHolidays();
  }

  isPastHoliday(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Parse the date string (format: "01 Jan 2025")
      const holidayDate = new Date(dateStr);
      holidayDate.setHours(0, 0, 0, 0);
      
      return holidayDate < today;
    } catch {
      return false;
    }
  }

  isUpcomingHoliday(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const holidayDate = new Date(dateStr);
      holidayDate.setHours(0, 0, 0, 0);
      
      // Check if within next 7 days
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      return holidayDate >= today && holidayDate <= weekFromNow;
    } catch {
      return false;
    }
  }

  isTodayHoliday(dateStr: string): boolean {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const holidayDate = new Date(dateStr);
      holidayDate.setHours(0, 0, 0, 0);
      
      return holidayDate.getTime() === today.getTime();
    } catch {
      return false;
    }
  }
}
