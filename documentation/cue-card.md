# Cue Card Feature

The Cue Card page is available at `/cue-card`. It opens in View mode by default so saved cue cards are shown first.

## Modes

### View cue card

View mode loads cue cards from Google Sheets using GViz and merges them with offline cue cards saved in local storage.

Each cue card preview shows:

- title
- friendly updated date and time
- offline badge for local-only cards
- Google Sheet row number for sheet-backed cards
- a 100-word preview with ellipsis when content is longer

Selecting a preview opens the full cue card in a dialog. From the dialog, users can edit the cue card. Offline cards also show delete actions.

### Generate cue card

Generate mode lets users create or edit cue cards with rich text content. Supported formatting includes:

- bold
- italic
- strikethrough
- unordered lists
- indented unordered lists
- ordered lists
- font color
- highlight color
- small tables

When a cue card is opened for editing, the page switches to Generate mode and shows `Edit cue card`. If the cue card came from Google Sheets, the Google Sheet row number is shown so the copied row can replace the existing row.

## Google Sheet Columns

Cue cards are copied as tab-separated values. The current sheet columns are:

- `CueCardId`
- `CreatedAt`
- `UpdatedAt`
- `Title`
- `ContentHtml`
- `TableName`
- `TableHeaderBold`
- `TableData`

Use `Copy with header` when creating the sheet or adding the first cue card. Use `Copy row` or `Copy replacement row` when pasting into an existing sheet row.

## Tables

The first row is treated as the table header and is shown with a light background color. Users can enable `Bold table header` while generating the cue card.

Tables can be created manually or pasted from spreadsheet/tab-separated content. Table data is stored in `TableData` as compact JSON so rows and columns remain separate instead of being placed into one large cell.

## Offline Storage

`Save offline` stores a cue card in browser local storage. Offline cards are shown before Google Sheet cards. If an offline card has the same cue card id as a sheet card, the offline card is shown as the local version.

Users can delete individual offline cue cards from the preview or detail dialog. `Clear offline cue card` removes all offline cue cards.

## Related Notes

Cue cards are intended for short recall content. For detailed notes, create markdown and view it from `/markdown`.
