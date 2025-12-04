# Google Sheets Todo Setup Guide

## Overview

This guide helps you create a Google Sheet to manage todo items that can be imported into the Office Pulse application. The sheet structure supports all recurrence patterns including one-time, daily, weekly, biweekly, monthly, yearly, and custom days.

---

## Google Sheets Column Structure

### Required Columns

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| **id** | Text | Unique identifier (auto-generate or use timestamp) | `1733241600000-abc123` |
| **time** | Time (HH:mm) | Time of day for the todo | `09:00` |
| **description** | Text | Todo description | `Send morning emails` |
| **completed** | Boolean | Completion status (TRUE/FALSE) | `FALSE` |
| **createdAt** | ISO DateTime | Creation timestamp | `2025-12-03T09:00:00.000Z` |
| **isDefaultTodo** | Boolean | Whether it's a default todo (TRUE/FALSE) | `TRUE` |
| **startDate** | Date (YYYY-MM-DD) | When the todo starts | `2025-12-01` |
| **recurrenceType** | Text | Type of recurrence | `daily` |

### Optional Columns (Based on Recurrence Type)

| Column Name | Data Type | Description | Used For | Example |
|-------------|-----------|-------------|----------|---------|
| **endDate** | Date (YYYY-MM-DD) | When recurring todo ends | All recurring types | `2025-12-31` |
| **daysOfWeek** | Text (comma-separated) | Days when todo occurs | weekly, biweekly, custom | `monday,thursday` |
| **biweeklyOffset** | Number (0 or 1) | Which week in biweekly cycle | biweekly | `0` |
| **dayOfMonth** | Number (1-31) | Day of month | monthly, yearly | `15` |
| **monthOfYear** | Number (1-12) | Month of year | yearly | `1` |
| **completedDates** | Text (comma-separated) | Dates when completed | recurring types | `2025-12-01,2025-12-02` |

---

## Recurrence Type Values

| Value | Description |
|-------|-------------|
| `once` | One-time todo on a specific date |
| `daily` | Every day from start date |
| `weekly` | Specific days of the week |
| `biweekly` | Every 2 weeks on specific days |
| `monthly` | Specific day of each month |
| `yearly` | Specific date each year |
| `custom` | Custom days (like weekly but without repetition pattern) |

---

## Days of Week Format

When specifying days in the `daysOfWeek` column, use lowercase and comma-separated:

```
monday,tuesday,wednesday,thursday,friday,saturday,sunday
```

**Examples:**
- Monday and Thursday: `monday,thursday`
- Weekdays only: `monday,tuesday,wednesday,thursday,friday`
- Weekends: `saturday,sunday`

---

## Example Data Rows

### 1. Daily Todo
```
id: 1733241600000-daily1
time: 09:00
description: Send morning emails
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-12-01
recurrenceType: daily
endDate: [blank]
daysOfWeek: [blank]
biweeklyOffset: [blank]
dayOfMonth: [blank]
monthOfYear: [blank]
completedDates: [blank]
```

### 2. Weekly Todo (Specific Days)
```
id: 1733241600000-weekly1
time: 11:30
description: Team sync meeting
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-12-01
recurrenceType: weekly
endDate: [blank]
daysOfWeek: monday,thursday
biweeklyOffset: [blank]
dayOfMonth: [blank]
monthOfYear: [blank]
completedDates: [blank]
```

### 3. Biweekly Todo
```
id: 1733241600000-biweekly1
time: 14:00
description: Sprint planning meeting
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-12-02
recurrenceType: biweekly
endDate: 2026-06-30
daysOfWeek: monday
biweeklyOffset: 0
dayOfMonth: [blank]
monthOfYear: [blank]
completedDates: [blank]
```

### 4. Monthly Todo
```
id: 1733241600000-monthly1
time: 09:00
description: Monthly report submission
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-12-01
recurrenceType: monthly
endDate: [blank]
daysOfWeek: [blank]
biweeklyOffset: [blank]
dayOfMonth: 15
monthOfYear: [blank]
completedDates: [blank]
```

### 5. Yearly Todo
```
id: 1733241600000-yearly1
time: 10:00
description: Annual performance review
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-01-15
recurrenceType: yearly
endDate: [blank]
daysOfWeek: [blank]
biweeklyOffset: [blank]
dayOfMonth: 15
monthOfYear: 1
completedDates: [blank]
```

### 6. Custom Days Todo
```
id: 1733241600000-custom1
time: 15:00
description: Client calls
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: TRUE
startDate: 2025-12-01
recurrenceType: custom
endDate: 2025-12-31
daysOfWeek: tuesday,friday
biweeklyOffset: [blank]
dayOfMonth: [blank]
monthOfYear: [blank]
completedDates: [blank]
```

