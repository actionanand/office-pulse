import { Component, output, input, ChangeDetectionStrategy, inject, ElementRef, effect, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-google-form-dialog',
  imports: [CommonModule],
  templateUrl: './google-form-dialog.component.html',
  styleUrls: ['./google-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleFormDialogComponent {
  private domSanitizer = inject(DomSanitizer);

  // ViewChild for iframe element (kept for future use if needed)
  formFrame = viewChild<ElementRef>('formFrame');

  // Inputs
  isOpen = input<boolean>(false);
  formUrl = input<string>('');
  
  // Outputs
  closeDialog = output<void>();
  formSubmitted = output<void>();

  constructor() {
    // Reset when dialog opens
    effect(() => {
      if (this.isOpen()) {
        console.log('Google Form dialog opened');
      }
    });
  }

  getSafeUrl(): SafeResourceUrl {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(this.formUrl());
  }

  onCloseWithoutSubmit(): void {
    // User closed with X button - don't mark as submitted
    console.log('Dialog closed without submission');
    this.closeDialog.emit();
  }

  onSubmitAndClose(): void {
    // User clicked "I've Submitted" button
    console.log('User confirmed form submission');
    this.formSubmitted.emit();
    this.closeDialog.emit();
  }
}
