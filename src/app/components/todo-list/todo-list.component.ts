import { Component, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from '../../services/todo.service';
import { TodoItem, RecurrenceType, DayOfWeek } from '../../models/entry-log.model';

@Component({
  selector: 'app-todo-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoListComponent implements OnInit {
  private todoService = new TodoService();
  
  allTodos = signal<TodoItem[]>([]);
  showAddForm = signal<boolean>(false);
  selectedDate = signal<string>(this.getTodayDateString());
  isSyncing = signal<boolean>(false);
  
  // Edit state
  editingTodoId = signal<string | null>(null);
  editDescription = signal<string>('');
  
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

  // Computed: Filter todos for selected date
  todosForSelectedDate = computed(() => {
    const date = this.selectedDate();
    const allTodos = this.allTodos();
    return this.getTodosForDate(allTodos, date);
  });

  ngOnInit(): void {
    this.loadTodos();
    // Auto-sync from Google Sheets on init
    this.syncFromGoogleSheets();
  }

  loadTodos(): void {
    const todos = this.todoService.getTodoItems();
    this.allTodos.set(todos);
  }

  syncFromGoogleSheets(): void {
    this.isSyncing.set(true);
    
    this.todoService.syncTodosFromSheet().subscribe({
      next: (todos) => {
        this.allTodos.set(todos);
        this.isSyncing.set(false);
        console.log('✅ Todos synced from Google Sheets:', todos.length);
      },
      error: (error) => {
        console.error('❌ Error syncing todos:', error);
        this.isSyncing.set(false);
        // Load from local storage as fallback
        this.loadTodos();
      }
    });
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getTodosForDate(todos: TodoItem[], dateStr: string): TodoItem[] {
    return todos.filter(todo => this.shouldShowTodoOnDate(todo, dateStr))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  private shouldShowTodoOnDate(todo: TodoItem, dateStr: string): boolean {
    const targetDate = new Date(dateStr);
    const startDate = new Date(todo.startDate);
    
    // Check if target date is before start date
    if (targetDate < startDate) {
      return false;
    }

    // Check if target date is after end date (if set)
    if (todo.endDate) {
      const endDate = new Date(todo.endDate);
      if (targetDate > endDate) {
        return false;
      }
    }

    // Check recurrence pattern
    switch (todo.recurrenceType) {
      case 'once':
        return dateStr === todo.startDate;
      
      case 'daily':
        return true;
      
      case 'weekly':
        return this.matchesWeeklyPattern(targetDate, todo.daysOfWeek || []);
      
      case 'biweekly':
        return this.matchesBiweeklyPattern(targetDate, startDate, todo.daysOfWeek || [], todo.biweeklyOffset || 0);
      
      case 'monthly':
        return targetDate.getDate() === (todo.dayOfMonth || 1);
      
      case 'yearly':
        return targetDate.getMonth() + 1 === (todo.monthOfYear || 1) && 
               targetDate.getDate() === (todo.dayOfMonth || 1);
      
      case 'custom':
        return this.matchesWeeklyPattern(targetDate, todo.daysOfWeek || []);
      
      default:
        return false;
    }
  }

  private matchesWeeklyPattern(date: Date, daysOfWeek: DayOfWeek[]): boolean {
    if (daysOfWeek.length === 0) return false;
    
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    return daysOfWeek.includes(dayName);
  }

  private matchesBiweeklyPattern(targetDate: Date, startDate: Date, daysOfWeek: DayOfWeek[], offset: number): boolean {
    // Calculate week difference
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / msPerWeek);
    
    // Check if this week matches the offset pattern
    if (weekDiff % 2 !== offset) {
      return false;
    }
    
    return this.matchesWeeklyPattern(targetDate, daysOfWeek);
  }

  isTodoCompletedOnDate(todo: TodoItem, dateStr: string): boolean {
    if (todo.recurrenceType === 'once') {
      return todo.completed;
    } else {
      return (todo.completedDates || []).includes(dateStr);
    }
  }

  toggleTodo(todo: TodoItem): void {
    const dateStr = this.selectedDate();
    const todos = this.allTodos();
    
    const updatedTodos = todos.map(t => {
      if (t.id !== todo.id) return t;
      
      if (t.recurrenceType === 'once') {
        return { ...t, completed: !t.completed };
      } else {
        const completedDates = t.completedDates || [];
        const isCompleted = completedDates.includes(dateStr);
        
        return {
          ...t,
          completed: !isCompleted, // Update completed flag for UI
          completedDates: isCompleted
            ? completedDates.filter(d => d !== dateStr)
            : [...completedDates, dateStr]
        };
      }
    });
    
    this.allTodos.set(updatedTodos);
    this.todoService.saveTodoItems(updatedTodos);
  }

  deleteTodo(id: string): void {
    if (!confirm('Are you sure you want to delete this todo?')) return;
    
    const todos = this.allTodos();
    const updatedTodos = todos.filter(todo => todo.id !== id);
    this.allTodos.set(updatedTodos);
    this.todoService.saveTodoItems(updatedTodos);
  }

  // Edit functionality
  startEditTodo(todo: TodoItem): void {
    this.editingTodoId.set(todo.id);
    this.editDescription.set(todo.description);
  }

  cancelEdit(): void {
    this.editingTodoId.set(null);
    this.editDescription.set('');
  }

  saveEdit(todoId: string): void {
    const newDescription = this.editDescription().trim();
    if (!newDescription) {
      alert('Description cannot be empty');
      return;
    }

    const todos = this.allTodos();
    const updatedTodos = todos.map(todo => 
      todo.id === todoId ? { ...todo, description: newDescription } : todo
    );
    
    this.allTodos.set(updatedTodos);
    this.todoService.saveTodoItems(updatedTodos);
    this.cancelEdit();
  }

  isEditing(todoId: string): boolean {
    return this.editingTodoId() === todoId;
  }

  openAddForm(): void {
    this.showAddForm.set(true);
    this.resetForm();
  }

  closeAddForm(): void {
    this.showAddForm.set(false);
  }

  private resetForm(): void {
    const today = this.getTodayDateString();
    this.newTodoTime.set('09:00');
    this.newTodoDescription.set('');
    this.newTodoStartDate.set(today);
    this.newTodoEndDate.set('');
    this.newTodoRecurrence.set('once');
    this.newTodoDaysOfWeek.set([]);
    this.newTodoBiweeklyOffset.set(0);
    this.newTodoDayOfMonth.set(new Date().getDate());
    this.newTodoMonthOfYear.set(new Date().getMonth() + 1);
  }

  addTodo(): void {
    const description = this.newTodoDescription().trim();
    if (!description) {
      alert('Please enter a todo description');
      return;
    }

    const recurrence = this.newTodoRecurrence();
    
    // Validate based on recurrence type
    if ((recurrence === 'weekly' || recurrence === 'biweekly' || recurrence === 'custom') && 
        this.newTodoDaysOfWeek().length === 0) {
      alert('Please select at least one day of the week');
      return;
    }

    const newTodo: TodoItem = {
      id: this.todoService.generateId(),
      time: this.newTodoTime(),
      description: description,
      completed: false,
      createdAt: new Date().toISOString(),
      isDefaultTodo: false, // User-created todos are not default
      startDate: this.newTodoStartDate(),
      endDate: this.newTodoEndDate() || undefined,
      recurrenceType: recurrence,
      completedDates: []
    };

    // Add optional fields based on recurrence type
    if (recurrence === 'weekly' || recurrence === 'biweekly' || recurrence === 'custom') {
      newTodo.daysOfWeek = this.newTodoDaysOfWeek();
    }
    
    if (recurrence === 'biweekly') {
      newTodo.biweeklyOffset = this.newTodoBiweeklyOffset();
    }
    
    if (recurrence === 'monthly') {
      newTodo.dayOfMonth = this.newTodoDayOfMonth();
    }
    
    if (recurrence === 'yearly') {
      newTodo.dayOfMonth = this.newTodoDayOfMonth();
      newTodo.monthOfYear = this.newTodoMonthOfYear();
    }

    const todos = [...this.allTodos(), newTodo];
    this.allTodos.set(todos);
    this.todoService.saveTodoItems(todos);
    this.closeAddForm();
  }

  clearAllTodos(): void {
    if (confirm('Are you sure you want to clear all todos? This will reset to default todos.')) {
      this.todoService.clearTodoItems();
      this.loadTodos();
    }
  }

  updateTodoTime(id: string, newTime: string): void {
    const todos = this.allTodos();
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, time: newTime } : todo
    );
    
    this.allTodos.set(updatedTodos);
    this.todoService.saveTodoItems(updatedTodos);
  }

  changeDate(direction: 'prev' | 'next'): void {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    this.selectedDate.set(current.toISOString().split('T')[0]);
  }

  goToToday(): void {
    this.selectedDate.set(this.getTodayDateString());
  }

  isToday(): boolean {
    return this.selectedDate() === this.getTodayDateString();
  }

  getFormattedDate(): string {
    const date = new Date(this.selectedDate());
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  toggleDayOfWeek(day: DayOfWeek): void {
    const current = this.newTodoDaysOfWeek();
    if (current.includes(day)) {
      this.newTodoDaysOfWeek.set(current.filter(d => d !== day));
    } else {
      this.newTodoDaysOfWeek.set([...current, day]);
    }
  }

  isDaySelected(day: DayOfWeek): boolean {
    return this.newTodoDaysOfWeek().includes(day);
  }

  updateNewTodoTime(value: string): void {
    this.newTodoTime.set(value);
  }

  updateNewTodoDescription(value: string): void {
    this.newTodoDescription.set(value);
  }

  getRecurrenceLabel(todo: TodoItem): string {
    switch (todo.recurrenceType) {
      case 'daily':
        return '🔄 Daily';
      case 'weekly':
        return `🔄 Weekly (${this.formatDaysOfWeek(todo.daysOfWeek || [])})`;
      case 'biweekly':
        return `🔄 Every 2 weeks (${this.formatDaysOfWeek(todo.daysOfWeek || [])})`;
      case 'monthly':
        return `🔄 Monthly (Day ${todo.dayOfMonth})`;
      case 'yearly':
        return `🔄 Yearly`;
      case 'custom':
        return `🔄 ${this.formatDaysOfWeek(todo.daysOfWeek || [])}`;
      default:
        return '';
    }
  }

  private formatDaysOfWeek(days: DayOfWeek[]): string {
    return days.map(d => d.substring(0, 3).toUpperCase()).join(', ');
  }
}