### 7. One-Time Todo
```
id: 1733241600000-once1
time: 16:00
description: Prepare presentation for board meeting
completed: FALSE
createdAt: 2025-12-03T09:00:00.000Z
isDefaultTodo: FALSE
startDate: 2025-12-15
recurrenceType: once
endDate: [blank]
daysOfWeek: [blank]
biweeklyOffset: [blank]
dayOfMonth: [blank]
monthOfYear: [blank]
completedDates: [blank]
```

---

## Complete Example Sheet Template

| id | time | description | completed | createdAt | isDefaultTodo | startDate | recurrenceType | endDate | daysOfWeek | biweeklyOffset | dayOfMonth | monthOfYear | completedDates |
|----|------|-------------|-----------|-----------|---------------|-----------|----------------|---------|------------|----------------|------------|-------------|----------------|
| 1733241600000-1 | 09:00 | Send morning emails | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600000-2 | 10:00 | Team standup meeting | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600000-3 | 11:30 | Team sync (Mon & Thu) | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | monday,thursday | | | | |
| 1733241600000-4 | 14:00 | Review pending tasks | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600000-5 | 15:00 | Client calls (Tue & Fri) | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | custom | 2025-12-31 | tuesday,friday | | | | |
| 1733241600000-6 | 15:30 | Sprint planning | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-02 | biweekly | 2026-06-30 | monday | 0 | | | |
| 1733241600000-7 | 09:00 | Monthly payroll | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | monthly | | | | 25 | | |
| 1733241600000-8 | 10:00 | Annual review | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-01-15 | yearly | | | | 15 | 1 | |
| 1733241600000-9 | 17:00 | End of day summary | FALSE | 2025-12-03T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |

---

## Ready-to-Use Google Sheets Data

### Copy-Paste Ready Table (20 Practical Examples)

Copy the table below directly into your Google Sheet (starting from row 2, after headers):

| id | time | description | completed | createdAt | isDefaultTodo | startDate | recurrenceType | endDate | daysOfWeek | biweeklyOffset | dayOfMonth | monthOfYear | completedDates |
|----|------|-------------|-----------|-----------|---------------|-----------|----------------|---------|------------|----------------|------------|-------------|----------------|
| 1733241600001 | 09:00 | Check and respond to emails | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600002 | 09:30 | Review calendar for the day | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600003 | 10:00 | Team standup meeting | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600004 | 10:30 | Sprint planning (Mon) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-02 | weekly | | monday | | | | |
| 1733241600005 | 11:00 | One-on-one with manager (Thu) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | thursday | | | | |
| 1733241600006 | 11:30 | Team sync (Mon & Thu) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | custom | | monday,thursday | | | | |
| 1733241600007 | 12:00 | Lunch break reminder | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600008 | 13:00 | Review pull requests | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600009 | 14:00 | Client calls (Tue & Fri) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | custom | | tuesday,friday | | | | |
| 1733241600010 | 14:30 | Sprint retrospective (Fri) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | friday | | | | |
| 1733241600011 | 15:00 | Code review session (Mon/Wed/Fri) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | custom | | monday,wednesday,friday | | | | |
| 1733241600012 | 15:30 | Team all-hands (Every 2 weeks) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-02 | biweekly | 2026-12-31 | monday | 0 | | | |
| 1733241600013 | 16:00 | Update project documentation | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | friday | | | | |
| 1733241600014 | 16:30 | Weekly report submission | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | friday | | | | |
| 1733241600015 | 17:00 | End of day summary | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600016 | 09:00 | Monthly expense report | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | monthly | | | | 25 | | |
| 1733241600017 | 10:00 | Monthly team meeting | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | monthly | | | | 1 | | |
| 1733241600018 | 11:00 | Quarterly goals review | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-01-15 | yearly | | | | 15 | 1 | |
| 1733241600019 | 14:00 | Birthday party setup | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-20 | once | | | | | | |
| 1733241600020 | 16:00 | Prepare year-end presentation | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-28 | once | | | | | | |

### Simplified Version (10 Most Common Todos)

If you want to start with fewer examples:

