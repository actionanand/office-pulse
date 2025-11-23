# Office Entry/Exit Logger

An Angular application for tracking office entry and exit times with integrated Google Forms submission and todo management.

## Features

- ✅ **Entry Tracking**: Mark your office entry time (automatic or custom)
- ✅ **Exit Tracking**: Mark your office exit time with automatic calculation
- ✅ **Exit Calculator**: Shows when you can leave based on configurable work hours
- ✅ **Google Forms Integration**: Automatically submits entry/exit data to Google Forms
- ✅ **Todo Management**: Track daily tasks with time, description, and completion status
- ✅ **Local Storage**: All data persists in browser local storage
- ✅ **IST Time Format**: Uses 12-hour format with Indian Standard Time

## Usage

### Entry Flow

1. **Mark Entry**: Click the "📥 Entry" button
2. **Choose Time**:
   - **Use Current Time**: Automatically captures current time
   - **Use Custom Time**: Select a custom date and time
3. **Confirmation**: You'll see "You came to office at [time]"
4. **Todo List**: Todo list appears after entry is marked

### Exit Flow

1. **Mark Exit**: Click the "📤 Exit" button (only enabled after entry)
2. **Fill Form**:
   - Entry time (pre-filled)
   - Exit time (pre-filled with current time)
   - Company name
   - Comments (optional)
3. **Submit**: Opens Google Form with pre-filled data
4. **Auto-Clear**: Entry log is cleared after submission

### Exit Calculator

- Default work hours: **6 hours**
- Shows calculated exit time based on entry time
- Adjustable work hours (persists in local storage)
- Change work hours to see updated exit time

### Todo Management

- **Add Todo**: Click "+ Add Todo" button
- **Set Time**: Pick a time for the todo
- **Description**: Write what needs to be done
- **Complete**: Check the checkbox when done
- **Delete**: Click 🗑️ to remove a todo
- **Clear All**: Resets to default todos

#### Default Todos
- 09:00 - Send morning emails
- 10:00 - Team standup meeting
- 14:00 - Review pending tasks
- 17:00 - End of day summary

## Google Forms Integration

To integrate with your Google Form:

### Step 1: Create a Google Form

1. Go to [Google Forms](https://forms.google.com/)
2. Create a new form with these fields:
   - Entry Time (Short answer)
   - Exit Time (Short answer)
   - Company Name (Short answer)
   - Comments (Paragraph)

### Step 2: Get Form Field IDs

1. Open your form in edit mode
2. Click "Send" → Get pre-filled link
3. Fill in the form fields
4. Click "Get link"
5. Copy the URL - it will look like:
   ```
   https://docs.google.com/forms/d/e/FORM_ID/viewform?
   entry.123456=value1&
   entry.789012=value2&
   entry.345678=value3&
   entry.901234=value4
   ```
6. Note the `entry.XXXXXX` numbers for each field

### Step 3: Update the Code

Open `src/app/components/entry-logger/entry-logger.component.ts` and update the `openGoogleForm` method:

```typescript
openGoogleForm(log: EntryLog, formData: { companyName: string; comment: string }): void {
  // Replace with your actual Google Form URL and field IDs
  const baseUrl = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';
  
  const params = new URLSearchParams({
    'entry.ENTRY_TIME_FIELD_ID': this.formatTo12Hour(new Date(log.entryTime)),
    'entry.EXIT_TIME_FIELD_ID': this.formatTo12Hour(new Date(log.exitTime!)),
    'entry.COMPANY_FIELD_ID': formData.companyName,
    'entry.COMMENT_FIELD_ID': formData.comment
  });
  
  window.open(`${baseUrl}?${params.toString()}`, '_blank');
}
```

Replace:
- `YOUR_FORM_ID` → Your form ID from the URL
- `ENTRY_TIME_FIELD_ID` → Entry time field ID (e.g., 123456)
- `EXIT_TIME_FIELD_ID` → Exit time field ID (e.g., 789012)
- `COMPANY_FIELD_ID` → Company name field ID (e.g., 345678)
- `COMMENT_FIELD_ID` → Comments field ID (e.g., 901234)

## Local Storage Keys

The app uses these local storage keys:
- `office_entry_log` - Current day's entry/exit data
- `office_todo_items` - Todo list items
- `office_settings` - Work hours and other settings

## Technical Details

- **Framework**: Angular 19+ (Standalone Components)
- **State Management**: Angular Signals
- **Styling**: SCSS
- **Time Zone**: Asia/Kolkata (IST)
- **Time Format**: 12-hour format

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Navigate to
http://localhost:4200/logger
```

## Architecture

```
src/app/
├── models/
│   └── entry-log.model.ts          # TypeScript interfaces
├── services/
│   └── storage.service.ts          # Local storage operations
└── components/
    ├── entry-logger/               # Main logger component
    │   ├── entry-logger.component.ts
    │   ├── entry-logger.component.html
    │   └── entry-logger.component.scss
    └── todo-list/                  # Todo list component
        ├── todo-list.component.ts
        ├── todo-list.component.html
        └── todo-list.component.scss
```

## Notes

- Entry log is automatically cleared after Google Form submission
- This prevents incorrect calculations the next day
- Default todos can be restored by clicking "Clear All"
- Work hours setting persists across sessions
- Todo list only appears after entry is marked
- All times are in IST (Indian Standard Time)

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Requires modern browser with:
- Local Storage support
- ES6+ support
- Angular 19+ compatible

---

Enjoy tracking your office hours! 🎉
