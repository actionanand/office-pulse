export interface Memo {
  sno: number;
  title: string;
  description: string;
  status: boolean; // true = Completed, false = Active
}

export interface MemoData {
  memos: Memo[];
}

export interface MemoStatusOverride {
  sno: number;
  status: boolean;
  updatedAt: Date;
}
