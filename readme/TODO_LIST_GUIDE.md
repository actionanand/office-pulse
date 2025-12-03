# Todo List Component - Complete Guide

## Overview

The Todo List component is a flexible, plug-and-play task management system with advanced scheduling capabilities. It supports one-time todos, daily tasks, and complex recurring patterns, all stored in local storage.

---

## Features

### 1. **Plug-In/Plug-Out Design**
- Toggle visibility from the Entry Logger component
- Setting persists in local storage
- Independent component that can be easily enabled/disabled

### 2. **Flexible Scheduling**
- **One Time**: Single occurrence on a specific date
- **Daily**: Every day from start date
- **Weekly**: Selected days of the week (e.g., every Monday and Thursday)
- **Biweekly**: Every 2 weeks on selected days
- **Monthly**: Specific day of each month (e.g., 15th of every month)
- **Yearly**: Specific date each year (e.g., January 1st)
- **Custom**: Specific days of the week without repetition

### 3. **Date Navigation**
- View todos for any date (today, future, or past)
- Navigate day-by-day with arrow buttons
- Quick "Today" button to return to current date
- Formatted date display (e.g., "Monday, December 3, 2025")

### 4. **Per-Date Completion Tracking**
- One-time todos: Single completion state
- Recurring todos: Track completion per date independently
- Complete today's task without affecting tomorrow's instance

### 5. **Local Storage Persistence**
- All todos saved in browser local storage
- Survives page refreshes and browser restarts
- New todos appear at the top (most recent first)

---

## Architecture

### Data Model

```typescript
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TodoItem {
  id: string;
  time: string; // HH:mm format
  description: string;
  completed: boolean; // For one-time todos
  createdAt: string; // ISO string format
  
  // Scheduling fields
  startDate: string; // YYYY-MM-DD format
  endDate?: string; // Optional end date for recurring todos
  recurrenceType: RecurrenceType;
  
  // For weekly/biweekly/custom recurrence
  daysOfWeek?: DayOfWeek[]; // e.g., ['monday', 'thursday']
  
  // For biweekly - which week offset (0 or 1)
  biweeklyOffset?: number; // 0 = this week, 1 = next week
  
  // For monthly/yearly
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12 (yearly only)
  
  // Track completion per date for recurring todos
  completedDates?: string[]; // Array of YYYY-MM-DD dates when completed
}
```

### Core Signals

```typescript
// All todos in storage
allTodos = signal<TodoItem[]>([]);

// Currently selected date for viewing
selectedDate = signal<string>(this.getTodayDateString());

// Dialog visibility
showAddForm = signal<boolean>(false);

// Form fields
newTodoTime = signal<string>('09:00');
newTodoDescription = signal<string>('');
newTodoStartDate = signal<string>(this.getTodayDateString());
newTodoEndDate = signal<string>('');
newTodoRecurrence = signal<RecurrenceType>('once');
newTodoDaysOfWeek = signal<DayOfWeek[]>([]);
newTodoBiweeklyOffset = signal<number>(0);
newTodoDayOfMonth = signal<number>(1);
newTodoMonthOfYear = signal<number>(1);
```

### Computed Properties

```typescript
// Filters todos to show only those applicable to selected date
todosForSelectedDate = computed(() => {
  const date = this.selectedDate();
  const allTodos = this.allTodos();
  return this.getTodosForDate(allTodos, date);
});
```

---

## How It Works

### 1. Todo Filtering Logic

The `shouldShowTodoOnDate()` method determines if a todo should appear on a given date:

```typescript
private shouldShowTodoOnDate(todo: TodoItem, dateStr: string): boolean {
  const targetDate = new Date(dateStr);
  const startDate = new Date(todo.startDate);
  
  // Check if target date is before start date
  if (targetDate < startDate) return false;

  // Check if target date is after end date (if set)
  if (todo.endDate) {
    const endDate = new Date(todo.endDate);
    if (targetDate > endDate) return false;
  }

  // Check recurrence pattern
  switch (todo.recurrenceType) {
    case 'once':
      return dateStr === todo.startDate;
    
    case 'daily':
      return true;
    
    case 'weekly':
      return matchesWeeklyPattern(targetDate, todo.daysOfWeek);
    
    case 'biweekly':
      return matchesBiweeklyPattern(targetDate, startDate, todo.daysOfWeek, todo.biweeklyOffset);
    
    case 'monthly':
      return targetDate.getDate() === todo.dayOfMonth;
    
    case 'yearly':
      return targetDate.getMonth() + 1 === todo.monthOfYear && 
             targetDate.getDate() === todo.dayOfMonth;
    
    case 'custom':
      return matchesWeeklyPattern(targetDate, todo.daysOfWeek);
    
    default:
      return false;
  }
}
```

