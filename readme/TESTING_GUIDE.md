# Quick Testing Guide

## Manual Testing Scenarios

### Scenario 1: Normal Day Flow ✅
1. Open app → Should see "Not Checked In"
2. Click Entry → Choose "Use Current Time"
3. Verify: Status shows "Welcome! You came to office at [time]"
4. Verify: Todo list appears
5. Verify: Exit calculator shows target time
6. Verify: Entry button disabled, Exit button enabled
7. Click Exit → Fill company name and comment → Click Continue
8. Verify: Submission dialog appears with entry/exit times
9. Click "Yes, Submit to Google Form"
10. Verify: Google Form opens in new tab
11. Verify: Status changes to "✅ Submitted!"
12. Verify: Todo list still visible
13. Verify: Both Entry and Exit buttons disabled

**Expected Result:** All steps complete successfully

---

### Scenario 2: Prevent Duplicate Entry ❌
1. Follow Scenario 1 steps 1-6
2. Try clicking Entry button (should be disabled)
3. Use browser console: `document.querySelector('.btn-entry').click()`
4. Verify: Alert shows "Already marked entry. Please mark exit first."

**Expected Result:** Cannot mark entry twice

---

### Scenario 3: Cancel Submission 🔄
1. Follow Scenario 1 steps 1-7
2. Submission dialog appears
3. Click "Cancel" instead of "Yes, Submit"
4. Verify: Exit time is cleared from storage
5. Verify: Status still shows "Welcome!" (no exit time)
6. Verify: Exit button enabled again
7. Can mark exit again

**Expected Result:** Exit cancelled, can re-mark

---

### Scenario 4: Custom Entry Time ⏰
1. Open app → Click Entry
2. Click on Custom Date & Time field
3. Select yesterday's date/time
4. Click "Use Custom Time"
5. Verify: Entry recorded with custom time
6. Verify: Exit calculator based on custom time

**Expected Result:** Custom time accepted and used

---

### Scenario 5: Prevent Entry After Submission 🚫
1. Complete full submission (Scenario 1)
2. Try clicking Entry button (should be disabled)
3. Use browser console: `document.querySelector('.btn-entry').click()`
4. Verify: Alert shows "Already submitted. Try tomorrow."

**Expected Result:** Cannot add new entry same day

---

### Scenario 6: Next Day Entry ✅
1. Complete full submission
2. Open DevTools → Application → Local Storage
3. Find `office_entry_log` key
4. Edit the `date` field to tomorrow's date (e.g., "2025-11-23")
5. Refresh page
6. Verify: Entry button enabled
7. Verify: Can mark new entry

**Expected Result:** New entry allowed on new date

---

### Scenario 7: Todo Persistence 📝
1. Mark entry
2. Add 2 new todos
3. Check off 1 todo as complete
4. Mark exit and submit
5. Verify: Todos still visible and states preserved
6. Refresh browser
7. Verify: Todos still there with same states

**Expected Result:** Todos persist through submission

---

### Scenario 8: Work Hours Adjustment ⚙️
1. Mark entry at 9:00 AM
2. Default: Calculator shows 3:00 PM (6 hours)
3. Change work hours to 8
4. Verify: Calculator now shows 5:00 PM
5. Refresh browser
6. Verify: Still shows 8 hours setting

**Expected Result:** Work hours persist in local storage

---

### Scenario 9: Browser Refresh 🔄
1. Mark entry
2. Add todos
3. Change work hours
4. Refresh browser
5. Verify: Entry time still shown
6. Verify: Todos still there
7. Verify: Work hours setting preserved

**Expected Result:** All data persists

---

### Scenario 10: Mark Exit Without Entry ⚠️
1. Open fresh app (no entry)
2. Try clicking Exit button (should be disabled)
3. Use console: `document.querySelector('.btn-exit').click()`
4. Verify: Alert shows "Please mark entry first before exit!"

**Expected Result:** Cannot exit without entry

---

## Browser Console Testing Commands

### Check Current State
```javascript
// View entry log
JSON.parse(localStorage.getItem('office_entry_log'))

// View todos
JSON.parse(localStorage.getItem('office_todo_items'))

// View settings
JSON.parse(localStorage.getItem('office_settings'))
```

### Simulate Next Day
```javascript
const log = JSON.parse(localStorage.getItem('office_entry_log'));
log.date = '2025-11-23'; // Change to tomorrow
localStorage.setItem('office_entry_log', JSON.stringify(log));
location.reload();
```

### Clear All Data
```javascript
localStorage.removeItem('office_entry_log');
localStorage.removeItem('office_todo_items');
localStorage.removeItem('office_settings');
location.reload();
```

### Force Enable Buttons (Test Alerts)
```javascript
// Force click disabled entry button
document.querySelector('.btn-entry').disabled = false;
document.querySelector('.btn-entry').click();

// Force click disabled exit button
document.querySelector('.btn-exit').disabled = false;
document.querySelector('.btn-exit').click();
```

---

## Expected Behaviors Summary

### Button States
| State | Entry Button | Exit Button |
|-------|--------------|-------------|
| No entry today | ✅ Enabled | ❌ Disabled |
| Entry marked | ❌ Disabled | ✅ Enabled |
| Exit marked (not submitted) | ❌ Disabled | ❌ Disabled |
| Submitted today | ❌ Disabled | ❌ Disabled |

### Todo List Visibility
| State | Todos Visible? |
|-------|----------------|
| No entry | ❌ Hidden |
| Entry marked | ✅ Visible |
| Exit marked | ✅ Visible |
| Submitted | ✅ Visible |

### Exit Calculator Visibility
| State | Calculator Visible? |
|-------|---------------------|
| No entry | ❌ Hidden |
| Entry only | ✅ Visible |
| Entry + Exit | ❌ Hidden |
| Submitted | ❌ Hidden |

---

## Known Accessibility Warnings (Non-Critical)

The following are linter warnings about accessibility, but don't affect functionality:
- Dialog overlays with click handlers (used for closing on backdrop click)
- Labels not associated with form elements (display-only labels)

These are intentional design choices and don't prevent the app from working.

---

## Google Form Testing

To test the Google Form integration:

1. Create a test Google Form with 4 fields
2. Get the pre-filled link to extract field IDs
3. Update `entry-logger.component.ts` line 135+:
   ```typescript
   const baseUrl = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';
   
   const params = new URLSearchParams({
     'entry.YOUR_ENTRY_ID': this.formatTo12Hour(new Date(log.entryTime)),
     'entry.YOUR_EXIT_ID': this.formatTo12Hour(new Date(log.exitTime!)),
     'entry.YOUR_COMPANY_ID': formData.companyName,
     'entry.YOUR_COMMENT_ID': formData.comment
   });
   ```
4. Test submission and verify form opens with pre-filled data

---

## Troubleshooting

### Problem: Buttons not responding
**Solution:** Check browser console for errors, verify Angular is running

### Problem: Data not persisting
**Solution:** Check browser allows local storage, not in incognito mode

### Problem: Google Form not opening
**Solution:** Check popup blocker settings, update form URL in code

### Problem: Wrong time zone
**Solution:** Verify browser timezone, code uses `Asia/Kolkata`

### Problem: Entry allowed after submission
**Solution:** Check `isSubmitted` flag in local storage, verify date format

---

## Performance Notes

- Local storage operations are synchronous (no network delay)
- Todo list should render instantly
- Time updates every second (clock display)
- No API calls (fully offline app)
- Lightweight: All data < 10KB in storage
