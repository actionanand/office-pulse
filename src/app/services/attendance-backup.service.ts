import { Injectable, inject } from '@angular/core';

import { AttendanceDbBackupSnapshot, AttendanceDbRecord, AttendanceDbStatus } from '../models/attendance-db.model';
import { AttendanceDatabaseService } from './attendance-database.service';

interface EncryptedBackupEnvelope {
  readonly format: 'office-pulse-attendance-backup';
  readonly version: 1;
  readonly createdAt: string;
  readonly iterations: number;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

interface NativeFileResult {
  readonly uri?: string;
}

interface NativePortabilityPlugins {
  Filesystem?: {
    writeFile(options: {
      path: string;
      data: string;
      directory: string;
      recursive?: boolean;
    }): Promise<NativeFileResult>;
  };
  Share?: {
    share(options: { title: string; text?: string; url?: string; dialogTitle?: string }): Promise<unknown>;
  };
}

interface NativeCapacitorBridge {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(pluginName: string) => T;
  Plugins?: NativePortabilityPlugins;
}

const ITERATIONS = 240_000;
const VALID_STATUSES = new Set<AttendanceDbStatus>([
  'Pending',
  'Office',
  'WFH',
  'Day Off',
  'First Half Off',
  'Second Half Off',
]);

@Injectable({ providedIn: 'root' })
export class AttendanceBackupService {
  private readonly database = inject(AttendanceDatabaseService);

  async createEncryptedBackup(passphrase: string): Promise<number> {
    this.validatePassphrase(passphrase);
    await this.database.refresh();

    const snapshot: AttendanceDbBackupSnapshot = { records: this.database.records() };
    const envelope = await this.encrypt(JSON.stringify(snapshot), passphrase);
    await this.saveFile(JSON.stringify(envelope));
    return snapshot.records.length;
  }

  async restoreEncryptedBackup(file: File, passphrase: string): Promise<number> {
    this.validatePassphrase(passphrase);
    const envelope = this.parseEnvelope(await file.text());
    const decrypted = await this.decrypt(envelope, passphrase);
    const records = this.parseSnapshot(decrypted);
    await this.database.replaceAll(records);
    return records.length;
  }

  async restoreBackup(file: File, passphrase: string, mode: 'merge' | 'replace' = 'merge'): Promise<number> {
    const records = await this.readBackupRecords(file, passphrase);
    if (mode === 'replace') {
      await this.database.replaceAll(records);
      return records.length;
    }
    return this.database.mergeAll(records);
  }

  private async readBackupRecords(file: File, passphrase: string): Promise<readonly AttendanceDbRecord[]> {
    const contents = await file.text();
    const parsed = this.parseJson(contents, 'This is not a valid Office Pulse backup file.');
    const envelope = parsed as Partial<EncryptedBackupEnvelope>;
    if (envelope.format === 'office-pulse-attendance-backup') {
      if (passphrase.length < 8) throw new Error('Enter the backup password used when this file was created.');
      const decrypted = await this.decrypt(this.validateEnvelope(envelope), passphrase);
      return this.parseSnapshot(decrypted);
    }
    return this.parseSnapshot(contents);
  }

  private async encrypt(plaintext: string, passphrase: string): Promise<EncryptedBackupEnvelope> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(passphrase, salt, ['encrypt']);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));

    return {
      format: 'office-pulse-attendance-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      iterations: ITERATIONS,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(new Uint8Array(ciphertext)),
    };
  }

  private async decrypt(envelope: EncryptedBackupEnvelope, passphrase: string): Promise<string> {
    try {
      const salt = this.fromBase64(envelope.salt);
      const iv = this.fromBase64(envelope.iv);
      const key = await this.deriveKey(passphrase, salt, ['decrypt'], envelope.iterations);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, this.fromBase64(envelope.ciphertext));
      return new TextDecoder().decode(plaintext);
    } catch {
      throw new Error('The backup password is incorrect or the file is damaged.');
    }
  }

  private async deriveKey(
    passphrase: string,
    salt: Uint8Array,
    usages: KeyUsage[],
    iterations = ITERATIONS,
  ): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
      'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      usages,
    );
  }

  private parseEnvelope(value: string): EncryptedBackupEnvelope {
    const envelope = this.parseJson(
      value,
      'This is not a valid Office Pulse backup file.',
    ) as Partial<EncryptedBackupEnvelope>;
    return this.validateEnvelope(envelope);
  }

  private validateEnvelope(envelope: Partial<EncryptedBackupEnvelope>): EncryptedBackupEnvelope {
    if (
      envelope.format !== 'office-pulse-attendance-backup' ||
      envelope.version !== 1 ||
      envelope.iterations !== ITERATIONS ||
      typeof envelope.salt !== 'string' ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.ciphertext !== 'string'
    ) {
      throw new Error('This backup format is not supported.');
    }
    return envelope as EncryptedBackupEnvelope;
  }

  private parseSnapshot(value: string): readonly AttendanceDbRecord[] {
    const parsed = this.parseJson(value, 'The backup data is invalid.');

    const records = (parsed as Partial<AttendanceDbBackupSnapshot>)?.records;
    if (!Array.isArray(records) || !records.every(record => this.isAttendanceRecord(record))) {
      throw new Error('The backup does not contain valid attendance records.');
    }
    return records;
  }

  private parseJson(value: string, message: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(message);
    }
  }

  private isAttendanceRecord(value: unknown): value is AttendanceDbRecord {
    const record = value as Partial<AttendanceDbRecord>;
    const validWorkHours =
      record.workHours === undefined ||
      (typeof record.workHours === 'number' &&
        Number.isFinite(record.workHours) &&
        record.workHours >= 0.5 &&
        record.workHours <= 24);
    return Boolean(
      record &&
        typeof record.id === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(record.date ?? '') &&
        VALID_STATUSES.has(record.status as AttendanceDbStatus) &&
        validWorkHours &&
        typeof record.createdAt === 'string' &&
        typeof record.updatedAt === 'string',
    );
  }

  private async saveFile(contents: string): Promise<void> {
    const fileName = `office-pulse-attendance-${this.localDate()}.officepulse`;
    const capacitor = (window as Window & { Capacitor?: NativeCapacitorBridge }).Capacitor;
    const filesystem =
      capacitor?.registerPlugin?.<NonNullable<NativePortabilityPlugins['Filesystem']>>('Filesystem') ??
      capacitor?.Plugins?.Filesystem;
    const share =
      capacitor?.registerPlugin?.<NonNullable<NativePortabilityPlugins['Share']>>('Share') ?? capacitor?.Plugins?.Share;

    if (capacitor?.isNativePlatform?.() && filesystem && share) {
      const result = await filesystem.writeFile({
        path: fileName,
        data: this.toBase64(new TextEncoder().encode(contents)),
        directory: 'CACHE',
        recursive: true,
      });
      await share.share({
        title: 'Office Pulse attendance backup',
        text: 'Encrypted Pro attendance backup',
        url: result.uri,
        dialogTitle: 'Save or share backup',
      });
      return;
    }

    const url = URL.createObjectURL(new Blob([contents], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private validatePassphrase(passphrase: string): void {
    if (passphrase.length < 8) throw new Error('Use a backup password with at least 8 characters.');
  }

  private localDate(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
}
