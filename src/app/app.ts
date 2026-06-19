import { ChangeDetectionStrategy, Component, OnInit, effect, inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected title = 'Office Pulse';
  private attendanceState = inject(AttendanceStateService);
  private readonly lockService = inject(LockScreenService);
  private readonly logger = inject(LoggerService);
  private attendanceFetchScheduled = false;

  protected readonly showLockScreen = this.lockService.showLockScreen;

  constructor() {
    effect(() => {
      if (this.lockService.isAuthenticated()) {
        this.scheduleAttendanceRefresh();
      } else {
        this.attendanceFetchScheduled = false;
      }
    });
  }

  ngOnInit(): void {
    // Logger is automatically initialized
    // It checks localStorage['enableLog'] === 'ON' to enable logs
    this.logger.log('Application initialized');
    this.logger.info('Logging status:', this.logger.isLoggingEnabled() ? 'ENABLED' : 'DISABLED');
  }

  private scheduleAttendanceRefresh(): void {
    if (this.attendanceFetchScheduled) return;

    this.attendanceFetchScheduled = true;
    setTimeout(() => {
      void this.attendanceState.refreshIfNeeded(15);
    }, 0);
  }
}
