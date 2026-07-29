import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-confirmation-popup',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './confirmation-popup.component.html',
  styleUrl: './confirmation-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPopupComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input({ required: true }) confirmLabel = 'Confirm';

  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();
}
