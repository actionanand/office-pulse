export interface CueCard {
  id: string;
  rowNumber?: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  contentHtml: string;
  tableName: string;
  tableHeaderBold: boolean;
  table: CueCardTable | null;
  isOffline?: boolean;
}

export interface CueCardTable {
  rows: string[][];
}

export const cueCardSheetColumns = [
  'CueCardId',
  'CreatedAt',
  'UpdatedAt',
  'Title',
  'ContentHtml',
  'TableName',
  'TableHeaderBold',
  'TableData',
] as const;

export type CueCardSheetColumn = (typeof cueCardSheetColumns)[number];

export type CueCardMode = 'generate' | 'view';
