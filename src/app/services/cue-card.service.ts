import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { CueCard, CueCardSheetColumn, cueCardSheetColumns } from '../models/cue-card.model';

interface GVizCell {
  v: string | number | boolean | null;
  f?: string;
}

interface GVizResponse {
  status: string;
  table?: {
    cols: Array<{ label: string }>;
    rows: Array<{ c: Array<GVizCell | null> }>;
  };
}

const textColorOptions = ['green', 'red', 'blue', 'purple', 'darkorange'] as const;
const backgroundColorOptions = ['lightgreen', 'lightpink', 'yellow', 'lightblue', 'lightgray'] as const;
const allowedTextColors = [...textColorOptions];
const allowedBackgroundColors = [...backgroundColorOptions];
const colorAliases: Record<string, string> = {
  'rgb(0, 0, 255)': 'blue',
  'rgb(0, 128, 0)': 'green',
  'rgb(128, 0, 128)': 'purple',
  'rgb(144, 238, 144)': 'lightgreen',
  'rgb(173, 216, 230)': 'lightblue',
  'rgb(211, 211, 211)': 'lightgray',
  'rgb(255, 0, 0)': 'red',
  'rgb(255, 140, 0)': 'darkorange',
  'rgb(255, 182, 193)': 'lightpink',
  'rgb(255, 255, 0)': 'yellow',
};

@Injectable({
  providedIn: 'root',
})
export class CueCardService {
  readonly textColorOptions = textColorOptions.map(color => ({
    label: `${this.capitalize(color)} text`,
    value: color,
  }));
  readonly backgroundColorOptions = backgroundColorOptions.map(color => ({
    label: `${this.capitalize(color)} highlight`,
    value: color,
  }));

  private readonly http = inject(HttpClient);
  private readonly offlineStorageKey = 'office_pulse_offline_cue_cards';

