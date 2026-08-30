# Pro attendance feature review

Logger Pro and Calendar Pro use the app's private local attendance store. The legacy Logger and Calendar remain unchanged and continue to use their existing Google-backed workflow.

## Covered in Pro

- Up to two shifts per entry date. The second is an explicit optional action after the first shift is completed.
- Overnight shifts remain attached to their entry date and do not consume the following day's normal shift.
- Only one unfinished shift at a time, while still permitting completed past records to be added during an active shift.
- Overnight shifts, with exit allowed on the following date.
- Entry locking after it is saved; the record must be removed before entry can be recorded again.
- Exit-time collection of optional company and comments plus work mode, defaulting to Work from Office.
- Work from Office, work from home, first-half leave and second-half leave attendance modes.
- Full day off for today. A day-off record must be removed before attendance can be added for that date.
- Past attendance entry from Logger Pro and Calendar Pro, with duplicate and office-holiday checks.
- Configurable work hours, progress against the target and Android log-off reminders at 60, 30, 15 and 0 minutes.
- Calendar monthly days-present and total-hours summaries, record details, edit, delete and PDF download.
- Encrypted attendance backup and restore from Settings.

## Intentionally separate from Pro

- Pro records are not submitted to Google Forms or read from Google Sheets. Legacy attendance retains that workflow.
- Legacy offline form retry and Load Offline Entry are specific to Google submission and are not required by the local Pro store.
- Daily and repeating tasks use the separate Tasks page and are not coupled to attendance records.

## Validation rules

- Past attendance must be before today and cannot use a future exit time.
- Entry must belong to the selected attendance date; exit may be on a later date.
- Exit cannot be earlier than entry.
- Full day off and known office holidays reject past attendance creation.
- First-half and second-half leave remain valid attendance records because they include worked time.