| id | time | description | completed | createdAt | isDefaultTodo | startDate | recurrenceType | endDate | daysOfWeek | biweeklyOffset | dayOfMonth | monthOfYear | completedDates |
|----|------|-------------|-----------|-----------|---------------|-----------|----------------|---------|------------|----------------|------------|-------------|----------------|
| 1733241600001 | 09:00 | Check emails | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600002 | 10:00 | Team standup | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600003 | 11:00 | Manager 1-on-1 (Thu) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | thursday | | | | |
| 1733241600004 | 14:00 | Client calls (Tue/Fri) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | custom | | tuesday,friday | | | | |
| 1733241600005 | 15:00 | Sprint planning (alternate Mon) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-02 | biweekly | | monday | 0 | | | |
| 1733241600006 | 16:00 | Weekly report (Fri) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | weekly | | friday | | | | |
| 1733241600007 | 17:00 | End of day summary | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | daily | | | | | | |
| 1733241600008 | 09:00 | Monthly expense report (25th) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-12-01 | monthly | | | | 25 | | |
| 1733241600009 | 10:00 | Annual review (Jan 15) | FALSE | 2025-12-04T09:00:00.000Z | TRUE | 2025-01-15 | yearly | | | | 15 | 1 | |
| 1733241600010 | 14:00 | Project deadline | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-31 | once | | | | | | |

### Quick Test Data (5 Items for Testing)

For quick testing of all recurrence types:

| id | time | description | completed | createdAt | isDefaultTodo | startDate | recurrenceType | endDate | daysOfWeek | biweeklyOffset | dayOfMonth | monthOfYear | completedDates |
|----|------|-------------|-----------|-----------|---------------|-----------|----------------|---------|------------|----------------|------------|-------------|----------------|
| TEST001 | 09:00 | Daily task test | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-04 | daily | 2025-12-10 | | | | | |
| TEST002 | 10:00 | Weekly Monday test | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-02 | weekly | | monday | | | | |
| TEST003 | 11:00 | Custom Tue/Thu test | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-03 | custom | | tuesday,thursday | | | | |
| TEST004 | 14:00 | Monthly 15th test | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-01 | monthly | | | | 15 | | |
| TEST005 | 15:00 | One-time test | FALSE | 2025-12-04T09:00:00.000Z | FALSE | 2025-12-05 | once | | | | | | |

---

## Google Sheets Setup Steps

### 1. Create New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Name it: `Office Pulse - Todo Items`

### 2. Set Up Headers
In Row 1, create these column headers (in order):
```
id | time | description | completed | createdAt | isDefaultTodo | startDate | recurrenceType | endDate | daysOfWeek | biweeklyOffset | dayOfMonth | monthOfYear | completedDates
```

### 3. Format Columns
- **time**: Format > Number > Custom number format > `HH:mm`
- **completed**: Format as checkbox (Insert > Checkbox)
- **isDefaultTodo**: Format as checkbox (Insert > Checkbox)
- **startDate/endDate**: Format > Number > Date > `YYYY-MM-DD`
- **createdAt**: Format > Number > Date time
- **Numbers**: biweeklyOffset, dayOfMonth, monthOfYear as plain numbers

### 4. Add Data Validation
**For recurrenceType column:**
- Select the entire column (except header)
- Data > Data validation
- Criteria: List of items
- Add: `once,daily,weekly,biweekly,monthly,yearly,custom`

**For daysOfWeek column:**
- Add note/comment with valid values: `monday,tuesday,wednesday,thursday,friday,saturday,sunday`

### 5. Auto-Generate ID Formula (Fixed for Dragging)
In cell **A2**, use this ARRAYFORMULA to auto-generate IDs for first 100 rows:
```
=ARRAYFORMULA(IF(LEN(C2:C101), TEXT(ROW(C2:C101),"00000000000000") & "-" & TEXT(RANDBETWEEN(1,999999),"000000"), ""))
```

**Alternative (Manual Static IDs):** If you prefer static IDs that never change:
```
=ARRAYFORMULA(IF(LEN(C2:C101), "TD-" & TEXT(ROW(C2:C101),"0000"), ""))
```
This creates IDs like: TD-0002, TD-0003, TD-0004, etc.

### 6. Auto-Generate createdAt Formula (Fixed for Dragging)
In cell **E2**, use this ARRAYFORMULA to auto-generate timestamps for first 100 rows:
```
=ARRAYFORMULA(IF(LEN(C2:C101), TEXT(TODAY(),"YYYY-MM-DD") & "T09:00:00.000Z", ""))
```

**For current timestamp:** If you want exact current time (but it will update):
```
=ARRAYFORMULA(IF(LEN(C2:C101), TEXT(NOW(),"YYYY-MM-DD") & "T" & TEXT(NOW(),"HH:mm:ss") & ".000Z", ""))
```

**Best Practice:** Use static date and manually set createdAt to avoid changes:
```
="2025-12-04T09:00:00.000Z"
```

### 7. Set Default Values
- Set `completed` to FALSE (uncheck)
- Set `isDefaultTodo` to TRUE (check) for default todos
- Set `startDate` to today or desired start date

### 8. Prevent Formula Recalculation (Important!)

