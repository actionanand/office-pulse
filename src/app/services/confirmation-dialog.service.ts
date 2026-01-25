import { Injectable, signal } from '@angular/core';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'danger' | 'success';
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationDialogService {
  isOpen = signal<boolean>(false);
  dialogData = signal<ConfirmationDialogData | null>(null);
  private resolveCallback: ((result: boolean) => void) | null = null;

  confirm(data: ConfirmationDialogData): Promise<boolean> {
    this.dialogData.set({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmColor: 'primary',
      ...data,
    });
    this.isOpen.set(true);

    return new Promise<boolean>(resolve => {
      this.resolveCallback = resolve;
    });
  }

  handleConfirm(): void {
    this.isOpen.set(false);
    if (this.resolveCallback) {
      this.resolveCallback(true);
      this.resolveCallback = null;
    }
  }

  handleCancel(): void {
    this.isOpen.set(false);
    if (this.resolveCallback) {
      this.resolveCallback(false);
      this.resolveCallback = null;
    }
  }
}
