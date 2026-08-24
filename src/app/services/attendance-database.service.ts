import { Injectable, signal } from '@angular/core';

import { AttendanceDbRecord } from '../models/attendance-db.model';

type StoredAttendanceRecord = AttendanceDbRecord;

interface CapacitorSqlitePlugin {
  createConnection(options: {
    database: string;
    version: number;
    encrypted: boolean;
    mode: string;
    readonly: boolean;
  }): Promise<unknown>;
  open(options: { database: string; readonly?: boolean }): Promise<unknown>;
  execute(options: { database: string; statements: string; transaction?: boolean }): Promise<unknown>;
  query(options: { database: string; statement: string; values?: unknown[] }): Promise<{ values?: unknown[] }>;
  run(options: { database: string; statement: string; values?: unknown[]; transaction?: boolean }): Promise<unknown>;
}

interface CapacitorBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(pluginName: string) => T;
  Plugins?: {
    CapacitorSQLite?: CapacitorSqlitePlugin;
  };
}

const DATABASE_NAME = 'office-pulse-attendance-v1';
const RECORD_STORE = 'attendance-records-v3';
const LEGACY_RECORD_STORE = 'attendance-records';
const SQLITE_DATABASE = 'office_pulse_attendance';

@Injectable({ providedIn: 'root' })
export class AttendanceDatabaseService {
  readonly records = signal<readonly AttendanceDbRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly storageKind = signal<'SQLite' | 'IndexedDB'>('IndexedDB');

  private initialization?: Promise<void>;
  private indexedDatabase?: Promise<IDBDatabase>;
  private sqlite?: CapacitorSqlitePlugin;

  initialize(): Promise<void> {
    this.initialization ??= this.initializeStorage();
    return this.initialization;
  }

