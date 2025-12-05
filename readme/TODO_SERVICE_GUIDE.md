# Todo Service - Google Sheets Integration Guide

## Overview

The `TodoService` is a dedicated service for managing todo items with Google Sheets integration. It handles local storage, fetching data from Google Sheets, and merging todos.

---

## Service Location

**File:** `/src/app/services/todo.service.ts`

---

## Features

### 1. **Local Storage Management**
- `getTodoItems()` - Get all todos from local storage
- `saveTodoItems(items)` - Save todos to local storage
- `clearTodoItems()` - Clear and reset to default todos
- `getDefaultTodos()` - Get default todo items

### 2. **Google Sheets Integration**
- `fetchTodosFromGoogleSheets()` - Fetch todos from Google Sheets
- `mergeTodosWithLocal(sheetTodos)` - Merge sheet data with user-created todos
- `replaceTodosWithSheet(sheetTodos)` - Replace all todos with sheet data
- `syncTodosFromSheet()` - Sync todos from sheet (fetch + merge)

### 3. **Utility Methods**
- `generateId()` - Generate unique todo ID

---

## Usage Examples

### Basic Usage in Component

```typescript
import { TodoService } from '../../services/todo.service';

export class TodoListComponent {
  private todoService = new TodoService();

  loadTodos(): void {
    const todos = this.todoService.getTodoItems();
    this.allTodos.set(todos);
  }

  saveTodos(todos: TodoItem[]): void {
    this.todoService.saveTodoItems(todos);
  }
}
```

### Fetching from Google Sheets

```typescript
fetchFromSheet(): void {
  this.todoService.fetchTodosFromGoogleSheets().subscribe({
    next: (todos) => {
      console.log('Fetched todos:', todos);
      this.allTodos.set(todos);
    },
    error: (error) => {
      console.error('Error fetching todos:', error);
      alert('Failed to fetch todos from Google Sheets');
    }
  });
}
```

### Syncing with Google Sheets

```typescript
syncTodos(): void {
  this.todoService.syncTodosFromSheet().subscribe({
    next: (todos) => {
      console.log('Synced todos:', todos);
      this.allTodos.set(todos);
      alert('Todos synced successfully!');
    },
    error: (error) => {
      console.error('Sync error:', error);
      alert('Failed to sync todos');
    }
  });
}
```

### Merge Strategy

```typescript
// Option 1: Merge (keeps user-created todos)
this.todoService.fetchTodosFromGoogleSheets().subscribe({
  next: (sheetTodos) => {
    this.todoService.mergeTodosWithLocal(sheetTodos);
    this.loadTodos(); // Reload merged data
  }
});

// Option 2: Replace (overwrites everything)
this.todoService.fetchTodosFromGoogleSheets().subscribe({
  next: (sheetTodos) => {
    this.todoService.replaceTodosWithSheet(sheetTodos);
    this.loadTodos(); // Reload replaced data
  }
});
```

---

## Configuration

### Environment Variables

Set these in `environment.ts` and `environment.development.ts`:

```typescript
export const environment = {
  GOOGLE_SHEET_ID: '1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs',
  TODO_SHEET_GID: 1, // Second tab (0-indexed)
};
```

### Google Sheets Setup

1. Create a Google Sheet with todo data
2. Make it **publicly accessible** (Anyone with link can view)
3. Get the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
4. Get the Tab GID from URL: `#gid=[GID]`
5. Update environment files

---

## Google Sheets URL Format

The service fetches data from:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv&gid=[TODO_SHEET_GID]
```

**Example:**
```
https://docs.google.com/spreadsheets/d/1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs/export?format=csv&gid=1
```

---

## CSV Parsing

The service parses CSV data with these columns (in order):

| Index | Column | Type | Required |
|-------|--------|------|----------|
| 0 | id | string | Yes |
| 1 | time | string (HH:mm) | Yes |
| 2 | description | string | Yes |
| 3 | completed | boolean | Yes |
| 4 | createdAt | ISO datetime | Yes |
| 5 | isDefaultTodo | boolean | Yes |
| 6 | startDate | date (YYYY-MM-DD) | Yes |
| 7 | recurrenceType | string | Yes |
| 8 | endDate | date | No |
| 9 | daysOfWeek | comma-separated | No |
| 10 | biweeklyOffset | number | No |
| 11 | dayOfMonth | number | No |
| 12 | monthOfYear | number | No |
| 13 | completedDates | comma-separated | No |

---

## Merge Logic

### How `mergeTodosWithLocal()` Works:

1. Load existing todos from local storage
2. Filter out user-created todos (`isDefaultTodo: false`)
3. Combine sheet todos (defaults) with user-created todos
4. Remove duplicates based on ID
5. Save merged result to local storage

**Result:**
- Sheet todos (default todos) are updated
- User-created todos are preserved
- No duplicates

### Example:

**Local Storage:**
```typescript
[
  { id: 'TD-0001', description: 'Old default todo', isDefaultTodo: true },
  { id: 'USER-001', description: 'My custom todo', isDefaultTodo: false }
]
```

**Google Sheet:**
```typescript
[
  { id: 'TD-0001', description: 'Updated default todo', isDefaultTodo: true },
  { id: 'TD-0002', description: 'New default todo', isDefaultTodo: true }
]
```

**After Merge:**
```typescript
[
  { id: 'TD-0001', description: 'Updated default todo', isDefaultTodo: true },
  { id: 'TD-0002', description: 'New default todo', isDefaultTodo: true },
  { id: 'USER-001', description: 'My custom todo', isDefaultTodo: false }
]
```

---

## Adding Sync Button to UI

### In Component TypeScript:

```typescript
export class TodoListComponent {
  isSyncing = signal<boolean>(false);

