# InOut Register - Visual Flow

## Daily Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         START OF DAY                                 │
│                    (No entry for today exists)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │  Click Entry  │
                     │    Button     │
                     └───────┬───────┘
                             │
                ┌────────────▼────────────┐
                │  Entry Time Dialog      │
                │  • Current Time         │
                │  • Custom Time          │
                └────────────┬────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │ Entry Recorded   │
                   │ Status: Welcome! │
                   │ Todo List Shows  │
                   │ Exit Calculator  │
                   └────────┬─────────┘
                            │
                ┌───────────▼───────────┐
                │  Entry Button: OFF    │
                │  Exit Button: ON      │
                └───────────┬───────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Manage      │ │ Adjust Work │ │ View Exit   │
    │ Todos       │ │ Hours       │ │ Calculator  │
    └─────────────┘ └─────────────┘ └─────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Click Exit   │
                    │    Button     │
                    └───────┬───────┘
                            │
                ┌───────────▼────────────┐
                │  Exit Dialog           │
                │  • Company Name        │
                │  • Comments            │
                │  • Entry Time (shown)  │
                │  • Exit Time (shown)   │
                └───────────┬────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Click Continue  │
                   └────────┬────────┘
                            │
                ┌───────────▼────────────────┐
                │  🚀 SUBMISSION DIALOG      │
                │  ┌──────────────────────┐  │
                │  │ Review Times         │  │
                │  │ Entry: [time]        │  │
                │  │ Exit: [time]         │  │
                │  └──────────────────────┘  │
                │  ┌──────────────────────┐  │
                │  │ ⚠️  WARNING          │  │
                │  │ • Opens Google Form  │  │
                │  │ • No more entries    │  │
                │  │   until tomorrow     │  │
                │  │ • Todos remain       │  │
                │  └──────────────────────┘  │
                └────────┬──────────┬────────┘
                         │          │
                    Cancel│          │Yes, Submit
                         │          │
                         ▼          ▼
              ┌──────────────┐  ┌────────────────────┐
              │ Exit Time    │  │ Mark as Submitted  │
              │ Cleared      │  │ Open Google Form   │
              │ Can Re-mark  │  │ Status: Submitted! │
              └──────────────┘  └────────┬───────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Entry Button: OFF  │
                              │  Exit Button: OFF   │
                              │  Todos: VISIBLE     │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   END OF DAY        │
                              │   (Submitted)       │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │    NEXT DAY          │
                              │ Date Changed         │
                              │ Entry Button: ON     │
                              │ Start Fresh          │
                              └──────────────────────┘
