# Local Attendance Database

Office Pulse keeps the existing `/logger` and `/calendar` routes unchanged. The parallel database implementation is available at:

- `/logger-pro` for creating and editing private attendance
- `/calendar-pro` for viewing private attendance by month

## Storage

- Android uses the Capacitor Community SQLite plugin and the `office_pulse_attendance` SQLite database.
- Web uses IndexedDB database `office-pulse-attendance-v1`.
- The storage service falls back to IndexedDB when it is running outside Android or the native SQLite plugin is unavailable.
- Data in these routes is independent of the existing Google Form, API, and local-storage attendance logic.

## Android packages

Install and synchronize the native plugins from WSL:

```bash
npm i @capacitor/core @capacitor-community/sqlite @capacitor/filesystem @capacitor/share
npx cap sync android
```

The Filesystem and Share plugins save or share encrypted backups from Android. Restore uses the system file picker exposed by the WebView file input.

## Backup format

Settings contains the backup and restore controls for the new attendance database. A backup has the `.officepulse` extension and is encrypted with:

- PBKDF2 with SHA-256 and 240,000 iterations
- A random 16-byte salt
- AES-256-GCM with a random 12-byte IV

The password is never stored. Restore validates the file, decrypts it, and replaces only the records in the new local attendance database. Existing `/logger` and `/calendar` data is not changed.

## Future migration

`AttendanceDatabaseService` is the boundary for local persistence. Existing attendance submission logic can be migrated later by mapping its data to `AttendanceDbRecord` and calling `save()`. Keep remote submission state in the `submitted` field so offline and synchronized records can be distinguished.

## Attendance rules

- The entry date is the attendance date. A date can have one normal shift and one explicitly added optional second shift.
- A day-off record cannot share a date with a work shift, and no date can contain more than two shifts.
- Entry details are locked after saving. Removing the record unlocks that date.
- An unfinished shift remains active after midnight and can exit on a later date.
- A new day becomes available after the active shift is exited or removed. Finishing an overnight shift does not consume the new day's normal entry.
- Company, work mode, comments, work hours, and overnight exit time are retained with the record and included in encrypted backups.
