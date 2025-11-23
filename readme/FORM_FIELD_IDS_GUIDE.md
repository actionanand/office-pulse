# 🔧 Google Form Field Configuration Guide

## Current Form Setup

Your Google Form should have these **4 fields** in order:

1. **Entry Time** (Short answer) - ⚠️ **REQUIRED**
2. **Exit Time** (Short answer) - ⚠️ **REQUIRED**
3. **Company Name** (Short answer) - Optional
4. **Comments** (Paragraph) - Optional

---

## How to Get Field IDs (Step-by-Step)

### Method 1: Using Pre-filled Link (Recommended)

#### Step 1: Open Your Google Form
1. Go to your form: `https://docs.google.com/forms/d/YOUR_FORM_ID/edit`

#### Step 2: Get Pre-filled Link
1. Click the **"Send"** button (top-right)
2. Click the **link icon** 🔗
3. At the bottom, click **"Get pre-filled link"**

#### Step 3: Fill Test Data
Fill in ALL fields with test data:
- Entry Time: `Test Entry`
- Exit Time: `Test Exit`
- Company Name: `Test Company`
- Comments: `Test Comment`

#### Step 4: Get the Link
1. Click **"Get Link"** button at the bottom
2. Copy the entire URL

#### Step 5: Extract Field IDs
The URL will look like this:
```
https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?
usp=pp_url&
entry.1234567890=Test+Entry&          ← Entry Time field ID
entry.0987654321=Test+Exit&           ← Exit Time field ID
entry.1111111111=Test+Company&        ← Company Name field ID
entry.2222222222=Test+Comment         ← Comments field ID
```

The numbers after `entry.` are your field IDs!

---

### Method 2: Using Browser Inspector

#### Step 1: Open Form in Preview
1. Click **"Preview"** button (eye icon) in your form
2. This opens the form in a new tab

#### Step 2: Inspect Element
1. Right-click on the **Entry Time** input field
2. Select **"Inspect"** or **"Inspect Element"**

#### Step 3: Find the Field ID
Look for code like:
```html
<input type="text" name="entry.1234567890" ...>
                         ^^^^^^^^^^^
                    This is your field ID
```

#### Step 4: Repeat for All Fields
Do this for each field:
- Entry Time → `entry.XXXXXXXXXX`
- Exit Time → `entry.YYYYYYYYYY`
- Company Name → `entry.ZZZZZZZZZZ`
- Comments → `entry.WWWWWWWWWW`

---

## Configure Your Application

### Step 1: Update the Code

Open: `src/app/components/entry-logger/entry-logger.component.ts`

Find the `buildGoogleFormUrl` method (around line 218) and update:

```typescript
buildGoogleFormUrl(log: EntryLog, formData: { companyName: string; comment: string }): string {
  const formId = env.YOUR_FORM_ID;
  
  const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
  
  const params = new URLSearchParams({
    'usp': 'pp_url',
    'entry.1234567890': this.formatTo12Hour(new Date(log.entryTime)),   // ← Replace with Entry Time ID
    'entry.0987654321': this.formatTo12Hour(new Date(log.exitTime!)),  // ← Replace with Exit Time ID
    'entry.1111111111': formData.companyName || '',                     // ← Replace with Company Name ID
    'entry.2222222222': formData.comment || '',                         // ← Replace with Comments ID
    'embedded': 'true'
  });
  
  return `${baseUrl}?${params.toString()}`;
}
```

### Step 2: Example with Real IDs

Let's say you got these IDs:
- Entry Time: `entry.123456789`
- Exit Time: `entry.987654321`
- Company Name: `entry.555555555`
- Comments: `entry.111111111`

Update the code like this:

```typescript
const params = new URLSearchParams({
  'usp': 'pp_url',
  'entry.123456789': this.formatTo12Hour(new Date(log.entryTime)),   // Entry Time
  'entry.987654321': this.formatTo12Hour(new Date(log.exitTime!)),  // Exit Time
  'entry.555555555': formData.companyName || '',                     // Company Name
  'entry.111111111': formData.comment || '',                         // Comments
  'embedded': 'true'
});
```

---

## Testing Pre-fill

### Step 1: Test Manually
1. Mark entry in the app
2. Mark exit
3. Fill company name and comments
4. Click "Yes, Open Google Form"

### Step 2: Verify Pre-filled Data
The Google Form dialog should open with:
- ✅ Entry Time field populated (e.g., "22/11/2025, 09:30:00 AM")
- ✅ Exit Time field populated (e.g., "22/11/2025, 06:00:00 PM")
- ✅ Company Name field populated (if you entered it)
- ✅ Comments field populated (if you entered it)

### Step 3: If Not Pre-filled
**Problem**: Fields are empty

**Solutions**:
1. ✅ Check field IDs match exactly (including the `entry.` prefix)
2. ✅ Verify you're using the correct Form ID
3. ✅ Make sure the field order in your form matches the order in code
4. ✅ Check browser console for errors

---

## Common Issues & Solutions

### Issue 1: Form Not Showing
**Symptoms**: Blank dialog or "Loading form..." never completes

**Solutions**:
- Check Form ID is correct
- Ensure form is published (not draft)
- Check form settings allow embedding
- Check browser console for CORS errors

