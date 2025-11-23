# Updated Workflow - Embedded Google Form

## New Submission Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Mark Exit Button Clicked                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Exit Dialog Opens   │
                  │  ┌────────────────┐  │
                  │  │ Entry Time     │  │
                  │  │ Exit Time      │  │
                  │  │ Company Name   │  │
                  │  │ Comments       │  │
                  │  └────────────────┘  │
                  │   [Cancel] [Continue]│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Confirmation Dialog  │
                  │  ⚠️  Are you sure?    │
                  │  Review times        │
                  │  Warning message     │
                  │ [Cancel] [Yes, Open] │
                  └──────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │     🆕 Google Form Dialog (Embedded)       │
        │  ┌──────────────────────────────────────┐  │
        │  │  📝 Submit Your Entry/Exit Details   │  │
        │  │                                 [✕]  │  │
        │  ├──────────────────────────────────────┤  │
        │  │  Instructions:                       │  │
        │  │  "Fill form and click Submit"        │  │
        │  │  💡 Form is pre-filled               │  │
        │  │                                      │  │
        │  │  ┌────────────────────────────────┐ │  │
        │  │  │                                │ │  │
        │  │  │   [Google Form iframe]         │ │  │
        │  │  │                                │ │  │
        │  │  │   Entry Time: [prefilled]      │ │  │
        │  │  │   Exit Time: [prefilled]       │ │  │
        │  │  │   Company: [prefilled]         │ │  │
        │  │  │   Comments: [prefilled]        │ │  │
        │  │  │                                │ │  │
        │  │  │   [Submit Button]              │ │  │
        │  │  │                                │ │  │
        │  │  └────────────────────────────────┘ │  │
        │  │                                      │  │
        │  │  After submitting, close this dialog│  │
        │  │                           [Close]    │  │
        │  └──────────────────────────────────────┘  │
        └────────────────┬───────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ User Submits Form    │
              │ (Inside iframe)      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ User Clicks "Close"  │
              │ Button in Footer     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Return to Main Page  │
              │ Status: ✅ Submitted! │
              │ Todos: Still visible │
              └──────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              EntryLoggerComponent (Parent)                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  State Management                                  │    │
│  │  • entryLog                                        │    │
│  │  • showGoogleFormDialog                            │    │
│  │  • googleFormUrl                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Methods                                           │    │
│  │  • buildGoogleFormUrl()  → Generates URL          │    │
│  │  • confirmSubmission()   → Shows dialog           │    │
│  │  • onGoogleFormClose()   → Handles close          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Template                                          │    │
│  │  <app-google-form-dialog                          │    │
│  │    [isOpen]="showGoogleFormDialog()"              │    │
│  │    [formUrl]="googleFormUrl()"                    │    │
│  │    (closeDialog)="onGoogleFormClose()"            │    │
│  │    (formSubmitted)="onGoogleFormSubmitted()"      │    │
│  │  />                                               │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Props & Events
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           GoogleFormDialogComponent (Child)                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Inputs                                            │    │
│  │  • isOpen: boolean                                 │    │
│  │  • formUrl: string                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Outputs                                           │    │
│  │  • closeDialog: void                               │    │
│  │  • formSubmitted: void                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Template                                          │    │
│  │  • Overlay (backdrop)                              │    │
│  │  • Dialog container                                │    │
│  │  • Header with close button                        │    │
│  │  • Body with instructions                          │    │
│  │  • Iframe (Google Form)                            │    │
│  │  • Footer with close button                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Methods                                           │    │
│  │  • getSafeUrl() → DomSanitizer                    │    │
│  │  • onCloseDialog() → Emit closeDialog             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → Component → Service → Storage
    ↓
Entry Time
    ↓
Exit Time
    ↓
Confirmation
    ↓
buildGoogleFormUrl()
    ├─→ Form ID
    ├─→ Entry Time (formatted IST)
    ├─→ Exit Time (formatted IST)
    ├─→ Company Name
    └─→ Comments
    ↓
URL with parameters
    ↓
