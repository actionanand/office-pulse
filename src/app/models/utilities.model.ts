// Copy/Transfer models
export interface CopyItem {
  link: string;
  comment: string;
  timestamp: string;
}

export interface CopyFormData {
  link?: string;
  comment?: string;
}

// Stopwatch models
export interface StopwatchState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number; // in milliseconds
  laps: number[];
}

// Memo/Shopping checklist models
export interface MemoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface MemoList {
  items: MemoItem[];
  lastUpdated: string;
}
