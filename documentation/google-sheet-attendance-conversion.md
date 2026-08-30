# Google Sheet Attendance Conversion

This flow converts the old Google Sheet logger rows into a Pro attendance backup that Office Pulse can restore into SQLite on Android or IndexedDB on web.

The converter does not create a raw SQLite file. It creates the same Pro attendance backup shape used by Settings, so the app can import it into the correct storage engine for the current device.

## Safety

After the backup is read or decrypted successfully, Office Pulse asks whether to **Merge**, **Replace**, or **Cancel**. Use **Merge** when restoring converted Sheet data. Merge keeps existing Logger Pro and Calendar Pro records and adds only records that are not already present.

Merge skips:

- records that match an existing date, status, entry time, and exit time
- a third shift on the same day
- day-off records that conflict with work shifts on the same day
- work shifts on a day already marked as day off

The attendance restore only writes to the Pro attendance records table. Todo data, local app settings, and password/PIN localStorage data are not replaced by this import. The old legacy Sheet cache keys are cleared after Merge or Replace so the imported backup is treated as the source for Pro attendance.

Taking a fresh encrypted backup from Settings before importing is still a good habit, especially on Android.

## Supported Sheet Format

The converter expects the Google Visualization API response used by the legacy logger:

- Column A: submitted timestamp
- Column B: entry time
- Column C: exit time
- Column D: company name
- Column E: comments
- Column F: status

Supported statuses are:

- `Office`
- `WFH`
- `Day Off`
- `First Half Off`
- `Second Half Off`
- `Pending`

Unknown or blank statuses are imported as `Office`.

## Convert From A Saved API Response

Save the API response text into a file, then run:

```bash
npm run attendance:convert -- --input ./google-sheet-response.txt --passphrase "your backup password" --output ./releases/google-sheet-attendance.officepulse
```

The passphrase must be at least 8 characters. The output `.officepulse` file can be restored from Settings.

For inspection or compatibility testing, create a plain JSON backup:

```bash
npm run attendance:convert -- --input ./google-sheet-response.txt --output ./releases/google-sheet-attendance.json
```

Plain JSON backups can also be restored from Settings. Leave the backup password blank while restoring a plain JSON file.

## Convert Directly From A Public Sheet URL

You can pass the normal public Google Sheet URL. The converter will turn it into the matching GViz API URL automatically:

```bash
npm run attendance:convert -- --url "https://docs.google.com/spreadsheets/d/1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs/edit?gid=2129265715#gid=2129265715" --passphrase "your backup password" --output ./releases/google-sheet-attendance.officepulse
```

Network access must be available from the terminal where the command is run.

To limit the number of rows:

```bash
npm run attendance:convert -- --url "https://docs.google.com/spreadsheets/d/1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs/edit?gid=2129265715#gid=2129265715" --limit 90 --passphrase "your backup password" --output ./releases/google-sheet-attendance.officepulse
```

If the URL does not contain `gid`, pass it separately:

```bash
npm run attendance:convert -- --url "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" --gid 2129265715 --passphrase "your backup password"
```

## Convert Directly From A GViz URL

Already-built GViz URLs still work:

```bash
npm run attendance:convert -- --url "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tq=SELECT+A%2C+B%2C+C%2C+D%2C+E%2C+F+ORDER+BY+A+DESC+LIMIT+90&gid=YOUR_GID&headers=1" --passphrase "your backup password" --output ./releases/google-sheet-attendance.officepulse
```

## Restore In Office Pulse

1. Open **Settings**.
2. In **Pro attendance backup**, choose **Restore**.
3. Select the converted `.officepulse` or `.json` file.
4. Enter the passphrase for encrypted `.officepulse` files. Leave it blank for plain `.json` files.
5. Continue so Office Pulse can verify or decrypt the backup.
6. Choose **Merge**, **Replace**, or **Cancel**.

After importing, check Calendar Pro for day totals and Logger Pro for recent entries.

## How Existing DB Data Is Preserved

The app asks for the restore method only after it has verified or decrypted the selected backup. Merge reads the current Pro attendance rows first, builds a combined list in memory, and then writes the combined result back to the Pro attendance table.

It does not call Replace for a Sheet import unless you choose **Replace** after the backup is verified.

During Merge:

- current Pro records are kept
- matching imported records are skipped
- imported records are added only when the day rules are still valid
- other app tables are not touched
- old legacy Sheet cache keys are cleared after the restore action

On Android this writes back into the `office_pulse_attendance` SQLite database. On web this writes back into the `office-pulse-attendance-v1` IndexedDB database.

## Replace Mode

Use **Replace** only when the backup file is a complete source of truth. Replace deletes existing Logger Pro and Calendar Pro attendance records before writing the backup records. It does not affect the legacy Logger/Calendar data, Todo data, Settings, or PIN/password localStorage data.

## Compatibility Notes

The converter reads Google `Date(year, month, day, hour, minute, second)` values using the local timezone of the machine running the command. This matches how the legacy app displayed the Sheet data.

Each imported record receives an id like:

```text
sheet-2026-08-30-0001
```

If the same Sheet row is imported again, Merge prevents visible duplicates by comparing date, status, entry time, and exit time.
