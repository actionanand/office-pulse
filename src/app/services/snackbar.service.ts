import { Injectable, signal } from '@angular/core';

export interface SnackbarMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private currentMessage = signal<SnackbarMessage | null>(null);
  private timeoutId: number | null = null;

  readonly message = this.currentMessage.asReadonly();

  show(message: string, type: SnackbarMessage['type'] = 'info', duration: number = 3000): void {
    // Clear existing timeout
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    // Set new message
    this.currentMessage.set({ message, type, duration });

    // Auto-hide after duration
    this.timeoutId = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  hide(): void {
    this.currentMessage.set(null);
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