  syncWithGoogleSheets(): void {
    this.isSyncing.set(true);
    
    this.todoService.syncTodosFromSheet().subscribe({
      next: (todos) => {
        this.allTodos.set(todos);
        this.isSyncing.set(false);
        alert('✅ Todos synced successfully!');
      },
      error: (error) => {
        console.error('Sync error:', error);
        this.isSyncing.set(false);
        alert('❌ Failed to sync todos. Check console for details.');
      }
    });
  }
}
```

### In Component HTML:

```html
<button 
  class="btn btn-sync" 
  (click)="syncWithGoogleSheets()"
  [disabled]="isSyncing()"
>
  @if (isSyncing()) {
    🔄 Syncing...
  } @else {
    📊 Sync from Google Sheets
  }
</button>
```

---

## Error Handling

### Common Errors:

**1. 403 Forbidden**
- **Cause:** Sheet is not publicly accessible
- **Fix:** Share sheet with "Anyone with link can view"

**2. 404 Not Found**
- **Cause:** Wrong SHEET_ID or GID
- **Fix:** Check URL and update environment variables

**3. CORS Error**
- **Cause:** Browser security (development only)
- **Fix:** Google Sheets export endpoint supports CORS by default

**4. Empty Data**
- **Cause:** Wrong GID or empty sheet
- **Fix:** Verify GID points to correct tab with data

### Example Error Handling:

```typescript
this.todoService.fetchTodosFromGoogleSheets().subscribe({
  next: (todos) => {
    if (todos.length === 0) {
      console.warn('No todos found in sheet');
      alert('⚠️ Sheet is empty or no valid data found');
    } else {
      console.log(`✅ Fetched ${todos.length} todos`);
      this.allTodos.set(todos);
    }
  },
  error: (error) => {
    console.error('Fetch error:', error);
    
    if (error.status === 403) {
      alert('❌ Access denied. Make sure sheet is publicly accessible.');
    } else if (error.status === 404) {
      alert('❌ Sheet not found. Check GOOGLE_SHEET_ID and TODO_SHEET_GID.');
    } else {
      alert(`❌ Error: ${error.message}`);
    }
  }
});
```

---

## Testing

### 1. Test Local Storage:

```typescript
// Get default todos
const todos = this.todoService.getDefaultTodos();
console.log('Default todos:', todos);

// Save to local storage
this.todoService.saveTodoItems(todos);

// Load from local storage
const loaded = this.todoService.getTodoItems();
console.log('Loaded todos:', loaded);
```

### 2. Test Google Sheets Fetch:

```typescript
this.todoService.fetchTodosFromGoogleSheets().subscribe({
  next: (todos) => console.log('Fetched:', todos),
  error: (error) => console.error('Error:', error)
});
```

### 3. Test Sync:

```typescript
this.todoService.syncTodosFromSheet().subscribe({
  next: (todos) => console.log('Synced todos:', todos),
  error: (error) => console.error('Sync error:', error)
});
```

---

## Best Practices

1. **Auto-sync on Init:** Load from Google Sheets when component initializes
2. **Manual Sync Button:** Let users refresh data manually
3. **Error Messages:** Show clear error messages to users
4. **Loading States:** Display loading indicator during sync
5. **Preserve User Data:** Use merge strategy to keep user-created todos
6. **Backup:** Export local storage data before replacing
7. **Validate Data:** Check sheet data format before importing

---

## Migration from StorageService

### Before (Old):
```typescript
import { StorageService } from '../../services/storage.service';

private storageService = new StorageService();

// Get todos
const todos = this.storageService.getTodoItems();

// Save todos
this.storageService.saveTodoItems(updatedTodos);

// Clear todos
this.storageService.clearTodoItems();
```

### After (New):
```typescript
import { TodoService } from '../../services/todo.service';

private todoService = new TodoService();

// Get todos
const todos = this.todoService.getTodoItems();

// Save todos
this.todoService.saveTodoItems(updatedTodos);

// Clear todos
this.todoService.clearTodoItems();

// NEW: Sync from Google Sheets
this.todoService.syncTodosFromSheet().subscribe();
```

---

## Summary

✅ **Created:** Dedicated `TodoService` for todo management  
✅ **Moved:** All todo-related logic from `StorageService`  
✅ **Added:** Google Sheets integration with CSV parsing  
✅ **Added:** Merge and replace strategies  
✅ **Updated:** `TodoListComponent` to use `TodoService`  
✅ **Configured:** Environment variables for Sheet ID and GID  

The service is ready to fetch and sync todos from Google Sheets!
