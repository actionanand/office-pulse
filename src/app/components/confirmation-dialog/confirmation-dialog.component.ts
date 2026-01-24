import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [CommonModule],
  template: `
    @if (dialogService.isOpen()) {
      <div
        class="dialog-overlay"
        (click)="dialogService.handleCancel()"
        (keydown.escape)="dialogService.handleCancel()"
        role="dialog"
        aria-modal="true"
        tabindex="-1">
        <div
          class="dialog-content"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
          role="document">
          <div class="dialog-header">
            <h2>{{ dialogService.dialogData()?.title }}</h2>
          </div>
          <div class="dialog-body">
            <p>{{ dialogService.dialogData()?.message }}</p>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn cancel-btn" (click)="dialogService.handleCancel()">
              {{ dialogService.dialogData()?.cancelText }}
            </button>
            <button
              class="dialog-btn confirm-btn"
              [class]="'confirm-' + dialogService.dialogData()?.confirmColor"
              (click)="dialogService.handleConfirm()">
              {{ dialogService.dialogData()?.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
      }

      .dialog-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 100%;
        animation: dialogSlideIn 0.2s ease-out;
      }

      @keyframes dialogSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .dialog-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e0e0e0;

        h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
        }
      }

      .dialog-body {
        padding: 1.5rem;

        p {
          margin: 0;
          color: #555;
          font-size: 1rem;
          line-height: 1.5;
        }
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid #e0e0e0;
      }

      .dialog-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        transition: all 0.2s;

        &:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
      }

      .cancel-btn {
        background: #f8f9fa;
        color: #495057;

        &:hover {
          background: #e2e6ea;
        }
      }

      .confirm-btn {
        color: white;

        &.confirm-primary {
          background: #007bff;

          &:hover {
            background: #0056b3;
          }
        }

        &.confirm-danger {
          background: #dc3545;

          &:hover {
            background: #c82333;
          }
        }

        &.confirm-success {
          background: #28a745;

          &:hover {
            background: #218838;
          }
        }
      }
    `,
  ],
})
export class ConfirmationDialogComponent {
  dialogService = inject(ConfirmationDialogService);
}