### Issue 2: Fields Not Pre-filled
**Symptoms**: Form loads but fields are empty

**Solutions**:
```typescript
// Make sure you have this exact format:
'entry.XXXXXXXXXX': value,  // ✅ Correct
'XXXXXXXXXX': value,        // ❌ Wrong (missing entry.)
'entry-XXXXXXXXXX': value,  // ❌ Wrong (dash instead of dot)
```

### Issue 3: Wrong Data in Fields
**Symptoms**: Entry time shows in exit time field

**Solutions**:
- Verify field IDs are in correct order
- Check you're not swapping entry/exit values
- Inspect the actual URL being generated

### Issue 4: Form Height Too Small
**Symptoms**: Can't see full form, need to scroll inside iframe

**Solutions**:
- Already fixed! Set to 700px (desktop) and 600px (mobile)
- You can adjust in `google-form-dialog.component.scss`:
  ```scss
  .iframe-container {
    min-height: 700px; // Increase this value if needed
  }
  ```

---

## Debugging Tips

### 1. Check Generated URL
Add this to see the URL being created:

```typescript
buildGoogleFormUrl(log: EntryLog, formData: { companyName: string; comment: string }): string {
  const formId = env.YOUR_FORM_ID;
  const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
  
  const params = new URLSearchParams({
    'usp': 'pp_url',
    'entry.1234567890': this.formatTo12Hour(new Date(log.entryTime)),
    'entry.0987654321': this.formatTo12Hour(new Date(log.exitTime!)),
    'entry.1111111111': formData.companyName || '',
    'entry.2222222222': formData.comment || '',
    'embedded': 'true'
  });
  
  const fullUrl = `${baseUrl}?${params.toString()}`;
  console.log('Generated Form URL:', fullUrl); // ← Add this line
  return fullUrl;
}
```

### 2. Test URL Manually
1. Copy the logged URL from console
2. Remove `&embedded=true` from the end
3. Paste in browser address bar
4. Check if fields are pre-filled

### 3. Verify Field Order
Make sure your Google Form fields are in this **exact order**:
1. Entry Time (first question)
2. Exit Time (second question)
3. Company Name (third question)
4. Comments (fourth question)

---

## Field Configuration Checklist

- [ ] Google Form created with 4 fields
- [ ] Entry Time marked as **Required**
- [ ] Exit Time marked as **Required**
- [ ] Company Name marked as **Optional**
- [ ] Comments marked as **Optional**
- [ ] Pre-filled link generated
- [ ] Field IDs extracted (all 4 numbers)
- [ ] Code updated with correct field IDs
- [ ] Form ID verified in environment.ts
- [ ] Tested with actual entry/exit
- [ ] All fields pre-fill correctly
- [ ] Form submits successfully

---

## Form Settings

### Ensure These Settings:

1. **General Settings**
   - ✅ Collect email addresses: OFF (unless you want it)
   - ✅ Limit to 1 response: OFF
   - ✅ Allow response editing: Optional

2. **Presentation Settings**
   - ✅ Show progress bar: Optional
   - ✅ Shuffle question order: OFF
   - ✅ Show link to submit another response: Optional

3. **Required Fields**
   - ✅ Entry Time: Required (red asterisk)
   - ✅ Exit Time: Required (red asterisk)
   - ✅ Company Name: Optional (no asterisk)
   - ✅ Comments: Optional (no asterisk)

---

## Quick Reference

### Current Configuration
```typescript
// Location: src/app/components/entry-logger/entry-logger.component.ts
// Line: ~218

'entry.1234567890': Entry Time (Required)
'entry.0987654321': Exit Time (Required)
'entry.1111111111': Company Name (Optional)
'entry.2222222222': Comments (Optional)
```

### Time Format
Entry and Exit times are formatted as:
```
22/11/2025, 09:30:00 AM  (IST - Indian Standard Time)
```

### URL Structure
```
https://docs.google.com/forms/d/e/{FORM_ID}/viewform
?usp=pp_url
&entry.{ID}={value}
&entry.{ID}={value}
&entry.{ID}={value}
&entry.{ID}={value}
&embedded=true
```

---

## Example Complete Setup

### Your Google Form
```
Title: Office Entry/Exit Log

Questions:
1. Entry Time * (Short answer)
2. Exit Time * (Short answer)
3. Company Name (Short answer)
4. Comments (Paragraph)

* = Required
```

### Extracted Field IDs
```
Entry Time:    entry.123456789
Exit Time:     entry.987654321
Company Name:  entry.555555555
Comments:      entry.111111111
```

### Updated Code
```typescript
const params = new URLSearchParams({
  'usp': 'pp_url',
  'entry.123456789': this.formatTo12Hour(new Date(log.entryTime)),
  'entry.987654321': this.formatTo12Hour(new Date(log.exitTime!)),
  'entry.555555555': formData.companyName || '',
  'entry.111111111': formData.comment || '',
  'embedded': 'true'
});
```

### Result
When user submits, form opens with:
- Entry Time: ✅ "22/11/2025, 09:30:00 AM"
- Exit Time: ✅ "22/11/2025, 06:00:00 PM"
- Company Name: ✅ "Acme Corp" (if entered)
- Comments: ✅ "Regular day" (if entered)

---

**Need help?** Check browser console for the generated URL and verify each field ID matches your form!
