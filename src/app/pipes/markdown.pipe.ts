import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownParser } from '../utils/markdown-parser';

@Pipe({
  name: 'markdown',
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    if (!value) return '';

    const html = MarkdownParser.parse(value);
    // Use bypassSecurityTrustHtml since we're already sanitizing in the parser
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
