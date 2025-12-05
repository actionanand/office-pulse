export interface ImportantDay {
  sno: number;
  name: string;
  date: string;
  day: string;      // Optional - may be empty
  tamilDay: string; // Optional - may be empty
}

export interface ImportantDayMeta {
  year: string;
  notes: string[];
}

export interface ImportantDayData {
  days: ImportantDay[];
  meta: ImportantDayMeta;
}
