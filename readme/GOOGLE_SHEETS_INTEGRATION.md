nvm install# Google Sheets Integration Guide

This guide explains how to set up and use the Google Sheets integration to display monthly attendance data in the Office Pulse application.

## Overview

The application fetches attendance data from a public Google Sheet using the Google Visualization API (gviz). The data is displayed in a beautiful calendar view with:

- Monthly navigation (previous/current month)
- Visual indicators for days with attendance
- Detailed view showing entry time, exit time, duration, company name, and comments
- Mobile-responsive design
- Statistics showing total days present and total working hours

## Setup Instructions

### 1. Google Sheet Setup

Your Google Sheet must be **publicly accessible** (anyone with the link can view) for the gviz API to work.

#### Expected Sheet Structure:

The sheet should have these columns in order (Row 1 should contain headers):

| Column A  | Column B   | Column C  | Column D     | Column E |
| --------- | ---------- | --------- | ------------ | -------- |
| Timestamp | Entry Time | Exit Time | Company Name | Comments |

**Example:**

```
Timestamp           | Entry Time        | Exit Time         | Company Name | Comments
2025-12-01 09:00:00 | 2025-12-01 09:00 | 2025-12-01 18:00 | ABC Corp     | Regular day
2025-12-01 09:15:00 | 2025-12-01 09:15 | 2025-12-01 18:15 | ABC Corp     | Corrected entry
```

**Important Notes:**

- If multiple entries exist for the same day, only the **latest entry** (by timestamp) will be displayed
- The form submission automatically populates these columns
- Entry Time and Exit Time should be in a format parseable by JavaScript Date (e.g., "YYYY-MM-DD HH:mm")

### 2. Make Sheet Public

1. Open your Google Sheet
2. Click **Share** button (top-right)
3. Click **Change to anyone with the link**
4. Set permission to **Viewer**
5. Click **Done**

### 3. Get Sheet ID and GID

From your sheet URL, extract these values:

**Sheet URL Format:**

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={GID}
```

**Example:**

```
https://docs.google.com/spreadsheets/d/1abc123xyz456/edit#gid=0
```

- **SHEET_ID**: `1abc123xyz456`
- **GID**: `0` (first sheet tab)

### 4. Update Environment Files

Update both environment files with your Sheet ID and GID:

**File: `src/environments/environment.ts`**

```typescript
export const environment = {
  production: true,
  YOUR_FORM_ID: '1FAIpQLSc...',
  GOOGLE_SHEET_ID: '1abc123xyz456', // ← Replace with your Sheet ID
  SHEET_GID: 0, // ← Replace if using different tab (0 = first tab)
  passwordHash: 'PASSWORD_HASH_PLACEHOLDER',
};
```

**File: `src/environments/environment.development.ts`**

```typescript
export const environment = {
  production: false,
  YOUR_FORM_ID: '1FAIpQLSc...',
  GOOGLE_SHEET_ID: '1abc123xyz456', // ← Replace with your Sheet ID
  SHEET_GID: 0, // ← Replace if using different tab (0 = first tab)
  passwordHash: 'cbfdac6008f9cab4083784cbd1874f76618d2a97',
};
```

## Features

### Calendar View

- **Current Month**: Shows by default when you open the app
- **Previous Months**: Click the ◀ button to view previous months
- **Next Month**: Click the ▶ button (disabled for future months)
- **Today Indicator**: Current day is highlighted with a blue border
- **Attendance Indicator**: Days with attendance show a green dot (●)

### Day Details

Click on any day with attendance (green dot) to view:

- 📅 Date
- 🕐 Entry Time
- 🕐 Exit Time
- ⏱️ Duration (calculated automatically)
- 🏢 Company Name (if provided)
- 💬 Comments (if provided)

### Statistics

At the top of the calendar:

- **Days Present**: Total attendance days for the month
- **Total Hours**: Sum of all working hours in the month

## How It Works

### Google Visualization API (gviz)

The app uses Google's Visualization API to query the sheet data:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tq={QUERY}&gid={GID}
```

**Query Example:**

```sql
SELECT A, B, C, D, E ORDER BY A DESC LIMIT 90
```

This fetches the last 90 entries, ordered by timestamp descending.

### Data Flow

1. Component loads and calls `GvizService.fetchEntriesForMonth()`
2. Service makes HTTP GET request to gviz endpoint
3. Response is parsed (JSONP format removed)
4. Entries are filtered by selected month
5. Duplicate entries for same day are removed (keeping latest)
6. Calendar grid is generated with attendance data
7. User can click days to view details

### Deduplication Logic

If multiple entries exist for the same day:

- Compare timestamps
- Keep the entry with the **most recent timestamp**
- Display only that entry in the calendar

## Troubleshooting

### "Failed to load attendance data"

**Causes:**

1. Sheet is not public
2. Incorrect SHEET_ID or GID
3. CORS issues
4. Sheet structure doesn't match expected format

**Solutions:**

1. Verify sheet is set to "Anyone with link can view"
2. Double-check SHEET_ID and GID from URL
3. Check browser console for detailed errors
4. Ensure column order matches: Timestamp, Entry Time, Exit Time, Company Name, Comments

### No Data Showing

**Causes:**

1. No entries for selected month
2. Date format in sheet is not parseable
3. Entry Time column is empty

**Solutions:**

1. Try navigating to different months
2. Ensure Entry Time format is: `YYYY-MM-DD HH:mm` or similar
3. Check that Google Form is populating all required fields

### Wrong Duration Calculation

**Causes:**

1. Entry Time or Exit Time format is incorrect
2. Time zone issues

**Solutions:**

1. Ensure both times use same format
2. Times should be in 24-hour format for best results
3. Example: `2025-12-01 09:00` and `2025-12-01 18:00`

## Mobile Optimization

The calendar is fully optimized for mobile:

- Touch-friendly tap targets (minimum 44x44px)
- Responsive grid layout
- Bottom sheet style for details modal
- Optimized font sizes
- Smooth touch scrolling

## Security Note

**Important:** The Google Sheet must be public for this integration to work. Do not store sensitive information in the sheet. Only attendance data (times, company name, comments) should be included.

## Column Customization

If your sheet has different columns, update the query in `gviz.service.ts`:

```typescript
// Current query (columns A-E)
const query = `SELECT A, B, C, D, E ORDER BY A DESC LIMIT ${days}`;

// Example: If you have 6 columns (A-F)
const query = `SELECT A, B, C, D, E, F ORDER BY A DESC LIMIT ${days}`;
```

Then update the parsing logic in `parseGVizResponse()` method to match your columns.

## API Limits

Google Visualization API has no documented hard limits for read-only access to public sheets, but:

- Keep query results under 10,000 rows
- Avoid excessive polling (current implementation loads on demand)
- Consider caching data client-side if needed

## Future Enhancements

Potential improvements:

- [ ] Export monthly data to CSV
- [ ] Filter by company name
- [ ] Weekly/yearly views
- [ ] Attendance statistics dashboard
- [ ] Offline caching with Service Workers
- [ ] Edit/delete entries (requires backend)

## Support

For issues or questions:

1. Check browser console for errors
2. Verify sheet permissions and structure
3. Test with sample data first
4. Review the gviz response in Network tab
