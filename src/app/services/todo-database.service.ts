import { Injectable, signal } from '@angular/core';

import { TodoDbRecord } from '../models/todo-db.model';

interface SqlitePlugin {
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
  registerPlugin?: <T>(name: string) => T;
  Plugins?: { CapacitorSQLite?: SqlitePlugin };
}

const SQLITE_NAME = 'office_pulse_todos';
const INDEXED_DB_NAME = 'office-pulse-todos-v1';
const TODO_STORE = 'todos';

@Injectable({ providedIn: 'root' })
export class TodoDatabaseService {
  readonly todos = signal<readonly TodoDbRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  private initialization?: Promise<void>;
  private sqlite?: SqlitePlugin;
  private indexedDatabase?: Promise<IDBDatabase>;

  initialize(): Promise<void> {
    this.initialization ??= this.initializeStorage();
    return this.initialization;
  }

  async refresh(): Promise<void> {
    await this.initialize();
    this.loading.set(true);
    try {
      this.todos.set(this.sort(this.sqlite ? await this.listSqlite() : await this.listIndexedDb()));
      this.error.set('');
    } catch (error) {
      this.error.set('Unable to open tasks.');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async save(todo: TodoDbRecord): Promise<void> {
    await this.initialize();
    if (this.sqlite) await this.putSqlite(todo);
    else await this.putIndexedDb(todo);
    this.todos.update(todos => this.sort([todo, ...todos.filter(existing => existing.id !== todo.id)]));
  }

  async remove(id: string): Promise<void> {
    await this.initialize();
    if (this.sqlite) {
      await this.sqlite.run({
        database: SQLITE_NAME,
        statement: 'DELETE FROM todos WHERE id = ?',
        values: [id],
        transaction: true,
      });
    } else {
      const database = await this.openIndexedDb();
      await this.transaction(database, store => store.delete(id));
    }
    this.todos.update(todos => todos.filter(todo => todo.id !== id));
  }

  private async initializeStorage(): Promise<void> {
    const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
    const isAndroid = capacitor?.getPlatform?.() === 'android' && capacitor?.isNativePlatform?.() === true;
    const sqlite = isAndroid
      ? (capacitor?.registerPlugin?.<SqlitePlugin>('CapacitorSQLite') ?? capacitor?.Plugins?.CapacitorSQLite)
      : undefined;

    if (sqlite) {
      try {
        this.sqlite = sqlite;
        try {
          await sqlite.createConnection({
            database: SQLITE_NAME,
            version: 1,
            encrypted: false,
            mode: 'no-encryption',
            readonly: false,
          });
        } catch {
          // Reuse the named connection after Android activity recreation.
        }
        await sqlite.open({ database: SQLITE_NAME });
        await sqlite.execute({
          database: SQLITE_NAME,
          statements: `CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            notes TEXT,
            due_time TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            recurrence TEXT NOT NULL,
            days_of_week TEXT NOT NULL,
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            reminder_minutes INTEGER NOT NULL DEFAULT 0,
            completed_dates TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          transaction: true,
        });
      } catch {
        this.sqlite = undefined;
        await this.openIndexedDb();
      }
    } else {
      await this.openIndexedDb();
    }
    const todos = this.sqlite ? await this.listSqlite() : await this.listIndexedDb();
    this.todos.set(this.sort(todos));
  }

  private async listSqlite(): Promise<readonly TodoDbRecord[]> {
    const result = await this.sqlite!.query({
      database: SQLITE_NAME,
      statement: 'SELECT * FROM todos ORDER BY start_date, due_time, title',
    });
    return (result.values ?? []).map(value => this.fromRow(value));
  }

  private async putSqlite(todo: TodoDbRecord): Promise<void> {
    await this.sqlite!.run({
      database: SQLITE_NAME,
      statement: `INSERT OR REPLACE INTO todos
        (id,title,notes,due_time,start_date,end_date,recurrence,days_of_week,reminder_enabled,reminder_minutes,completed_dates,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      values: [
        todo.id,
        todo.title,
        todo.notes ?? null,
        todo.dueTime ?? null,
        todo.startDate,
        todo.endDate ?? null,
        todo.recurrence,
        JSON.stringify(todo.daysOfWeek),
        todo.reminderEnabled ? 1 : 0,
        todo.reminderMinutesBefore,
        JSON.stringify(todo.completedDates),
        todo.createdAt,
        todo.updatedAt,
      ],
      transaction: true,
    });
  }

  private fromRow(value: unknown): TodoDbRecord {
    const row = value as Record<string, unknown>;
    return {
      id: String(row['id']),
      title: String(row['title']),
      notes: row['notes'] ? String(row['notes']) : undefined,
      dueTime: row['due_time'] ? String(row['due_time']) : undefined,
      startDate: String(row['start_date']),
      endDate: row['end_date'] ? String(row['end_date']) : undefined,
      recurrence: String(row['recurrence']) as TodoDbRecord['recurrence'],
      daysOfWeek: this.parseStringArray(row['days_of_week']) as TodoDbRecord['daysOfWeek'],
      reminderEnabled: Number(row['reminder_enabled']) === 1,
      reminderMinutesBefore: Number(row['reminder_minutes']) || 0,
      completedDates: this.parseStringArray(row['completed_dates']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private async listIndexedDb(): Promise<readonly TodoDbRecord[]> {
    const database = await this.openIndexedDb();
    return new Promise((resolve, reject) => {
      const request = database.transaction(TODO_STORE, 'readonly').objectStore(TODO_STORE).getAll();
      request.onsuccess = () => resolve(request.result as TodoDbRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async putIndexedDb(todo: TodoDbRecord): Promise<void> {
    const database = await this.openIndexedDb();
    await this.transaction(database, store => store.put(todo));
  }

  private openIndexedDb(): Promise<IDBDatabase> {
    this.indexedDatabase ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(TODO_STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Tasks are open in another tab.'));
    });
    return this.indexedDatabase;
  }

  private transaction(database: IDBDatabase, action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(TODO_STORE, 'readwrite');
      action(transaction.objectStore(TODO_STORE));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  private parseStringArray(value: unknown): string[] {
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private sort(todos: readonly TodoDbRecord[]): readonly TodoDbRecord[] {
    return [...todos].sort((a, b) =>
      `${a.startDate}|${a.dueTime ?? ''}|${a.title}`.localeCompare(`${b.startDate}|${b.dueTime ?? ''}|${b.title}`),
    );
  }
}