DomSanitizer.bypassSecurityTrustResourceUrl()
    ↓
Safe URL
    ↓
Iframe src
    ↓
Google Form Loads (embedded)
    ↓
Pre-filled fields
    ↓
User submits form
    ↓
User closes dialog
    ↓
Status: Submitted ✅
```

## Key Differences: Old vs New

### Old Approach (New Tab)
```
Confirmation → window.open() → New Browser Tab
                                     ↓
                              Google Form Page
                                     ↓
                              User fills & submits
                                     ↓
                              User switches back to app
```

### New Approach (Embedded)
```
Confirmation → Dialog Opens → Embedded iframe
                                     ↓
                              Google Form (in dialog)
                                     ↓
                              User submits (stays in app)
                                     ↓
                              User clicks Close
                                     ↓
                              Dialog closes
```

## URL Structure

### Embedded Form URL Format
```
https://docs.google.com/forms/d/e/{FORM_ID}/viewform?embedded=true&entry.{FIELD_ID_1}={VALUE_1}&entry.{FIELD_ID_2}={VALUE_2}...
```

### Example
```
https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform?
embedded=true&
entry.123456789=22/11/2025, 09:30:00 AM&
entry.987654321=22/11/2025, 06:00:00 PM&
entry.555555555=Acme Corp&
entry.111111111=Regular working day
```

### URL Components
| Component | Purpose |
|-----------|---------|
| `embedded=true` | Tells Google Forms to render in iframe mode |
| `entry.XXXXXX` | Field ID for each form field |
| `={value}` | Pre-filled value (URL encoded) |

## Security Flow

```
Raw Form URL
    ↓
buildGoogleFormUrl()
    ↓
String with parameters
    ↓
googleFormUrl.set()
    ↓
Signal update
    ↓
Template [formUrl]="googleFormUrl()"
    ↓
getSafeUrl()
    ↓
DomSanitizer.bypassSecurityTrustResourceUrl()
    ↓
SafeResourceUrl
    ↓
[src]="getSafeUrl()"
    ↓
Iframe renders safely
```

### Why DomSanitizer?

Angular blocks untrusted URLs in iframes to prevent XSS attacks. We use `DomSanitizer` to explicitly trust Google Forms URLs:

```typescript
getSafeUrl(): SafeResourceUrl {
  return this.domSanitizer.bypassSecurityTrustResourceUrl(this.formUrl());
}
```

⚠️ **Important:** Only use this with trusted sources (like Google Forms)!

## Event Flow

```
Parent Component (EntryLogger)
    │
    ├─→ confirmSubmission()
    │   • Builds form URL
    │   • Sets showGoogleFormDialog = true
    │   • Marks as submitted
    │
    ↓
Child Component (GoogleFormDialog)
    │
    ├─→ Dialog opens (isOpen = true)
    │   • Renders overlay
    │   • Loads iframe
    │
    ├─→ User interacts with form
    │   • Fills remaining fields
    │   • Clicks Submit (inside iframe)
    │
    ├─→ User clicks Close button
    │   • onCloseDialog() called
    │   • Emits closeDialog event
    │
    ↓
Back to Parent
    │
    └─→ onGoogleFormClose()
        • Sets showGoogleFormDialog = false
        • Clears pending data
```

## Responsive Behavior

### Desktop (> 768px)
```
┌─────────────────────────────────┐
│  Dialog: 900px wide, centered  │
│  Iframe: 500px min-height      │
│  Footer: Horizontal layout     │
└─────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│ Dialog: Full width   │
│ Margins: 0.5rem      │
│ Iframe: 400px min-h  │
│ Footer: Vertical     │
│ Button: Full width   │
└──────────────────────┘
```

---

**Summary:**
- ✅ Embedded form keeps users in-app
- ✅ Pre-filled data reduces user effort
- ✅ Professional dialog UI
- ✅ Mobile-responsive design
- ✅ Secure URL handling with DomSanitizer
- ✅ Clean component separation
- ✅ Event-driven communication
