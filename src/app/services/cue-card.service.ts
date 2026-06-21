import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { CueCard, CueCardSheetColumn, CueCardTable, cueCardSheetColumns } from '../models/cue-card.model';

interface GVizCell {
  v: string | number | boolean | null;
  f?: string;
}

interface GVizResponse {
  status: string;
  table?: {
    parsedNumHeaders?: number;
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

      return cards.map(card => this.cleanCueCard(card, true));
    } catch {
      localStorage.removeItem(this.offlineStorageKey);
      return [];
    }
  }

  saveOfflineCueCard(card: CueCard): void {
    const cards = this.getOfflineCueCards();
    const cleanCard = this.cleanCueCard(card, true);
    const nextCards = [cleanCard, ...cards.filter(item => item.id !== cleanCard.id)];
    localStorage.setItem(this.offlineStorageKey, JSON.stringify(nextCards));
  }

  clearOfflineCueCards(): void {
    localStorage.removeItem(this.offlineStorageKey);
  }

  buildCueCard(input: {
    title: string;
    contentHtml: string;
    tableName: string;
    table: CueCardTable | null;
    existingCard?: CueCard | null;
  }): CueCard {
    const sanitizedHtml = this.sanitizeRichText(input.contentHtml);
    const normalizedTable = this.normalizeTable(input.table);
    const now = new Date().toISOString();
    const existingCard = input.existingCard;

    return {
      id: existingCard?.id ?? this.createCueCardId(),
      rowNumber: existingCard?.rowNumber,
      createdAt: existingCard?.createdAt || now,
      updatedAt: now,
      title: input.title.trim(),
      contentHtml: sanitizedHtml,
      tableName: input.tableName.trim(),
      table: normalizedTable,
      isOffline: existingCard?.isOffline,
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
      TableName: card.tableName,
      TableData: this.encodeTableData(card.table),
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

  sanitizeTableCellHtml(html: string): string {
    return this.sanitizeRichText(html);
  }

  htmlToText(value: string): string {
    const template = document.createElement('template');
    template.innerHTML = value;

    return (template.content.textContent ?? '').trim();
  }

  previewText(card: CueCard, wordLimit = 100): string {
    const tableText = card.table?.rows.map(row => row.map(cell => this.htmlToText(cell)).join(' ')).join(' ') ?? '';
    const words = `${this.htmlToText(card.contentHtml)} ${tableText}`.trim().split(/\s+/).filter(Boolean);

    if (words.length <= wordLimit) return words.join(' ');
    return `${words.slice(0, wordLimit).join(' ')}...`;
  }

  cloneTable(table: CueCardTable | null): CueCardTable | null {
    return table ? { rows: table.rows.map(row => [...row]) } : null;
  }

  normalizeTable(table: CueCardTable | null | undefined): CueCardTable | null {
    if (!table) return null;

    const rows = this.normalizeTableRows(table.rows).map(row => row.map(cell => this.sanitizeTableCellHtml(cell)));

    if (rows.length === 0 || rows.every(row => row.every(cell => this.htmlToText(cell).trim() === ''))) {
      return null;
    }

    return { rows };
  }

  normalizeTableRows(rows: readonly string[][]): string[][] {
    const columnCount = Math.max(...rows.map(row => row.length), 1);
    const normalizedRows = rows
      .slice(0, 13)
      .map(row => Array.from({ length: Math.min(Math.max(columnCount, 1), 7) }, (_, index) => row[index] ?? ''));

    while (normalizedRows.length > 0 && (normalizedRows.at(-1) ?? []).every(cell => !this.htmlToText(cell).trim())) {
      normalizedRows.pop();
    }

    return normalizedRows;
  }

  parsePastedTable(value: string): string[][] {
    const trimmedValue = value.trim();
    if (!trimmedValue) return [];

    const markdownRows = this.parseMarkdownTable(trimmedValue);
    if (markdownRows.length > 0) {
      return this.normalizeTableRows(markdownRows);
    }

    return this.normalizeTableRows(
      trimmedValue
        .split(/\r?\n/)
        .map(row => row.split('\t').map(cell => cell.trim()))
        .filter(row => row.some(cell => cell.length > 0)),
    );
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
      const firstDataRowNumber = (data.table.parsedNumHeaders ?? 1) + 1;

      return data.table.rows
        .map((row, index) => this.cardFromCells(row.c, columnIndexes, firstDataRowNumber + index))
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

  private cardFromCells(
    cells: Array<GVizCell | null>,
    indexes: Record<CueCardSheetColumn, number>,
    rowNumber: number,
  ): CueCard | null {
    const id = this.cellValue(cells[indexes.CueCardId]);
    const title = this.cellValue(cells[indexes.Title]);
    const contentHtml = this.sanitizeRichText(this.cellValue(cells[indexes.ContentHtml]));
    const table = this.decodeTableData(this.cellValue(cells[indexes.TableData]));

    if (!id && !title && !contentHtml && !table) return null;

    return {
      id: id || this.createCueCardId(),
      rowNumber,
      createdAt: this.cellValue(cells[indexes.CreatedAt]),
      updatedAt: this.cellValue(cells[indexes.UpdatedAt]),
      title,
      contentHtml,
      tableName: this.cellValue(cells[indexes.TableName]),
      table,
    };
  }

  private cellValue(cell: GVizCell | null | undefined): string {
    return String(cell?.f ?? cell?.v ?? '').trim();
  }

  private encodeTableData(table: CueCardTable | null): string {
    const normalizedTable = this.normalizeTable(table);
    if (!normalizedTable) return '';

    return JSON.stringify({
      v: 1,
      r: normalizedTable.rows,
    });
  }

  private decodeTableData(value: string): CueCardTable | null {
    if (!value.trim()) return null;

    try {
      const parsedValue = JSON.parse(value) as { r?: unknown };
      if (!Array.isArray(parsedValue.r)) return null;

      return this.normalizeTable({
        rows: parsedValue.r
          .filter((row): row is unknown[] => Array.isArray(row))
          .map(row => row.map(cell => String(cell ?? '')).slice(0, 7))
          .slice(0, 13),
      });
    } catch {
      return null;
    }
  }

  private parseMarkdownTable(value: string): string[][] {
    const lines = value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.includes('|'));

    return lines
      .filter(line => !/^(\|?\s*:?-{3,}:?\s*)+\|?$/.test(line))
      .map(line =>
        line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(cell => cell.trim()),
      )
      .filter(row => row.some(cell => cell.length > 0));
  }

  private cleanCueCard(card: CueCard, isOffline = false): CueCard {
    return {
      id: card.id || this.createCueCardId(),
      rowNumber: card.rowNumber,
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: card.updatedAt || card.createdAt || new Date().toISOString(),
      title: (card.title ?? '').trim(),
      contentHtml: this.sanitizeRichText(card.contentHtml ?? ''),
      tableName: (card.tableName ?? '').trim(),
      table: this.normalizeTable(card.table),
      isOffline: isOffline || card.isOffline,
    };
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