**Problem:** Formulas with `NOW()` or `RANDBETWEEN()` recalculate on every edit, changing IDs and timestamps.

**Solution 1 - Convert to Values (Recommended):**
1. After generating IDs and timestamps with formulas
2. Select columns A (id) and E (createdAt)
3. Copy (Ctrl+C)
4. Right-click > Paste special > **Paste values only**
5. This converts formulas to static text

**Solution 2 - Use Row-Based Static IDs:**
Put this in A2 and it auto-fills down:
```
=ARRAYFORMULA(IF(LEN(C2:C101), "TD-" & TEXT(ROW(C2:C101),"0000"), ""))
```
Put this in E2:
```
=ARRAYFORMULA(IF(LEN(C2:C101), "2025-12-04T09:00:00.000Z", ""))
```

**Solution 3 - Manual Entry:**
Simply type static values:
- id: `1733241600001`, `1733241600002`, etc.
- createdAt: `2025-12-04T09:00:00.000Z` (same for all)

---

## Export/Import Instructions

### Export from Google Sheets
1. File > Download > Comma-separated values (.csv)
2. Save as `todos.csv`

### Manual Import to App
The app currently uses local storage. To import from Google Sheets, you'll need to:

1. Export the sheet as CSV
2. Parse the CSV data
3. Convert to TodoItem[] format
4. Call `storageService.saveTodoItems(items)`

### Sample Import Code (Future Feature)
```typescript
async importTodosFromCSV(csvData: string): Promise<void> {
  const rows = csvData.split('\n').slice(1); // Skip header
  const todos: TodoItem[] = rows.map(row => {
    const cols = row.split(',');
    return {
      id: cols[0],
      time: cols[1],
      description: cols[2],
      completed: cols[3] === 'TRUE',
      createdAt: cols[4],
      isDefaultTodo: cols[5] === 'TRUE',
      startDate: cols[6],
      recurrenceType: cols[7] as RecurrenceType,
      endDate: cols[8] || undefined,
      daysOfWeek: cols[9] ? cols[9].split(',') as DayOfWeek[] : undefined,
      biweeklyOffset: cols[10] ? parseInt(cols[10]) : undefined,
      dayOfMonth: cols[11] ? parseInt(cols[11]) : undefined,
      monthOfYear: cols[12] ? parseInt(cols[12]) : undefined,
      completedDates: cols[13] ? cols[13].split(',') : []
    };
  });
  
  this.storageService.saveTodoItems(todos);
}
```

---

## Tips & Best Practices

1. **ID Generation**: Use timestamp + random string for uniqueness
2. **Time Format**: Always use 24-hour format (HH:mm)
3. **Date Format**: Always use YYYY-MM-DD for consistency
4. **Boolean Values**: Use TRUE/FALSE (uppercase) in sheets
5. **Empty Cells**: Leave blank for optional fields
6. **Days of Week**: Always lowercase, comma-separated, no spaces
7. **Validation**: Use data validation to prevent errors
8. **Backup**: Keep a backup copy of your sheet
9. **Testing**: Test each recurrence type thoroughly
10. **Default Todos**: Set `isDefaultTodo` to TRUE for app defaults

---

## Common Recurrence Patterns

### Weekdays Only
```
recurrenceType: weekly
daysOfWeek: monday,tuesday,wednesday,thursday,friday
```

### Every Other Week (Biweekly)
```
recurrenceType: biweekly
daysOfWeek: friday
biweeklyOffset: 0
startDate: 2025-12-02 (a Monday)
```

### First Day of Month
```
recurrenceType: monthly
dayOfMonth: 1
```

### Last Working Day (Use Custom)
Calculate manually and use `once` for each month, or create custom logic.

### Quarterly (Every 3 Months)
Use multiple `monthly` entries for months 1, 4, 7, 10 with same dayOfMonth.

---

## Troubleshooting

### Issue: Biweekly todos not appearing on expected dates
**Solution**: Ensure `startDate` is on the correct week and `biweeklyOffset` matches (0 = this week, 1 = next week)

### Issue: Days of week not working
**Solution**: Check spelling (must be lowercase), ensure comma-separated with no spaces

### Issue: Monthly todo skips some months
**Solution**: If `dayOfMonth` is 31 and month has only 30 days, it won't appear. Use day 1-28 for reliability.

### Issue: Yearly todo not appearing
**Solution**: Verify both `dayOfMonth` and `monthOfYear` are set correctly (month 1-12)

---

## Summary

This Google Sheets setup provides a robust way to manage and backup your todo items externally. The structure supports all recurrence patterns and can be easily exported/imported as needed. Keep your sheet organized, use data validation, and follow the naming conventions for best results!
