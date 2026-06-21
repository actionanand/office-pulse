export interface CueCard {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  contentHtml: string;
  contentText: string;
  listItems: string;
  formatSummary: string;
  isOffline?: boolean;
}

export const cueCardSheetColumns = [
  'CueCardId',
  'CreatedAt',
  'UpdatedAt',
  'Title',
  'ContentHtml',
  'ContentText',
  'ListItems',
  'FormatSummary',
] as const;

export type CueCardSheetColumn = (typeof cueCardSheetColumns)[number];

export type CueCardMode = 'generate' | 'view';
