export interface Memo {
  sno: number;
  title: string;
  description: string;
  status: boolean; // true = Completed, false = Active
  isLocal?: boolean; // true if manually created and stored in localStorage
  color?: string; // Background color for the memo
}

export interface MemoData {
  memos: Memo[];
}

export interface MemoStatusOverride {
  sno: number;
  status: boolean;
  updatedAt: Date;
}

export interface MemoColorOverride {
  sno: number;
  color: string;
  updatedAt: Date;
}

export interface LocalMemo {
  sno: number;
  title: string;
  description: string;
  status: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}
