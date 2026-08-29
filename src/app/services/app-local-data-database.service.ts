import { Injectable, signal } from '@angular/core';

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

interface AppLocalDataRecord {
  readonly key: string;
  readonly value: string;
  readonly updatedAt: string;
}

const SQLITE_NAME = 'office_pulse_app_data';
const INDEXED_DB_NAME = 'office-pulse-app-local-data-v1';
const STORE_NAME = 'app-local-data';

const LOCAL_STORAGE_DENYLIST = new Set(['angular_lock_auth', 'office_pulse_security']);

@Injectable({ providedIn: 'root' })
export class AppLocalDataDatabaseService {
  readonly ready = signal(false);
  readonly storageKind = signal<'SQLite' | 'IndexedDB'>('IndexedDB');

  private initialization?: Promise<void>;
  private sqlite?: SqlitePlugin;
  private indexedDatabase?: Promise<IDBDatabase>;
  private readonly memory = new Map<string, string>();

  initialize(): Promise<void> {
    this.initialization ??= this.initializeStorage().catch(() => {
      this.ready.set(true);
    });
    return this.initialization;
  }

  getItem(key: string): string | null {
    return this.memory.get(key) ?? this.readLocalStorage(key);
  }

  setItem(key: string, value: string): void {
    this.memory.set(key, value);
    void this.persist({ key, value, updatedAt: new Date().toISOString() }).catch(() =>
      this.writeLocalFallback(key, value),
    );
  }

  removeItem(key: string): void {
    this.memory.delete(key);
    this.removeLocalStorage(key);
    void this.removePersisted(key);
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
          statements: `CREATE TABLE IF NOT EXISTS app_local_data (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          transaction: true,
        });
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

    await this.hydrateFromDatabase();
    await this.migrateLocalStorage();
    this.clearMigratedLocalStorage();
    this.ready.set(true);
  }

  private async hydrateFromDatabase(): Promise<void> {
    const records = this.sqlite ? await this.listSqlite() : await this.listIndexedDb();
    for (const record of records) {
      if (this.shouldSkipKey(record.key)) continue;
      this.memory.set(record.key, record.value);
    }
  }

  private async migrateLocalStorage(): Promise<void> {
    const records: AppLocalDataRecord[] = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || this.shouldSkipKey(key) || this.memory.has(key)) continue;
        const value = localStorage.getItem(key);
        if (value === null) continue;
        records.push({ key, value, updatedAt: new Date().toISOString() });
      }
    } catch {
      return;
    }

    for (const record of records) {
      this.memory.set(record.key, record.value);
      await this.persistReady(record);
      this.removeLocalStorage(record.key);
    }
  }

  private clearMigratedLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && !this.shouldSkipKey(key)) keysToRemove.push(key);
      }

      for (const key of keysToRemove) {
        this.removeLocalStorage(key);
      }
    } catch {
      // Keep the app usable if browser storage is blocked during cleanup.
    }
  }

  private shouldSkipKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return (
      LOCAL_STORAGE_DENYLIST.has(key) ||
      normalized.includes('passwordhash') ||
      normalized.includes('password_hash') ||
      normalized.includes('pinverifier') ||
      normalized.includes('pin_verifier') ||
      normalized.includes('pinsalt') ||
      normalized.includes('pin_salt')
    );
  }

  private async persist(record: AppLocalDataRecord): Promise<void> {
    await this.initialize();
    await this.persistReady(record);
  }

  private async persistReady(record: AppLocalDataRecord): Promise<void> {
    if (this.shouldSkipKey(record.key)) return;
    if (this.sqlite) await this.putSqlite(record);
    else await this.putIndexedDb(record);
  }

  private async removePersisted(key: string): Promise<void> {
    await this.initialize();
    if (this.sqlite) {
      await this.sqlite.run({
        database: SQLITE_NAME,
        statement: 'DELETE FROM app_local_data WHERE key = ?',
        values: [key],
        transaction: true,
      });
      return;
    }

    const database = await this.openIndexedDb();
    await this.transaction(database, store => store.delete(key));
  }

  private async listSqlite(): Promise<readonly AppLocalDataRecord[]> {
    const result = await this.sqlite!.query({
      database: SQLITE_NAME,
      statement: 'SELECT key, value, updated_at FROM app_local_data ORDER BY key',
    });
    return (result.values ?? []).map(value => {
      const row = value as Record<string, unknown>;
      return {
        key: String(row['key']),
        value: String(row['value']),
        updatedAt: String(row['updated_at']),
      };
    });
  }

  private async putSqlite(record: AppLocalDataRecord): Promise<void> {
    await this.sqlite!.run({
      database: SQLITE_NAME,
      statement: `INSERT INTO app_local_data (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at`,
      values: [record.key, record.value, record.updatedAt],
      transaction: true,
    });
  }

  private async listIndexedDb(): Promise<readonly AppLocalDataRecord[]> {
    const database = await this.openIndexedDb();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as AppLocalDataRecord[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async putIndexedDb(record: AppLocalDataRecord): Promise<void> {
    const database = await this.openIndexedDb();
    await this.transaction(database, store => store.put(record));
  }

  private openIndexedDb(): Promise<IDBDatabase> {
    this.indexedDatabase ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('App local data is open in another tab.'));
    });
    return this.indexedDatabase;
  }

  private transaction(database: IDBDatabase, action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      action(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  private readLocalStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private removeLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  private writeLocalFallback(key: string, value: string): void {
    if (this.shouldSkipKey(key)) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage fallback failures.
    }
  }
}
