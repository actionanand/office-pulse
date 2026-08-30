# Task Planner

The `/tasks` route is an independent on-device task planner.

## Persistence

- Android stores tasks in the `office_pulse_todos` SQLite database.
- Web stores tasks in the `office-pulse-todos-v1` IndexedDB database.
- Completion is stored by occurrence date, so completing a repeating task does not complete every future occurrence.

## Recurrence

- One time occurs only on its start date.
- Daily occurs every day from the start date.
- Weekly supports one or multiple selected weekdays.
- Every 2 weeks uses the start date's week as the first active week and supports multiple weekdays.
- Monthly uses the start date's day of month. Months without that date are skipped.
- Yearly uses the start date's month and day.
- Optional end dates are inclusive.

## Reminders

Reminders require a task time. Android schedules the next 24 occurrences with native local notifications and refreshes the schedule whenever the app opens or the task changes. Web reminders work while the app is open.

Install and synchronize Android local notifications from WSL:

```bash
npm i @capacitor/local-notifications
npx cap sync android
```