  async refresh(): Promise<void> {
    await this.initialize();
    this.loading.set(true);
    this.error.set('');
    try {
      const records = this.sqlite ? await this.listSqlite() : await this.listIndexedDb();
      this.records.set(this.sortRecords(records));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to open attendance history.');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async getByDate(date: string): Promise<AttendanceDbRecord | null> {
    await this.initialize();
    if (!this.records().length) await this.refresh();
    return this.records().find(record => record.date === date) ?? null;
  }

  async save(record: AttendanceDbRecord): Promise<void> {
    await this.initialize();
    const existingRecord = this.records().find(existing => existing.id === record.id);
    const activeRecord = this.records().find(existing =>
      Boolean(existing.entryTime && !existing.exitTime && existing.status !== 'Day Off'),
    );
    if (!existingRecord && activeRecord)
      throw new Error(`Finish or remove the active ${activeRecord.date} shift first.`);
    const conflictingRecord = this.records().find(
      existing => existing.date === record.date && existing.id !== record.id,
    );
    if (conflictingRecord) throw new Error('Attendance is already recorded for this entry date.');
    if (this.sqlite) await this.putSqlite(record);
    else await this.putIndexedDb(record);
    this.records.update(records =>
      this.sortRecords([record, ...records.filter(existing => existing.id !== record.id)]),
    );
  }

  async remove(id: string): Promise<void> {
    await this.initialize();
    if (this.sqlite) {
      await this.sqlite.run({
        database: SQLITE_DATABASE,
        statement: 'DELETE FROM attendance_records WHERE id = ?',
        values: [id],
        transaction: true,
      });
    } else {
      const database = await this.openIndexedDb();
      const record = this.records().find(existing => existing.id === id);
      if (record) await this.transactionComplete(database, 'readwrite', store => store.delete(record.date));
    }
    this.records.update(records => records.filter(record => record.id !== id));
  }

  async replaceAll(records: readonly AttendanceDbRecord[]): Promise<void> {
    await this.initialize();
    this.assertUniqueDates(records);
    if (this.sqlite) {
      await this.sqlite.execute({
        database: SQLITE_DATABASE,
        statements: 'DELETE FROM attendance_records;',
        transaction: true,
      });
      for (const record of records) await this.putSqlite(record);
    } else {
      const database = await this.openIndexedDb();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(RECORD_STORE, 'readwrite');
        const store = transaction.objectStore(RECORD_STORE);
        store.clear();
        for (const record of records) store.put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    }
    this.records.set(this.sortRecords(records));
  }

  private async initializeStorage(): Promise<void> {
    const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
    const isAndroid = capacitor?.getPlatform?.() === 'android' || capacitor?.isNativePlatform?.();
    const nativeSqlite = isAndroid
      ? (capacitor?.registerPlugin?.<CapacitorSqlitePlugin>('CapacitorSQLite') ?? capacitor?.Plugins?.CapacitorSQLite)
      : undefined;

    if (nativeSqlite) {
      try {
        this.sqlite = nativeSqlite;
        try {
          await nativeSqlite.createConnection({
            database: SQLITE_DATABASE,
            version: 1,
            encrypted: false,
            mode: 'no-encryption',
            readonly: false,
          });
        } catch {
          // Capacitor keeps named connections across Android activity resumes.
          // Opening the existing connection is valid when creation reports it already exists.
        }
        await nativeSqlite.open({ database: SQLITE_DATABASE, readonly: false });
        await nativeSqlite.execute({
          database: SQLITE_DATABASE,
          statements: `
            CREATE TABLE IF NOT EXISTS attendance_records (
              id TEXT PRIMARY KEY NOT NULL,
              date TEXT NOT NULL,
              entry_time TEXT,
              exit_time TEXT,
              status TEXT NOT NULL,
              company_name TEXT,
              comments TEXT,
              work_hours REAL NOT NULL DEFAULT 6,
              submitted INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `,
          transaction: true,
        });
        await this.ensureSqliteWorkHoursColumn(nativeSqlite);
        await this.ensureSqliteUniqueDates(nativeSqlite);
        this.storageKind.set('SQLite');
      } catch {
        this.sqlite = undefined;
        await this.openIndexedDb();
        this.storageKind.set('IndexedDB');
      }
    } else {
      await this.openIndexedDb();
      this.storageKind.set('IndexedDB');
    }

    await this.refreshWithoutInitialize();
  }

  private async refreshWithoutInitialize(): Promise<void> {
    const records = this.sqlite ? await this.listSqlite() : await this.listIndexedDb();
    this.records.set(this.sortRecords(records));
  }

  private async listSqlite(): Promise<readonly AttendanceDbRecord[]> {
    const result = await this.sqlite!.query({
      database: SQLITE_DATABASE,
      statement: `SELECT id, date, entry_time, exit_time, status, company_name, comments,
        work_hours, submitted, created_at, updated_at FROM attendance_records ORDER BY date DESC, updated_at DESC`,
    });
    return (result.values ?? []).map(value => this.fromSqliteRow(value));
  }

  private async putSqlite(record: AttendanceDbRecord): Promise<void> {
    await this.sqlite!.run({
      database: SQLITE_DATABASE,
      statement: `INSERT INTO attendance_records
        (id, date, entry_time, exit_time, status, company_name, comments, work_hours, submitted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          entry_time = excluded.entry_time,
          exit_time = excluded.exit_time,
          status = excluded.status,
          company_name = excluded.company_name,
          comments = excluded.comments,
          work_hours = excluded.work_hours,
          submitted = excluded.submitted,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at`,
      values: [
        record.id,
        record.date,
        record.entryTime ?? null,
        record.exitTime ?? null,
        record.status,
        record.companyName ?? null,
        record.comments ?? null,
        record.workHours ?? 6,
        record.submitted ? 1 : 0,
        record.createdAt,
        record.updatedAt,
      ],
      transaction: true,
    });
  }

  private fromSqliteRow(value: unknown): AttendanceDbRecord {
    const row = value as Record<string, unknown>;
    return {
      id: String(row['id']),
      date: String(row['date']),
      entryTime: row['entry_time'] ? String(row['entry_time']) : undefined,
      exitTime: row['exit_time'] ? String(row['exit_time']) : undefined,
      status: String(row['status']) as AttendanceDbRecord['status'],
      companyName: row['company_name'] ? String(row['company_name']) : undefined,
      comments: row['comments'] ? String(row['comments']) : undefined,
      workHours: Number(row['work_hours']) || 6,
      submitted: Number(row['submitted']) === 1,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private async listIndexedDb(): Promise<readonly AttendanceDbRecord[]> {
    const database = await this.openIndexedDb();
    return new Promise<readonly AttendanceDbRecord[]>((resolve, reject) => {
      const request = database.transaction(RECORD_STORE, 'readonly').objectStore(RECORD_STORE).getAll();
      request.onsuccess = () => resolve(request.result as readonly StoredAttendanceRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureSqliteWorkHoursColumn(sqlite: CapacitorSqlitePlugin): Promise<void> {
    const columns = await sqlite.query({
      database: SQLITE_DATABASE,
      statement: 'PRAGMA table_info(attendance_records)',
    });
    const hasWorkHours = (columns.values ?? []).some(value => {
      const column = value as Record<string, unknown>;
      return column['name'] === 'work_hours';
    });
    if (hasWorkHours) return;

    await sqlite.execute({
      database: SQLITE_DATABASE,
      statements: 'ALTER TABLE attendance_records ADD COLUMN work_hours REAL NOT NULL DEFAULT 6;',
      transaction: true,
    });
  }

  private async ensureSqliteUniqueDates(sqlite: CapacitorSqlitePlugin): Promise<void> {
    await sqlite.execute({
      database: SQLITE_DATABASE,
      statements: `
        DELETE FROM attendance_records
        WHERE rowid NOT IN (
          SELECT selected.rowid
          FROM attendance_records AS selected
          WHERE selected.rowid = (
            SELECT candidate.rowid
            FROM attendance_records AS candidate
            WHERE candidate.date = selected.date
            ORDER BY candidate.updated_at DESC, candidate.rowid DESC
            LIMIT 1
          )
        );
        DROP INDEX IF EXISTS attendance_records_date_idx;
        CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_date_idx ON attendance_records(date);
      `,
      transaction: true,
    });
  }

  private async putIndexedDb(record: AttendanceDbRecord): Promise<void> {
    const database = await this.openIndexedDb();
    await this.transactionComplete(database, 'readwrite', store => store.put(record));
  }

  private openIndexedDb(): Promise<IDBDatabase> {
    this.indexedDatabase ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (database.objectStoreNames.contains(RECORD_STORE)) return;

        const store = database.createObjectStore(RECORD_STORE, { keyPath: 'date' });
        store.createIndex('id', 'id', { unique: true });
        if (!database.objectStoreNames.contains(LEGACY_RECORD_STORE)) return;

        const legacyRequest = request.transaction!.objectStore(LEGACY_RECORD_STORE).getAll();
        legacyRequest.onsuccess = () => {
          const newestByDate = new Map<string, StoredAttendanceRecord>();
          for (const record of legacyRequest.result as StoredAttendanceRecord[]) {
            const existing = newestByDate.get(record.date);
            if (!existing || record.updatedAt > existing.updatedAt) newestByDate.set(record.date, record);
          }
          for (const record of newestByDate.values()) store.put(record);
          database.deleteObjectStore(LEGACY_RECORD_STORE);
        };
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Attendance history is open in another tab. Close it and retry.'));
    });
    return this.indexedDatabase;
  }

  private transactionComplete(
    database: IDBDatabase,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, mode);
      action(transaction.objectStore(RECORD_STORE));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  private sortRecords(records: readonly AttendanceDbRecord[]): readonly AttendanceDbRecord[] {
    return [...records].sort((left, right) =>
      right.date === left.date ? right.updatedAt.localeCompare(left.updatedAt) : right.date.localeCompare(left.date),
    );
  }

  private assertUniqueDates(records: readonly AttendanceDbRecord[]): void {
    const dates = new Set<string>();
    for (const record of records) {
      if (dates.has(record.date)) throw new Error(`The backup contains more than one entry for ${record.date}.`);
      dates.add(record.date);
    }
  }
}
