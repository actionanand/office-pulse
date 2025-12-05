export interface Holiday {
  sno: number;
  name: string;
  date: string;
  day: string;
}

export interface HolidayMeta {
  title: string;
  year: string;
  notes: string[];
}

export interface HolidayData {
  holidays: Holiday[];
  meta: HolidayMeta;
}