### 2. Weekly Pattern Matching

```typescript
private matchesWeeklyPattern(date: Date, daysOfWeek: DayOfWeek[]): boolean {
  if (daysOfWeek.length === 0) return false;
  
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  return daysOfWeek.includes(dayName);
}
```

### 3. Biweekly Pattern Matching

```typescript
private matchesBiweeklyPattern(
  targetDate: Date, 
  startDate: Date, 
  daysOfWeek: DayOfWeek[], 
  offset: number
): boolean {
  // Calculate week difference
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / msPerWeek);
  
  // Check if this week matches the offset pattern
  if (weekDiff % 2 !== offset) return false;
  
  return matchesWeeklyPattern(targetDate, daysOfWeek);
}
```

### 4. Completion Tracking

```typescript
// Check if todo is completed on a specific date
isTodoCompletedOnDate(todo: TodoItem, dateStr: string): boolean {
  if (todo.recurrenceType === 'once') {
    // One-time todos use the completed flag
    return todo.completed;
  } else {
    // Recurring todos check the completedDates array
    return (todo.completedDates || []).includes(dateStr);
  }
}

// Toggle todo completion
toggleTodo(todo: TodoItem): void {
  const dateStr = this.selectedDate();
  const todos = this.allTodos();
  
  const updatedTodos = todos.map(t => {
    if (t.id !== todo.id) return t;
    
    if (t.recurrenceType === 'once') {
      // Toggle the completed flag
      return { ...t, completed: !t.completed };
    } else {
      // Add/remove from completedDates array
      const completedDates = t.completedDates || [];
      const isCompleted = completedDates.includes(dateStr);
      
      return {
        ...t,
        completedDates: isCompleted
          ? completedDates.filter(d => d !== dateStr)
          : [...completedDates, dateStr]
      };
    }
  });
  
  this.allTodos.set(updatedTodos);
  this.storageService.saveTodoItems(updatedTodos);
}
```

---

## Usage Examples

### Example 1: Daily Standup Meeting
```typescript
{
  description: "Team standup meeting",
  time: "10:00",
  startDate: "2025-12-01",
  recurrenceType: "daily"
  // Appears every day at 10:00 AM from December 1st onwards
}
```

### Example 2: Weekly Report (Every Friday)
```typescript
{
  description: "Submit weekly report",
  time: "17:00",
  startDate: "2025-12-01",
  endDate: "2026-03-31", // Ends after Q1
  recurrenceType: "weekly",
  daysOfWeek: ["friday"]
  // Appears every Friday at 5:00 PM until March 31, 2026
}
```

### Example 3: Biweekly Team Sync (Every 2 Weeks on Monday)
```typescript
{
  description: "Team sync meeting",
  time: "14:00",
  startDate: "2025-12-02", // Starting Monday
  recurrenceType: "biweekly",
  daysOfWeek: ["monday"],
  biweeklyOffset: 0 // This week pattern
  // Appears every other Monday at 2:00 PM
}
```

### Example 4: Monthly Salary Processing (15th of Each Month)
```typescript
{
  description: "Process payroll",
  time: "09:00",
  startDate: "2025-12-15",
  recurrenceType: "monthly",
  dayOfMonth: 15
  // Appears on the 15th of every month at 9:00 AM
}
```

### Example 5: Annual Performance Review (January 15)
```typescript
{
  description: "Annual performance review",
  time: "10:00",
  startDate: "2025-01-15",
  recurrenceType: "yearly",
  monthOfYear: 1,
  dayOfMonth: 15
  // Appears every January 15th at 10:00 AM
}
```

### Example 6: Custom Days (Monday and Thursday Only)
```typescript
{
  description: "Client calls",
  time: "15:00",
  startDate: "2025-12-01",
  endDate: "2025-12-31",
  recurrenceType: "custom",
  daysOfWeek: ["monday", "thursday"]
  // Appears only on Mondays and Thursdays in December at 3:00 PM
}
```

### Example 7: One-Time Task
```typescript
{
  description: "Prepare presentation for board meeting",
  time: "09:00",
  startDate: "2025-12-15",
  recurrenceType: "once"
  // Appears only on December 15, 2025
}
```

---

## Integration with Entry Logger

### Toggle Control

The Entry Logger component provides a toggle switch to show/hide the todo list:

```typescript
// In entry-logger.component.ts
showTodoList = signal<boolean>(true);

toggleTodoList(): void {
  const newValue = !this.showTodoList();
  this.showTodoList.set(newValue);
  const settings = this.storageService.getSettings();
  settings.showTodoList = newValue;
  this.storageService.saveSettings(settings);
}
```

