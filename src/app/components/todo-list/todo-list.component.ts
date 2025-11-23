import { Component, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { TodoItem } from '../../models/entry-log.model';

@Component({
  selector: 'app-todo-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoListComponent implements OnInit {
  private storageService = new StorageService();
  
  todos = signal<TodoItem[]>([]);
  showAddForm = signal<boolean>(false);
  newTodoTime = signal<string>('09:00');
  newTodoDescription = signal<string>('');

  ngOnInit(): void {
    this.loadTodos();
  }

  loadTodos(): void {
    const todos = this.storageService.getTodoItems();
    this.todos.set(todos);
  }

  toggleTodo(id: string): void {
    const todos = this.todos();
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.todos.set(updatedTodos);
    this.storageService.saveTodoItems(updatedTodos);
  }

  deleteTodo(id: string): void {
    const todos = this.todos();
    const updatedTodos = todos.filter(todo => todo.id !== id);
    this.todos.set(updatedTodos);
    this.storageService.saveTodoItems(updatedTodos);
  }

  openAddForm(): void {
    this.showAddForm.set(true);
    this.newTodoTime.set('09:00');
    this.newTodoDescription.set('');
  }

  closeAddForm(): void {
    this.showAddForm.set(false);
  }

  addTodo(): void {
    const description = this.newTodoDescription().trim();
    if (!description) {
      alert('Please enter a todo description');
      return;
    }

    const newTodo: TodoItem = {
      id: this.storageService.generateId(),
      time: this.newTodoTime(),
      description: description,
      completed: false,
      createdAt: new Date().toISOString()
    };

    const todos = [...this.todos(), newTodo];
    // Sort by time
    todos.sort((a, b) => a.time.localeCompare(b.time));
    
    this.todos.set(todos);
    this.storageService.saveTodoItems(todos);
    this.closeAddForm();
  }

  clearAllTodos(): void {
    if (confirm('Are you sure you want to clear all todos? This will restore default todos.')) {
      this.storageService.clearTodoItems();
      this.loadTodos();
    }
  }

  updateTodoTime(id: string, newTime: string): void {
    const todos = this.todos();
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, time: newTime } : todo
    );
    // Sort by time
    updatedTodos.sort((a, b) => a.time.localeCompare(b.time));
    
    this.todos.set(updatedTodos);
    this.storageService.saveTodoItems(updatedTodos);
  }

  updateNewTodoTime(value: string): void {
    this.newTodoTime.set(value);
  }

  updateNewTodoDescription(value: string): void {
    this.newTodoDescription.set(value);
  }
}
