import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LockScreenService } from './lock-screen.service';

@Component({
  selector: 'app-lock-screen',
  imports: [FormsModule],
  templateUrl: './lock-screen.component.html',
  styleUrl: './lock-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockScreenComponent {
  private readonly lockService = inject(LockScreenService);
  private readonly router = inject(Router);

  protected readonly config = this.lockService.getConfig();
  protected readonly password = signal<string>('');
  protected readonly errorMessage = signal<string>('');
  protected readonly isLoading = signal<boolean>(false);
  protected readonly showPassword = signal<boolean>(false);

  protected async onSubmit(): Promise<void> {
    const pwd = this.password();

    if (!pwd) {
      this.errorMessage.set('Password is required');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const isValid = await this.lockService.validatePassword(pwd);

    this.isLoading.set(false);

    if (isValid) {
      try {
        await this.router.navigateByUrl(this.lockService.consumePendingUrl());
      } finally {
        this.lockService.hideLock();
      }
    } else {
      this.errorMessage.set(this.config.ui.errorMessage);
      this.password.set('');
    }
  }

  protected onPasswordChange(value: string): void {
    this.password.set(value);
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }
}
