import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CueCardService } from '../services/cue-card.service';

@Pipe({
  name: 'safeCueCardHtml',
})
export class SafeCueCardHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cueCardService = inject(CueCardService);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.cueCardService.sanitizeRichText(value));
  }
}
