# Office Pulse - Logger and Calendar Architecture

## Table of Contents
1. [Overview](#overview)
2. [Entry Logger Component](#entry-logger-component)
3. [Monthly Calendar Component](#monthly-calendar-component)
4. [Attendance State Service](#attendance-state-service)
5. [Data Flow](#data-flow)
6. [Key Workflows](#key-workflows)

---

## Overview

Office Pulse is an attendance tracking application built with Angular 19, using standalone components and signals for reactive state management. The application consists of two main components:

- **Entry Logger**: Handles daily entry/exit logging and past date entries
- **Monthly Calendar**: Displays attendance data in a calendar view

Both components share state through the `AttendanceStateService` and integrate with Google Forms for data submission and Google Sheets for data retrieval.

---

## Entry Logger Component

### Purpose
The Entry Logger is the primary interface for recording attendance. It handles:
- Current day entry/exit logging
- Leave application (Day Off)
- Past date entry addition
- Integration with Google Forms for submission

### Core Signals

#### State Management Signals
```typescript
entryLog = signal<EntryLog | null>(null);           // Current entry/exit data from local storage
currentTime = signal<string>('');                    // Current time updated every second
workHours = signal<number>(6);                       // Default work hours for exit calculation
showEntryDialog = signal<boolean>(false);            // Entry dialog visibility
showExitDialog = signal<boolean>(false);             // Exit dialog visibility
showSubmissionDialog = signal<boolean>(false);       // Confirmation dialog visibility
showGoogleFormDialog = signal<boolean>(false);       // Google Form iframe visibility
googleFormUrl = signal<string>('');                  // Pre-filled Google Form URL
showPastDateDialog = signal<boolean>(false);         // Past date picker dialog visibility
showPastActionDialog = signal<boolean>(false);       // Past date action choice dialog visibility
selectedPastDate = signal<string>('');               // Selected past date (YYYY-MM-DD format)
```

#### Pending Form Data
```typescript
pendingFormData = signal<{ 
  log: EntryLog; 
  formData: { 
    companyName: string; 
    comment: string; 
    status: string 
  } 
} | null>(null);
```
Stores entry/exit data and form fields temporarily before Google Form submission.

### Computed Properties

#### From Attendance State Service
```typescript
hasEnteredToday = computed(() => this.attendanceState.hasEntryToday());
isSubmittedToday = computed(() => this.attendanceState.isSubmittedToday());
hasExitedToday = computed(() => this.attendanceState.hasExitToday());
todayApiEntry = computed(() => this.attendanceState.todayEntryFromAPI());
isDayOffToday = computed(() => {
  const apiEntry = this.todayApiEntry();
  return apiEntry?.status === 'Day Off';
});
```

These computed properties check:
- **hasEnteredToday**: Entry marked in local storage OR API data has today's entry
- **isSubmittedToday**: Entry has `isSubmitted: true` OR API has today's data
- **hasExitedToday**: Exit time exists in local storage OR API
- **todayApiEntry**: Today's entry from Google Sheets (via gviz API)
- **isDayOffToday**: Whether today is marked as Day Off

#### Display Computeds
```typescript
entryTimeDisplay = computed(() => { /* Shows entry time or "Day Off" */ });
exitTimeDisplay = computed(() => { /* Shows exit time, empty for Day Off */ });
durationDisplay = computed(() => { /* Shows work duration */ });
calculatedExitTime = computed(() => { /* Calculates when user can log off */ });
durationSinceEntry = computed(() => { /* Live duration since entry */ });
remainingTime = computed(() => { /* Time remaining to complete work hours */ });
```

#### UI Control Computeds
```typescript
canShowTodos = computed(() => this.hasEnteredToday());
shouldShowLeaveToggle = computed(() => !this.hasEnteredToday() && !this.isSubmittedToday());
maxDate = computed(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
});
```

### Core Logic Explanation

#### Entry/Exit Data Priority
```
API Data (from Google Sheets) > Local Storage
```

**Why?**
- Local storage holds **pending** entries that haven't been submitted
- API data contains **completed** submissions with both entry & exit
- Once submitted to Google Form → data goes to Google Sheets → retrieved via gviz API

#### Night Shift Support
```typescript
// Entry DATE determines the "day", not exit date
// Example: Enter Dec 1 11PM, Exit Dec 2 7AM = Dec 1's entry
```

The entry date (extracted from entry time) is the key for grouping attendance records, supporting employees who work night shifts.

#### Button Restrictions Logic
```typescript
// Entry Button
[disabled]="hasEnteredToday() || isSubmittedToday()"
// Disabled if: Already entered today OR Already submitted today

// Exit Button  
[disabled]="!hasEnteredToday() || hasExitedToday() || isSubmittedToday()"
// Disabled if: No entry OR Exit already marked OR Already submitted
```

### Key Workflows

#### 1. Normal Entry/Exit Flow
```
1. User clicks "Entry" button
   → openEntryDialog() → showEntryDialog = true
   
2. User chooses current time or custom time
   → handleEntrySubmit()
   → Creates EntryLog with entryTime
   → Saves to local storage
   → attendanceState.notifyLocalStorageChanged() → triggers reactivity
   → entryLog signal updates
   → UI shows "Welcome!" status

3. User clicks "Exit" button
   → openExitDialog() → showExitDialog = true
   
4. User fills company name, comments, status
   → handleExitSubmit(formData)
   → Updates EntryLog with exitTime
   → Saves to local storage
   → Stores pendingFormData
   → showSubmissionDialog = true

5. User confirms submission
   → confirmSubmission()
   → Builds Google Form URL with pre-filled data
   → showGoogleFormDialog = true
   
6. User submits Google Form
   → onGoogleFormSubmitted()
   → Marks log as submitted (isSubmitted: true)
   → attendanceState.fetchAttendanceData() → refreshes from API
   → UI shows "Submitted!" status
```

#### 2. Leave Application Flow (Day Off)
```
1. User toggles "Apply Leave" switch
   → applyLeave()
   
2. System creates EntryLog with:
   - entryTime: current time
   - exitTime: current time
   - Stores pendingFormData with:
     * companyName: ''
     * comment: 'Day Off - Leave Applied'
     * status: 'Day Off'
   
3. showSubmissionDialog = true

4. User confirms → Opens Google Form with Day Off data

5. After submission:
   → UI shows "Day Off Applied!" instead of entry/exit times
   → Duration not displayed for Day Off
```

#### 3. Past Date Entry Flow
```
1. User clicks "📅 Add Past Date Entry" button
   → openPastDateDialog() → showPastDateDialog = true
   
2. User selects a past date (date picker max = yesterday)
   → handlePastDateSelected(dateStr)
   → Validates date is in the past
   → selectedPastDate = dateStr
   → showPastActionDialog = true
   
3. User chooses action:

   A. Apply Leave:
      → applyLeaveForPastDate()
      → Creates Date object for selected date
      → Sets entry & exit to 12:00 PM (noon)
      → buildGoogleFormUrlForPastDate() with Day Off data
      → showGoogleFormDialog = true
      
   B. Add Entry:
      → addEntryForPastDate()
      → Creates Date object for selected date
      → Sets entry to 9:00 AM, exit to 6:00 PM
      → buildGoogleFormUrlForPastDate() with WFH status
      → showGoogleFormDialog = true

4. Google Form opens with pre-filled date/times

5. User adjusts times if needed and submits

6. After submission:
   → attendanceState.fetchAttendanceData()
   → Calendar refreshes to show new entry
   → selectedPastDate cleared
```

---

## Monthly Calendar Component

### Purpose
The Monthly Calendar displays attendance data in a calendar grid format with:
- Visual indicators for present days
- Status badges (WFH, Office, Day Off, Half Off)
- Month navigation
- Attendance statistics
- Detailed view for each day

### Core Signals

#### State Signals
```typescript
currentYear = signal<number>(new Date().getFullYear());
currentMonth = signal<number>(new Date().getMonth() + 1);    // 1-12 format
selectedDay = signal<CalendarDay | null>(null);               // Day selected for details
showAddEntryDialog = signal<boolean>(false);                  // Legacy dialog
showActionChoiceDialog = signal<boolean>(false);              // Action choice for past dates
selectedActionDate = signal<string>('');                      // Selected date for actions
showGoogleFormDialog = signal<boolean>(false);                // Google Form dialog
googleFormUrl = signal<string>('');                           // Pre-filled form URL
```

### Computed Properties

#### Data Computeds
```typescript
entries = computed(() => this.attendanceState.allEntries());
isLoading = computed(() => this.attendanceState.isLoading());
monthName = computed(() => {
  const date = new Date(this.currentYear(), this.currentMonth() - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});
```

#### Calendar Generation
```typescript
calendarDays = computed(() => this.generateCalendarDays());
entriesMap = computed(() => {
  const allEntries = this.entries();
  const filteredEntries = this.filterEntriesByMonth(allEntries, this.currentYear(), this.currentMonth());
  return this.groupByDateLatestOnly(filteredEntries);
});
```

**entriesMap**: A `Map<string, SheetEntry>` where:
- Key: Date string (YYYY-MM-DD)
- Value: Latest SheetEntry for that date (handles multiple submissions)

#### Statistics
```typescript
totalDaysPresent = computed(() => this.entriesMap().size);
totalWorkingHours = computed(() => {
  // Sums duration from all entries in the month
  // Parses "Xh Ym" format and returns total as "Xh Ym"
});
```

### Calendar Day Interface
```typescript
interface CalendarDay {
  date: number;              // Day number (1-31)
  fullDate: string;          // YYYY-MM-DD format
  isCurrentMonth: boolean;   // Whether day belongs to current month
  isToday: boolean;          // Whether day is today
  isFuture: boolean;         // Whether day is in the future
  entry?: SheetEntry;        // Associated attendance entry
}
```

### Core Logic Explanation

#### Calendar Grid Generation
```typescript
generateCalendarDays(): CalendarDay[]
```

Creates a 42-day grid (6 weeks × 7 days):

1. **Previous Month Days**: Fill start of week before month starts
2. **Current Month Days**: All days of the selected month
3. **Next Month Days**: Fill remainder to complete 42 days

Each day is marked with:
- `isCurrentMonth`: Only current month days are interactive
- `isToday`: Highlights today's date
- `isFuture`: Disables future dates
- `entry`: Attached if attendance record exists

#### Entry Grouping by Date
```typescript
groupByDateLatestOnly(entries: SheetEntry[]): Map<string, SheetEntry>
```

**Why Latest Only?**
Users might submit multiple corrections for the same date. This function:
1. Groups all entries by date
2. Compares timestamps
3. Keeps only the most recent entry per date

This ensures the calendar shows the final, corrected data.

#### Month Filtering
```typescript
filterEntriesByMonth(entries: SheetEntry[], year: number, month: number): SheetEntry[]
```

Filters all entries to show only those matching `YYYY-MM` of the displayed month.

### Key Workflows

#### 1. Calendar Navigation
```typescript
previousMonth(): void {
  // Decrements month, handles year rollback
}

nextMonth(): void {
  // Increments month only if not future
  // Disabled when currentYearMonth >= todayYearMonth
}

canGoNext(): boolean {
  // Returns false if trying to navigate to future months
}
```

#### 2. Day Selection
```typescript
selectDay(day: CalendarDay): void {
  if (!day.isCurrentMonth || day.isFuture) return;
  
  if (day.entry) {
    // Show details modal
    this.selectedDay.set(day);
  } else {
    // Show action choice for past dates without entry
    this.selectedActionDate.set(day.fullDate);
    this.showActionChoiceDialog.set(true);
  }
}
```

**Logic:**
- Ignore clicks on other months or future dates
- If entry exists → Show details modal
- If no entry (past date) → Show action choice dialog

#### 3. Status Display
```typescript
getStatusClass(status: string): string {
  // Maps status to CSS class
  // 'Day Off' → 'status-day-off'
  // 'WFH' → 'status-wfh'
  // etc.
}

getStatusLabel(status: string): string {
  // Maps status to short label for mini-badges
  // 'WFH' → 'WFH'
  // 'First Half Off' → '1/2'
  // 'Day Off' → 'OFF'
}
```

#### 4. Exit Date Display
```typescript
getExitDateDisplay(entry: SheetEntry): string {
  // Compares entry date vs exit date
  // Returns formatted exit date only if different (night shift)
  // Returns empty string if same day
}
```

Supports night shift by showing exit date when it differs from entry date.

---

## Attendance State Service

### Purpose
Centralized state management for attendance data shared between Entry Logger and Calendar components.

### Core Signals

```typescript
// Raw Data
private allEntriesSignal = signal<SheetEntry[]>([]);
isLoading = signal<boolean>(false);

// Reactivity Trigger
localStorageVersion = signal<number>(0);
```

### Computed Properties

```typescript
// All entries (triggers when localStorageVersion changes)
allEntries = computed(() => {
  this.localStorageVersion(); // Dependency
  return this.allEntriesSignal();
});

// Today's entry from API
todayEntryFromAPI = computed(() => {
  this.localStorageVersion();
  const today = this.getTodayDateString();
  return this.allEntriesSignal().find(entry => entry.date === today);
});

// Check if entry exists today (local storage OR API)
hasEntryToday = computed(() => {
  this.localStorageVersion();
  const localLog = this.storageService.getEntryLog();
  const hasLocalEntry = /* check local storage */;
  const hasApiEntry = this.todayEntryFromAPI() !== undefined;
  return hasLocalEntry || hasApiEntry;
});

// Similar for hasExitToday(), isSubmittedToday()
```

### Reactivity System

#### The Problem
Local storage changes don't automatically trigger Angular's change detection.

#### The Solution
```typescript
notifyLocalStorageChanged(): void {
  this.localStorageVersion.update(v => v + 1);
}
```

**How it works:**
1. Entry logger saves to local storage
2. Calls `attendanceState.notifyLocalStorageChanged()`
3. Increments `localStorageVersion` signal
4. All computeds depending on `localStorageVersion()` re-execute
5. UI updates reactively

**Usage:**
```typescript
// After any local storage change:
this.storageService.saveEntryLog(log);
this.attendanceState.notifyLocalStorageChanged(); // ← Triggers reactivity
```

### Data Fetching

```typescript
fetchAttendanceData(): void {
  this.isLoading.set(true);
  this.gvizService.getSheetData().subscribe({
    next: (data) => {
      this.allEntriesSignal.set(data);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error fetching data:', error);
      this.isLoading.set(false);
    }
  });
}

refreshIfNeeded(minutesSinceLastFetch: number = 5): void {
  const now = Date.now();
  const diff = (now - this.lastFetchTime) / 1000 / 60;
  
  if (diff >= minutesSinceLastFetch) {
    this.fetchAttendanceData();
  }
}
```

**Refresh Strategy:**
- Initial load: App component calls `fetchAttendanceData()` on init
- Periodic refresh: Calendar calls `refreshIfNeeded(5)` to refresh every 5+ minutes
- After submission: Manually called after Google Form submission

---

## Data Flow

### 1. Application Initialization
```
App Component ngOnInit
  └→ attendanceState.fetchAttendanceData()
      └→ gvizService.getSheetData()
          └→ Fetches from Google Sheets
          └→ allEntriesSignal.set(data)
              └→ allEntries() computed updates
                  └→ Calendar receives data
                  └→ Entry logger receives todayApiEntry
```

### 2. Entry Creation (Current Day)
```
User marks entry
  └→ EntryLogger.handleEntrySubmit()
      └→ storageService.saveEntryLog()
      └→ attendanceState.notifyLocalStorageChanged()
          └→ localStorageVersion increments
              └→ hasEnteredToday() re-computes → true
                  └→ UI updates (Welcome status, Exit button enabled)
```

### 3. Form Submission
```
User confirms submission
  └→ confirmSubmission()
      └→ buildGoogleFormUrl()
      └→ showGoogleFormDialog = true
          └→ User fills/submits Google Form
              └→ onGoogleFormSubmitted()
                  └→ log.isSubmitted = true
                  └→ storageService.saveEntryLog()
                  └→ attendanceState.fetchAttendanceData()
                      └→ Fetches fresh data from Google Sheets
                          └→ todayApiEntry() updates
                              └→ UI shows "Submitted!" status
```

### 4. Past Date Entry
```
User adds past date entry
  └→ openPastDateDialog()
      └→ User selects date
          └→ handlePastDateSelected()
              └→ showPastActionDialog = true
                  └→ User chooses Apply Leave / Add Entry
                      └→ buildGoogleFormUrlForPastDate()
                          └→ showGoogleFormDialog = true
                              └→ User submits
                                  └→ attendanceState.fetchAttendanceData()
                                      └→ Calendar refreshes
                                          └→ New entry appears in calendar grid
```

### 5. Calendar Month Change
```
User clicks next/previous month
  └→ previousMonth() / nextMonth()
      └→ currentYear/currentMonth signals update
          └→ calendarDays() re-computes
              └→ generateCalendarDays() runs
                  └→ entriesMap() filters entries for new month
                      └→ Calendar grid updates with new month's data
```

---

## Key Workflows

### Workflow 1: First Time User Flow
```
1. App loads → Fetches Google Sheets data → No entry for today
2. User sees "Not Checked In" status
3. User can:
   - Click "Entry" to mark entry
   - Toggle "Apply Leave" for Day Off
   - Click "Add Past Date Entry" for backdating
```

### Workflow 2: Daily Attendance Flow
```
Morning:
  User clicks Entry → Marks entry time → UI shows "Welcome!"
  
During Day:
  User sees live duration and remaining time
  Todo list becomes accessible
  
Evening:
  User clicks Exit → Fills company/comments/status → Confirms
  Google Form opens → User submits
  UI shows "Submitted!" with full details
  
Next Day:
  Data cleared from local storage (date mismatch)
  Ready for new entry
```

### Workflow 3: Night Shift Support
```
Dec 1, 11:00 PM:
  User marks Entry → entryTime: "2025-12-01T23:00:00"
  
Dec 2, 7:00 AM:
  User marks Exit → exitTime: "2025-12-02T07:00:00"
  User submits
  
Calendar Display:
  Dec 1: Shows entry with 8hr duration
  Dec 2: No entry (exit date ignored for grouping)
  
Details Modal:
  Shows entry time: Dec 1 11:00 PM
  Shows exit time: Dec 2 7:00 AM with date badge
  Duration: 8h 0m
```

### Workflow 4: Correction/Multiple Submissions
```
User submits entry for Dec 1 at 9 AM - 5 PM
Later realizes mistake
Adds past date entry for Dec 1 at 9 AM - 6 PM (correct)

Google Sheets now has 2 entries for Dec 1:
  Entry 1: Timestamp 10:00 AM
  Entry 2: Timestamp 2:00 PM (later)

Calendar Display:
  groupByDateLatestOnly() keeps Entry 2 only
  Dec 1 shows: 9 AM - 6 PM, 9h 0m
```

---

## Important Technical Considerations

### 1. Date Handling
```typescript
// Always use YYYY-MM-DD format for date keys
const dateKey = date.toISOString().split('T')[0];

// Entry date is extracted from ENTRY TIME, not exit time
const entryDate = this.getDateFromTimeString(log.entryTime);
```

### 2. Timezone
All date/time formatting uses `Asia/Kolkata` timezone:
```typescript
date.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  // ... format options
});
```

### 3. Google Form Integration
```typescript
// Field IDs (from Google Form URL inspection):
'entry.160031710'  // Entry Time
'entry.1057727999' // Exit Time
'entry.302638121'  // Company Name
'entry.1773816160' // Comments
'entry.1264867401' // Status

// Time format for Google Forms:
'YYYY-MM-DD HH:mm' // 24-hour format
```

### 4. Local Storage vs API Priority
```typescript
// Always check API first
const apiEntry = this.todayApiEntry();
if (apiEntry) {
  // Use API data
} else {
  // Fallback to local storage
}
```

### 5. Change Detection Strategy
Both components use:
```typescript
changeDetection: ChangeDetectionStrategy.OnPush
```

This means components only update when:
- Signal values change
- Input properties change
- Events fire

The `localStorageVersion` signal ensures local storage changes trigger updates.

---

## Summary

The Office Pulse architecture follows these principles:

1. **Separation of Concerns**: Entry Logger handles input, Calendar handles display
2. **Shared State**: AttendanceStateService provides single source of truth
3. **Reactive Design**: Signals and computeds for automatic UI updates
4. **API Priority**: Google Sheets data takes precedence over local storage
5. **User Flexibility**: Supports current day, past dates, leave, and night shifts
6. **Data Accuracy**: Latest submission wins for correction scenarios

The system is designed to be resilient, user-friendly, and maintainable while handling complex attendance tracking scenarios.
