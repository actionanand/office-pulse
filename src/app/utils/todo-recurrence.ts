import { TodoDay, TodoDbRecord } from '../models/todo-db.model';

const DAY_NAMES: readonly TodoDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function todoOccursOn(todo: TodoDbRecord, date: string): boolean {
  if (date < todo.startDate || (todo.endDate && date > todo.endDate)) return false;
  const target = parseDate(date);
  const start = parseDate(todo.startDate);

  switch (todo.recurrence) {
    case 'once':
      return date === todo.startDate;
    case 'daily':
      return true;
    case 'weekly':
      return todo.daysOfWeek.includes(DAY_NAMES[target.getDay()]);
    case 'biweekly': {
      const targetWeek = startOfWeek(target).getTime();
      const startWeek = startOfWeek(start).getTime();
      const weeks = Math.floor((targetWeek - startWeek) / (7 * 86_400_000));
      return weeks % 2 === 0 && todo.daysOfWeek.includes(DAY_NAMES[target.getDay()]);
    }
    case 'monthly':
      return target.getDate() === start.getDate();
    case 'yearly':
      return target.getMonth() === start.getMonth() && target.getDate() === start.getDate();
  }
}

export function nextTodoOccurrences(todo: TodoDbRecord, from: Date, limit: number): readonly Date[] {
  if (!todo.dueTime || limit <= 0) return [];
  const results: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const horizon = new Date(cursor);
  horizon.setFullYear(horizon.getFullYear() + 3);

  while (cursor <= horizon && results.length < limit) {
    const date = formatDate(cursor);
    if (todoOccursOn(todo, date)) {
      const [hours, minutes] = todo.dueTime.split(':').map(Number);
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hours, minutes);
      if (occurrence.getTime() - todo.reminderMinutesBefore * 60_000 > from.getTime()) results.push(occurrence);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

export function formatTodoDate(date: Date): string {
  return formatDate(date);
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}
