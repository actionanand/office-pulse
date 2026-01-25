/**
 * Simple Markdown-like parser for memo descriptions
 * Supports: Bold, Italic, Underline, Color, Lists, Checkboxes
 */

export class MarkdownParser {
  /**
   * Parse markdown-like syntax to HTML
   *
   * Supported syntax:
   * - **bold** or __bold__
   * - *italic* or _italic_
   * - ~~strikethrough~~
   * - `code`
   * - [color:red]text[/color]
   * - [bg:yellow]text[/bg]
   * - Unordered list: - item or * item
   * - Ordered list: 1. item
   * - [ ] Unchecked checkbox
   * - [x] Checked checkbox
   */
  static parse(text: string): string {
    if (!text) return '';

    let html = text;

    // Escape HTML to prevent XSS
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Split into lines for better list/checkbox handling
    const lines = html.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Check if line is a checkbox (highest priority)
      if (/^-\s*\[\s*\]\s+/.test(line)) {
        line = line.replace(/^-\s*\[\s*\]\s+(.+)$/, '<div class="checkbox-item">☐ $1</div>');
        processedLines.push(line);
        continue;
      } else if (/^-\s*\[x\]\s+/i.test(line)) {
        line = line.replace(/^-\s*\[x\]\s+(.+)$/i, '<div class="checkbox-item checked">☑ $1</div>');
        processedLines.push(line);
        continue;
      }

      // Check if line is an ordered list
      if (/^\d+\.\s+/.test(line)) {
        line = line.replace(/^\d+\.\s+(.+)$/, '<li class="ordered-item">$1</li>');
        processedLines.push(line);
        continue;
      }

      // Check if line is an unordered list (but not checkbox)
      if (/^[-*]\s+/.test(line)) {
        line = line.replace(/^[-*]\s+(.+)$/, '<li class="unordered-item">$1</li>');
        processedLines.push(line);
        continue;
      }

      processedLines.push(line);
    }

    // Join lines back
    html = processedLines.join('\n');

    // Wrap consecutive list items in proper tags and remove newlines between them
    html = html.replace(/(<li class="ordered-item">.*?<\/li>)\n?/gs, '$1');
    html = html.replace(/(<li class="ordered-item">.*?<\/li>)+/gs, match => {
      return '<ol>' + match + '</ol>';
    });
    html = html.replace(/(<li class="unordered-item">.*?<\/li>)\n?/gs, '$1');
    html = html.replace(/(<li class="unordered-item">.*?<\/li>)+/gs, match => {
      return '<ul>' + match + '</ul>';
    });

    // Remove newlines immediately after closing list tags to prevent extra <br>
    html = html.replace(/<\/ul>\n/g, '</ul>');
    html = html.replace(/<\/ol>\n/g, '</ol>');
    html = html.replace(/<\/div>\n/g, '</div>'); // For checkboxes too

    // Parse inline formatting (order matters!)

    // 1. Code first (to protect content from other parsing)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 2. Color tags
    html = html.replace(/\[color:([a-zA-Z0-9#]+)\](.*?)\[\/color\]/gs, '<span style="color: $1">$2</span>');
    html = html.replace(
      /\[bg:([a-zA-Z0-9#]+)\](.*?)\[\/bg\]/gs,
      '<span style="background-color: $1; padding: 2px 4px; border-radius: 3px">$2</span>',
    );

    // 3. Bold (before italic to avoid conflicts)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 4. Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 5. Italic (last among * and _)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Parse line breaks (preserve spacing for lists)
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Get plain text from markdown (strip formatting)
   */
  static toPlainText(markdown: string): string {
    if (!markdown) return '';

    return (
      markdown
        // Remove checkboxes
        .replace(/^- \[[x ]\] /gim, '')
        // Remove list markers
        .replace(/^\d+\.\s+/gm, '')
        .replace(/^[-*]\s+/gm, '')
        // Remove color tags
        .replace(/\[color:[^\]]+\]/g, '')
        .replace(/\[\/color\]/g, '')
        .replace(/\[bg:[^\]]+\]/g, '')
        .replace(/\[\/bg\]/g, '')
        // Remove formatting
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\*/g, '')
        .replace(/_/g, '')
    );
  }

  /**
   * Insert formatting syntax at cursor position
   */
  static insertFormatting(
    text: string,
    selectionStart: number,
    selectionEnd: number,
    prefix: string,
    suffix: string = '',
  ): { text: string; cursorPos: number } {
    const before = text.substring(0, selectionStart);
    const selected = text.substring(selectionStart, selectionEnd);
    const after = text.substring(selectionEnd);

    const newText = before + prefix + selected + (suffix || prefix) + after;
    const cursorPos = selected
      ? selectionStart + prefix.length + selected.length + (suffix || prefix).length
      : selectionStart + prefix.length;

    return { text: newText, cursorPos };
  }
}
