export type AttendanceDbStatus = 'Pending' | 'Office' | 'WFH' | 'Day Off' | 'First Half Off' | 'Second Half Off';

export interface AttendanceDbRecord {
  readonly id: string;
  readonly date: string;
  readonly entryTime?: string;
  readonly exitTime?: string;
  readonly status: AttendanceDbStatus;
  readonly companyName?: string;
  readonly comments?: string;
  readonly workHours?: number;
  readonly submitted?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AttendanceDbBackupSnapshot {
  readonly records: readonly AttendanceDbRecord[];
}
