import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { AttendanceStateService } from './services/attendance-state.service';
import { LockScreenComponent } from './lock-screen/lock-screen.component';
import { LockScreenService } from './lock-screen/lock-screen.service';
import { LoggerService } from './logger/logger.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, LockScreenComponent, SnackbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'Office Pulse';
  private attendanceState = inject(AttendanceStateService);
  private readonly lockService = inject(LockScreenService);
  private readonly logger = inject(LoggerService);

  protected readonly showLockScreen = this.lockService.showLockScreen;

  ngOnInit(): void {
    // Fetch attendance data on app load
    this.attendanceState.fetchAttendanceData();
    // Logger is automatically initialized
    // It checks localStorage['enableLog'] === 'ON' to enable logs
    this.logger.log('Application initialized');
    this.logger.info('Logging status:', this.logger.isLoggingEnabled() ? 'ENABLED' : 'DISABLED');
  }
}