```

## State Transitions

### Entry Button States
```
┌──────────────────┬──────────────────┬──────────────────────┐
│   Condition      │     Button       │     Alert Message    │
├──────────────────┼──────────────────┼──────────────────────┤
│ No entry today   │   ENABLED ✓      │   None               │
├──────────────────┼──────────────────┼──────────────────────┤
│ Entry exists     │   DISABLED ✗     │ "Already marked      │
│ (not submitted)  │                  │  entry. Mark exit    │
│                  │                  │  first."             │
├──────────────────┼──────────────────┼──────────────────────┤
│ Submitted today  │   DISABLED ✗     │ "Already submitted.  │
│                  │                  │  Try tomorrow."      │
└──────────────────┴──────────────────┴──────────────────────┘
```

### Exit Button States
```
┌──────────────────┬──────────────────┬──────────────────────┐
│   Condition      │     Button       │     Alert Message    │
├──────────────────┼──────────────────┼──────────────────────┤
│ No entry today   │   DISABLED ✗     │ "Please mark entry   │
│                  │                  │  first."             │
├──────────────────┼──────────────────┼──────────────────────┤
│ Entry exists,    │   ENABLED ✓      │   None               │
│ no exit          │                  │                      │
├──────────────────┼──────────────────┼──────────────────────┤
│ Exit marked      │   DISABLED ✗     │ "Already marked      │
│ (not submitted)  │                  │  exit."              │
├──────────────────┼──────────────────┼──────────────────────┤
│ Submitted today  │   DISABLED ✗     │   N/A                │
└──────────────────┴──────────────────┴──────────────────────┘
```

### Status Card Display
```
┌────────────────────┬────────────────────────────────────────┐
│   State            │   Display                              │
├────────────────────┼────────────────────────────────────────┤
│ No Entry           │ ⏰ Not Checked In                       │
│                    │ "You have not come to office today"   │
├────────────────────┼────────────────────────────────────────┤
│ Entry Only         │ ✓ Welcome!                             │
│                    │ "You came to office at [time]"        │
│                    │ + Exit Calculator                      │
├────────────────────┼────────────────────────────────────────┤
│ Entry + Exit       │ ✓ Welcome!                             │
│ (Not Submitted)    │ "You came to office at [time]"        │
│                    │ "Exit marked at: [time]"              │
│                    │ (No exit calculator)                   │
├────────────────────┼────────────────────────────────────────┤
│ Submitted          │ ✅ Submitted! (Green Background)        │
│                    │ "You submitted your entry/exit"       │
│                    │ Entry: [time]                         │
│                    │ Exit: [time]                          │
└────────────────────┴────────────────────────────────────────┘
```

## Dialog Flow Details

### 1. Entry Dialog
```
┌─────────────────────────────────────┐
│   Mark Entry Time                   │
├─────────────────────────────────────┤
│                                     │
│   [Use Current Time]                │
│                                     │
│         OR                          │
│                                     │
│   Custom Date & Time:               │
│   [datetime-local input]            │
│   [Use Custom Time]                 │
│                                     │
│              [Cancel]               │
└─────────────────────────────────────┘
```

### 2. Exit Dialog
```
┌─────────────────────────────────────┐
│   Mark Exit & Submit to Form        │
├─────────────────────────────────────┤
│   Entry Time: [readonly]            │
│   Exit Time: [readonly]             │
│   Company Name: [input]             │
│   Comments: [textarea]              │
│                                     │
│         [Cancel]  [Continue]        │
└─────────────────────────────────────┘
```

### 3. Submission Confirmation Dialog
```
┌──────────────────────────────────────────┐
│   🚀 Ready to Submit to Google Form?     │
├──────────────────────────────────────────┤
│   Your entry and exit times:             │
│   ┌────────────────────────────────┐     │
│   │ Entry Time: [time]             │     │
│   │ Exit Time: [time]              │     │
│   └────────────────────────────────┘     │
│                                          │
│   ⚠️  Important:                          │
│   • Opens Google Forms in new tab        │
│   • No more entries until tomorrow       │
│   • Todo list remains accessible         │
│                                          │
│   [Cancel]  [Yes, Submit to Form]        │
└──────────────────────────────────────────┘
```

## Local Storage Data Flow

```
Entry Marked:
{
  entryTime: "2025-11-22T09:30:00.000Z",
  date: "2025-11-22"
}

Exit Marked (Before Submission):
{
  entryTime: "2025-11-22T09:30:00.000Z",
  exitTime: "2025-11-22T18:00:00.000Z",
  date: "2025-11-22"
}

After Submission:
{
  entryTime: "2025-11-22T09:30:00.000Z",
  exitTime: "2025-11-22T18:00:00.000Z",
  date: "2025-11-22",
  isSubmitted: true  ← New flag
}

Next Day (2025-11-23):
• Existing record still in storage
• But date check fails
• Entry button enabled
• New entry will overwrite old data
```

## Key Validation Logic

```typescript
// Can mark entry?
!hasEnteredToday() && !isSubmittedToday()

// Can mark exit?
hasEnteredToday() && !hasExitedToday() && !isSubmittedToday()

// Show todos?
hasEnteredToday() // Even if exited or submitted

// Is submitted today?
log.date === today && log.isSubmitted === true

// Has entered today?
log.date === today && log.entryTime exists

// Has exited today?
log.date === today && log.exitTime exists
```

---

**Notes:**
- All times stored in ISO format (UTC)
- Display times in IST 12-hour format
- Date comparison uses YYYY-MM-DD format
- Todos persist independently from entry/exit log
