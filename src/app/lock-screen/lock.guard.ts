import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { LockScreenService } from './lock-screen.service';

export const lockGuard: CanActivateFn = () => {
  const lockService = inject(LockScreenService);

  // Check if user is authenticated
  const isAuthenticated = lockService.checkAuthentication();

  if (!isAuthenticated) {
    // Show lock screen
    lockService.showLock();
    return false;
  }

  return true;
};
