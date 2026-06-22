# Google Form Direct Submission

This app can save data to a Google Form without opening or embedding the form UI. The browser posts directly to the form's `formResponse` endpoint with the same field IDs used by prefilled form links.

## Why this is used

- Keeps common app flows inside Office Pulse instead of showing an embedded Google Form dialog.
- Works for browser and Android WebView usage with the same frontend code.
- Allows the app to show its own snackbar states for submitting, success, and failure.

## Endpoint pattern

For a Google Form ID:

```text
https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
```

The request body is URL-encoded form data:

```ts
const formBody = new URLSearchParams();
formBody.append('entry.123456789', value);

await fetch(formUrl, {
  method: 'POST',
  mode: 'no-cors',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: formBody.toString(),
});
```

## Important caveat

Google Forms does not return CORS-readable responses to frontend apps. Because of that, direct submission uses `mode: 'no-cors'`.

With `no-cors`, the browser does not expose the response status or response body. If `fetch` resolves, the app treats the submission as accepted by the browser. If the network request fails, the app shows an error snackbar.

## Current direct-submit flows

- `/logger`: Confirm Attendance and Day Off submit directly.
- `/achievements`: Submit Achievement submits directly. Open Empty Form still opens the embedded form manually.
- `/utilities`: Copy / Transfer Send submits directly. Open Form still opens the embedded form manually.

## Field ID maintenance

Each form has its own `entry.xxxxx` IDs. If a Google Form question is deleted and recreated, its entry ID may change. Update the matching service when that happens:

- Attendance fields: `entry-logger.component.ts`
- Achievement fields: `achievement.service.ts`
- Copy / Transfer fields: `copy.service.ts`

## Recommended UI behavior

- Disable the submit button while posting to prevent duplicate submissions.
- Show a snackbar while submitting.
- Show success after the request resolves.
- Show error if the request throws.
- Refresh sheet-backed data after a short delay, because Google Sheets may take a moment to reflect the new form response.
