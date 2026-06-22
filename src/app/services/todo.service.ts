import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { TodoItem, DayOfWeek, RecurrenceType } from '../models/entry-log.model';
import { environment } from '../../environments/environment';
import { getISTDateString, getISTDateStringWithOffset } from '../utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private readonly TODO_ITEMS_KEY = 'office_todo_items';
  private readonly GOOGLE_SHEET_ID = environment.GOOGLE_SHEET_ID;
  private readonly TODO_SHEET_GID = environment.TODO_SHEET_GID;
  private http = inject(HttpClient);

  // Local Storage Methods
  getTodoItems(): TodoItem[] {
    const data = localStorage.getItem(this.TODO_ITEMS_KEY);
    const todos = data ? JSON.parse(data) : this.getDefaultTodos();
    
    // Update completion status based on recurrence
    return this.updateTodosForToday(todos);
  }

  saveTodoItems(items: TodoItem[]): void {
    // Clean up old completed dates to save space (keep only last 7 days)
    const cleanedItems = this.cleanupOldCompletedDates(items);
    localStorage.setItem(this.TODO_ITEMS_KEY, JSON.stringify(cleanedItems));
  }

  clearTodoItems(): void {
    localStorage.removeItem(this.TODO_ITEMS_KEY);
    // Restore default todos after clearing
    this.saveTodoItems(this.getDefaultTodos());
  }

  // Update todos to show correct completion status for today
  private updateTodosForToday(todos: TodoItem[]): TodoItem[] {
    const today = getISTDateString();
    
    return todos.map(todo => {
      // For once-only todos, completion is permanent
      if (todo.recurrenceType === 'once') {
        return todo;
      }
      
      // For recurring todos, check if it should show today
      const shouldShow = this.shouldShowToday(todo, today);
      
      if (!shouldShow) {
        // Todo doesn't occur today, skip it (could filter out later if needed)
        return { ...todo, completed: false };
      }
      
      // Check if completed today
      const completedToday = todo.completedDates?.includes(today) || false;
      
      return {
        ...todo,
        completed: completedToday
      };
    }).filter(todo => {
      // Filter out todos that don't occur today (optional - keep all for now)
      if (todo.recurrenceType === 'once') return true;
      return this.shouldShowToday(todo, today);
    });
  }

  // Check if a todo should appear today based on its recurrence pattern
  private shouldShowToday(todo: TodoItem, today: string): boolean {
    const todayDate = new Date(today);
    const startDate = new Date(todo.startDate);
    
    // Check if today is before start date
    if (todayDate < startDate) return false;
    
    // Check if today is after end date
    if (todo.endDate) {
      const endDate = new Date(todo.endDate);
      if (todayDate > endDate) return false;
    }
    
    switch (todo.recurrenceType) {
      case 'once':
        return today === todo.startDate;
        
      case 'daily':
        return true; // Show every day
        
      case 'weekly':
        if (!todo.daysOfWeek || todo.daysOfWeek.length === 0) return true;
        return this.isDayOfWeek(todayDate, todo.daysOfWeek);
        
      case 'biweekly': {
        if (!todo.daysOfWeek || todo.daysOfWeek.length === 0) return false;
        const weeksSinceStart = Math.floor((todayDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const isCorrectWeek = weeksSinceStart % 2 === (todo.biweeklyOffset || 0);
        return isCorrectWeek && this.isDayOfWeek(todayDate, todo.daysOfWeek);
      }
        
      case 'monthly':
        if (!todo.dayOfMonth) return false;
        return todayDate.getDate() === todo.dayOfMonth;
        
      case 'yearly':
        if (!todo.monthOfYear || !todo.dayOfMonth) return false;
        return todayDate.getMonth() + 1 === todo.monthOfYear && todayDate.getDate() === todo.dayOfMonth;
        
      case 'custom':
        if (!todo.daysOfWeek || todo.daysOfWeek.length === 0) return false;
        return this.isDayOfWeek(todayDate, todo.daysOfWeek);
        
      default:
        return false;
    }
  }

  // Check if date matches any of the specified days of week
  private isDayOfWeek(date: Date, daysOfWeek: DayOfWeek[]): boolean {
    const dayMap: { [key: number]: DayOfWeek } = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    
    const dayName = dayMap[date.getDay()];
    return daysOfWeek.includes(dayName);
  }

  // Clean up old completed dates to save localStorage space
  // Remove completed dates older than 7 days - no need to maintain past history
  private cleanupOldCompletedDates(todos: TodoItem[]): TodoItem[] {
    const cutoffDate = getISTDateStringWithOffset(-7);
    
    return todos.map(todo => {
      if (!todo.completedDates || todo.completedDates.length === 0) {
        return todo;
      }
      
      // Filter out dates older than 10 days
      const recentDates = todo.completedDates.filter(date => date >= cutoffDate);
      
      return {
        ...todo,
        completedDates: recentDates
      };
    });
  }

  getDefaultTodos(): TodoItem[] {
    const today = getISTDateString();
    return [
      {
        id: 'app-default-1',
        time: '09:00',
        description: 'Send morning emails',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'daily',
        isDefaultTodo: true
      },
      {
        id: 'app-default-2',
        time: '10:00',
        description: 'Team standup meeting',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'daily',
        isDefaultTodo: true
      },
      {
        id: 'app-default-3',
        time: '14:00',
        description: 'Review pending tasks',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'daily',
        isDefaultTodo: true
      },
      {
        id: 'app-default-4',
        time: '11:30',
        description: 'Team sync (Mon & Thu)',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'custom',
        daysOfWeek: ['monday', 'thursday'],
        isDefaultTodo: true
      },
      {
        id: 'app-default-5',
        time: '15:00',
        description: 'Client calls (Tue & Fri)',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'custom',
        daysOfWeek: ['tuesday', 'friday'],
        isDefaultTodo: true
      },
      {
        id: 'app-default-6',
        time: '16:00',
        description: 'Update Google Sheets todos',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'weekly',
        daysOfWeek: ['friday'],
        isDefaultTodo: true
      },
      {
        id: 'app-default-7',
        time: '17:00',
        description: 'End of day summary',
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: today,
        recurrenceType: 'daily',
        isDefaultTodo: true
      }
    ];
  }

  // Google Sheets Methods
  fetchTodosFromGoogleSheets(): Observable<TodoItem[]> {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${this.GOOGLE_SHEET_ID}/export?format=csv&gid=${this.TODO_SHEET_GID}`;
    
    return this.http.get(csvUrl, { responseType: 'text' }).pipe(
      map(csvData => {
        const todos = this.parseCSVToTodos(csvData);
        return todos;
      }),
      catchError(error => {
        console.error('Error fetching todos from Google Sheets:', error);
        return of([]);
      })
    );
  }

  private parseCSVToTodos(csvData: string): TodoItem[] {
    const lines = csvData.split('\n');
    if (lines.length < 2) return [];

    const todos: TodoItem[] = [];
    
    // Skip header row, start from index 1
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = this.parseCSVRow(line);
      if (row.length < 8) continue; // Minimum required columns

      const todo: TodoItem = {
        id: row[0] || this.generateId(),
        time: row[1] || '09:00',
        description: row[2] || '',
        completed: row[3]?.toUpperCase() === 'TRUE',
        createdAt: row[4] || new Date().toISOString(),
        isDefaultTodo: row[5]?.toUpperCase() === 'TRUE',
        startDate: row[6] || getISTDateString(),
        recurrenceType: (row[7] || 'once') as RecurrenceType,
        endDate: row[8] || undefined,
        daysOfWeek: row[9] ? this.parseDaysOfWeek(row[9]) : undefined,
        biweeklyOffset: row[10] ? parseInt(row[10]) : undefined,
        dayOfMonth: row[11] ? parseInt(row[11]) : undefined,
        monthOfYear: row[12] ? parseInt(row[12]) : undefined,
        completedDates: row[13] ? row[13].split(',').filter(d => d.trim()) : []
      };

      if (todo.description) {
        todos.push(todo);
      }
    }

    return todos;
  }

  private parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private parseDaysOfWeek(daysString: string): DayOfWeek[] {
    const validDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return daysString
      .toLowerCase()
      .split(',')
      .map(d => d.trim() as DayOfWeek)
      .filter(d => validDays.includes(d));
  }

  // Merge Google Sheets todos with local todos
  mergeTodosWithLocal(sheetTodos: TodoItem[]): void {
    const localTodos = this.getTodoItems();
    
    // Create a map of local todos by ID for quick lookup
    const localTodoMap = new Map<string, TodoItem>();
    localTodos.forEach(todo => localTodoMap.set(todo.id, todo));
    
    // Create a set of sheet todo IDs for quick lookup
    const sheetTodoIds = new Set(sheetTodos.map(t => t.id));
    
    // Update sheet todos with local completion state if they exist locally
    const updatedSheetTodos = sheetTodos.map(sheetTodo => {
      const localTodo = localTodoMap.get(sheetTodo.id);
      if (localTodo) {
        // Preserve completion state and dates from local storage
        return {
          ...sheetTodo,
          completed: localTodo.completed,
          completedDates: localTodo.completedDates || []
        };
      }
      return sheetTodo;
    });
    
    // Get app default todos that are not in the sheet (preserve app defaults)
    const appDefaultTodos = localTodos.filter(todo => 
      todo.isDefaultTodo && !sheetTodoIds.has(todo.id)
    );
    
    // Get user-created todos that are not in the sheet
    const userCreatedTodos = localTodos.filter(todo => 
      !todo.isDefaultTodo && !sheetTodoIds.has(todo.id)
    );
    
    // Merge: Sheet todos + app default todos + user-created todos
    const mergedTodos = [...updatedSheetTodos, ...appDefaultTodos, ...userCreatedTodos];
    
    this.saveTodoItems(mergedTodos);
  }

  // Replace all todos with sheet data (overwrite)
  replaceTodosWithSheet(sheetTodos: TodoItem[]): void {
    this.saveTodoItems(sheetTodos);
  }

  // Sync: Fetch from sheet and merge with local
  syncTodosFromSheet(): Observable<TodoItem[]> {
    return this.fetchTodosFromGoogleSheets().pipe(
      map(sheetTodos => {
        if (sheetTodos.length > 0) {
          this.mergeTodosWithLocal(sheetTodos);
          return this.getTodoItems();
        }
        return this.getTodoItems();
      })
    );
  }

  // Utility Methods
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
