import { ChangeDetectionStrategy, Component, OnInit, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { AttendanceStateService } from './services/attendance-state.service';
import { LockScreenComponent } from './lock-screen/lock-screen.component';
import { LockScreenService } from './lock-screen/lock-screen.service';
import { LoggerService } from './logger/logger.service';
import { AppLocalDataDatabaseService } from './services/app-local-data-database.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, LockScreenComponent, SnackbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:biometric-success)': 'onBiometricSuccess()',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class App implements OnInit {
  protected title = 'Office Pulse';
  private attendanceState = inject(AttendanceStateService);
  private readonly lockService = inject(LockScreenService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly appLocalData = inject(AppLocalDataDatabaseService);
  private readonly theme = inject(ThemeService);
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
    void this.appLocalData.initialize();
    this.theme.activeTheme();
    // Logger is automatically initialized
    // It checks localStorage['enableLog'] === 'ON' to enable logs
    this.logger.log('Application initialized');
    this.logger.info('Logging status:', this.logger.isLoggingEnabled() ? 'ENABLED' : 'DISABLED');
  }

  protected async onBiometricSuccess(): Promise<void> {
    this.lockService.biometricUnlock();
    const targetUrl = this.lockService.consumePendingUrl() ?? this.router.url ?? '/';
    await this.router.navigateByUrl('/__office_pulse_auth_resume', { skipLocationChange: true });
    await this.router.navigateByUrl(targetUrl, { replaceUrl: true });
    this.lockService.hideLock();
  }

  protected onVisibilityChange(): void {
    this.lockService.handleVisibilityChange();
  }

  private scheduleAttendanceRefresh(): void {
    if (this.attendanceFetchScheduled) return;

    this.attendanceFetchScheduled = true;
    setTimeout(() => {
      void this.attendanceState.fetchAttendanceData();
    }, 0);
  }
}