```html
<!-- In entry-logger.component.html -->
@if (canShowTodos()) {
  <div class="todo-toggle-section">
    <div class="toggle-container">
      <span class="toggle-label">Show Todo List</span>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          [checked]="showTodoList()"
          (change)="toggleTodoList()"
        />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  @if (showTodoList()) {
    <app-todo-list />
  }
}
```

### Settings Storage

```typescript
export interface AppSettings {
  defaultWorkHours: number;
  exitCalculatorTime: string;
  showTodoList: boolean; // Toggle state persists
}
```

---

## User Interface

### Main View
- **Header**: Shows "📋 Tasks" title
- **Date Navigation**: 
  - Left arrow: Previous day
  - Date display: Current viewing date in full format
  - "Today" button: Quick return (only shown when not on today)
  - Right arrow: Next day
- **Action Buttons**:
  - "+ Add Todo": Opens creation dialog
  - "Clear All": Resets to default todos

### Todo Item Display
- **Checkbox**: Mark as complete/incomplete
- **Time**: Editable time picker
- **Description**: Task text
- **Recurrence Badge**: Shows pattern (🔄 Daily, 🔄 Weekly, etc.)
- **Delete Button**: Remove todo (🗑️)

### Add Todo Dialog
1. **Basic Info**:
   - Description (text input)
   - Time (time picker)
   - Start Date (date picker)

2. **Recurrence Type** (dropdown):
   - One Time
   - Daily
   - Weekly
   - Every 2 Weeks
   - Monthly
   - Yearly
   - Custom Days

3. **Pattern-Specific Fields**:
   - **Weekly/Biweekly/Custom**: Day selector buttons (MON, TUE, WED, THU, FRI, SAT, SUN)
   - **Biweekly**: Starting week selector (This Week / Next Week)
   - **Monthly/Yearly**: Day of month (1-31)
   - **Yearly**: Month selector (January - December)

4. **End Date** (optional for recurring todos):
   - Leave empty for no end date
   - Set specific end date to limit recurrence

---

## Mobile Responsiveness

The todo component is fully responsive:

- **Date Navigation**: Stacks vertically on small screens
- **Todo Items**: Wrap elements on narrow displays
- **Day Selector**: Buttons adjust size and spacing
- **Dialog**: Scales to 95% width on mobile
- **Form Fields**: Stack in single column on small screens

---

## Storage & Persistence

### Local Storage Key
```typescript
private readonly TODO_ITEMS_KEY = 'office_todo_items';
```

### Default Todos
When storage is empty or cleared, these default todos are created:
```typescript
[
  { description: "Send morning emails", time: "09:00", recurrenceType: "daily" },
  { description: "Team standup meeting", time: "10:00", recurrenceType: "daily" },
  { description: "Review pending tasks", time: "14:00", recurrenceType: "daily" },
  { description: "End of day summary", time: "17:00", recurrenceType: "daily" }
]
```

### Save/Load Operations
```typescript
// Load todos
const todos = storageService.getTodoItems(); // Returns TodoItem[]

// Save todos
storageService.saveTodoItems(updatedTodos);

// Clear and restore defaults
storageService.clearTodoItems();
```

---

## Best Practices

### 1. Scheduling Guidelines
- **One Time**: Use for specific events or deadlines
- **Daily**: Use for routine tasks (email checks, standups)
- **Weekly**: Use for regular meetings on specific days
- **Biweekly**: Use for alternating week patterns
- **Monthly**: Use for monthly reports, billing cycles
- **Yearly**: Use for anniversaries, annual reviews
- **Custom**: Use for irregular but specific day patterns

### 2. Time Management
- Set realistic times for tasks
- Use 24-hour format internally (HH:mm)
- Times are sorted automatically
- Edit times directly from the list

### 3. Completion Tracking
- Mark tasks complete as you finish them
- Recurring tasks reset each day
- One-time tasks stay completed
- Completion data persists in local storage

### 4. End Dates
- Use end dates for temporary recurring tasks
- Leave empty for indefinite recurrence
- End date is inclusive (task appears on end date)

---

## Summary

The Todo List component is a powerful, flexible task management system that:

1. **Plugs In/Out**: Toggle visibility from Entry Logger
2. **Flexible Scheduling**: Supports 7 different recurrence patterns
3. **Date-Aware**: View and manage todos for any date
4. **Smart Completion**: Track completion per date for recurring tasks
5. **Local Storage**: All data persists in browser
6. **Mobile-Ready**: Fully responsive design
7. **User-Friendly**: Intuitive UI with clear visual indicators

Perfect for managing daily routines, recurring meetings, monthly reports, and one-time tasks all in one place!