  fetchCueCards(): Observable<CueCard[]> {
    const url = this.buildGVizUrl();

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(response => this.parseGVizResponse(response)),
      catchError((error: unknown) => {
        console.error('Error fetching cue cards:', error);
        return of([]);
      }),
    );
  }

  getOfflineCueCards(): CueCard[] {
    try {
      const saved = localStorage.getItem(this.offlineStorageKey);
      if (!saved) return [];

      const cards = JSON.parse(saved) as CueCard[];
      if (!Array.isArray(cards)) return [];

      return cards.map(card => ({
        ...card,
        contentHtml: this.sanitizeRichText(card.contentHtml),
        isOffline: true,
      }));
    } catch {
      localStorage.removeItem(this.offlineStorageKey);
      return [];
    }
  }

  saveOfflineCueCard(card: CueCard): void {
    const cards = this.getOfflineCueCards();
    const nextCards = [{ ...card, isOffline: true }, ...cards.filter(item => item.id !== card.id)];
    localStorage.setItem(this.offlineStorageKey, JSON.stringify(nextCards));
  }

  clearOfflineCueCards(): void {
    localStorage.removeItem(this.offlineStorageKey);
  }

  buildCueCard(title: string, contentHtml: string): CueCard {
    const sanitizedHtml = this.sanitizeRichText(contentHtml);
    const createdAt = new Date().toISOString();

    return {
      id: this.createCueCardId(),
      createdAt,
      updatedAt: createdAt,
      title: title.trim(),
      contentHtml: sanitizedHtml,
      contentText: this.htmlToText(sanitizedHtml),
      listItems: this.extractListItems(sanitizedHtml).join(' | '),
      formatSummary: this.getFormatSummary(sanitizedHtml),
    };
  }

  toTsvHeader(): string {
    return cueCardSheetColumns.join('\t');
  }

  toTsvRow(card: CueCard): string {
    const row: Record<CueCardSheetColumn, string> = {
      CueCardId: card.id,
      CreatedAt: card.createdAt,
      UpdatedAt: new Date().toISOString(),
      Title: card.title,
      ContentHtml: card.contentHtml,
      ContentText: card.contentText,
      ListItems: card.listItems,
      FormatSummary: card.formatSummary,
    };

    return cueCardSheetColumns.map(column => this.escapeTsvCell(row[column])).join('\t');
  }

  toGoogleSheetClipboard(card: CueCard): string {
    return `${this.toTsvHeader()}\n${this.toTsvRow(card)}`;
  }

  sanitizeRichText(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;
    const sanitized = Array.from(template.content.childNodes)
      .map(node => this.sanitizeNode(node))
      .join('');

    return sanitized === '<br>' ? '' : sanitized;
  }

  private buildGVizUrl(): string {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`;
    const params = new URLSearchParams({
      tq: 'SELECT *',
      gid: environment.CUE_CARD_SHEET_GID.toString(),
      headers: '1',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private parseGVizResponse(response: string): CueCard[] {
    try {
      const jsonString = response
        .replace(/\/\*O_o\*\/\s*/, '')
        .replace(/google\.visualization\.Query\.setResponse\(/, '')
        .replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonString) as GVizResponse;

      if (data.status !== 'ok' || !data.table?.rows) return [];

      const columnIndexes = this.getColumnIndexes(data.table.cols.map(col => col.label));

      return data.table.rows
        .map(row => this.cardFromCells(row.c, columnIndexes))
        .filter((card): card is CueCard => card !== null);
    } catch (error) {
      console.error('Error parsing cue cards:', error);
      return [];
    }
  }

  private getColumnIndexes(labels: string[]): Record<CueCardSheetColumn, number> {
    return cueCardSheetColumns.reduce(
      (indexes, column, index) => ({
        ...indexes,
        [column]: labels.indexOf(column) >= 0 ? labels.indexOf(column) : index,
      }),
      {} as Record<CueCardSheetColumn, number>,
    );
  }

  private cardFromCells(cells: Array<GVizCell | null>, indexes: Record<CueCardSheetColumn, number>): CueCard | null {
    const id = this.cellValue(cells[indexes.CueCardId]);
    const title = this.cellValue(cells[indexes.Title]);
    const contentHtml = this.sanitizeRichText(this.cellValue(cells[indexes.ContentHtml]));

    if (!id && !title && !contentHtml) return null;

    return {
      id: id || this.createCueCardId(),
      createdAt: this.cellValue(cells[indexes.CreatedAt]),
      updatedAt: this.cellValue(cells[indexes.UpdatedAt]),
      title,
      contentHtml,
      contentText: this.cellValue(cells[indexes.ContentText]) || this.htmlToText(contentHtml),
      listItems: this.cellValue(cells[indexes.ListItems]) || this.extractListItems(contentHtml).join(' | '),
      formatSummary: this.cellValue(cells[indexes.FormatSummary]) || this.getFormatSummary(contentHtml),
    };
  }

  private cellValue(cell: GVizCell | null | undefined): string {
    return String(cell?.f ?? cell?.v ?? '').trim();
  }

  private sanitizeNode(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeHtml(node.textContent ?? '');
    }

    if (!(node instanceof HTMLElement)) {
      return '';
    }

    const children = Array.from(node.childNodes)
      .map(child => this.sanitizeNode(child))
      .join('');

    switch (node.tagName.toLowerCase()) {
      case 'b':
      case 'strong':
        return this.wrapWithAllowedStyles(node, `<b>${children}</b>`);
      case 'i':
      case 'em':
        return this.wrapWithAllowedStyles(node, `<i>${children}</i>`);
      case 's':
      case 'strike':
        return this.wrapWithAllowedStyles(node, `<s>${children}</s>`);
      case 'ul':
        return `<ul>${children}</ul>`;
      case 'ol':
        return `<ol>${children}</ol>`;
      case 'li':
        return `<li>${children}</li>`;
      case 'br':
        return '<br>';
      case 'font':
        return this.sanitizeFontNode(node, children);
      case 'span':
      case 'mark':
        return this.wrapWithAllowedStyles(node, children);
      case 'div':
      case 'p':
        return `${children}<br>`;
      default:
        return children;
    }
  }

  private sanitizeFontNode(node: HTMLElement, children: string): string {
    const color = this.normalizeAllowedColor(node.getAttribute('color') ?? '', allowedTextColors);

    return color ? `<span style="color: ${color}">${children}</span>` : children;
  }

  private wrapWithAllowedStyles(node: HTMLElement, content: string): string {
    const styles: string[] = [];
    const color = this.normalizeAllowedColor(node.style.color, allowedTextColors);
    const backgroundColor = this.normalizeAllowedColor(node.style.backgroundColor, allowedBackgroundColors);

    if (color) {
      styles.push(`color: ${color}`);
    }

    if (backgroundColor) {
      styles.push(`background-color: ${backgroundColor}`);
    }

    return styles.length > 0 ? `<span style="${styles.join('; ')}">${content}</span>` : content;
  }

  private normalizeAllowedColor(value: string, allowedColors: readonly string[]): string {
    const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, ' ');
    const aliasedValue = colorAliases[normalizedValue] ?? normalizedValue;

    return allowedColors.find(color => color === aliasedValue) ?? '';
  }

  private htmlToText(value: string): string {
    const template = document.createElement('template');
    template.innerHTML = value;

    return (template.content.textContent ?? '').trim();
  }

  private extractListItems(value: string): string[] {
    const template = document.createElement('template');
    template.innerHTML = value;

    return Array.from(template.content.querySelectorAll('li'))
      .map(item => item.textContent?.trim() ?? '')
      .filter(Boolean);
  }

  private getFormatSummary(value: string): string {
    const template = document.createElement('template');
    template.innerHTML = value;
    const summary = [
      template.content.querySelector('b,strong') ? 'bold' : '',
      template.content.querySelector('i,em') ? 'italic' : '',
      template.content.querySelector('s,strike') ? 'strike' : '',
      template.content.querySelector('ul') ? 'unordered-list' : '',
      template.content.querySelector('ol') ? 'ordered-list' : '',
      template.content.querySelector('[style*="color"]') ? 'font-color' : '',
      template.content.querySelector('[style*="background-color"]') ? 'highlight' : '',
    ].filter(Boolean);

    return summary.join(', ');
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private escapeTsvCell(value: string): string {
    if (!/[\t\r\n"]/.test(value)) return value;
    return `"${value.replaceAll('"', '""')}"`;
  }

  private createCueCardId(): string {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `cue-${Date.now().toString(36)}`;
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
