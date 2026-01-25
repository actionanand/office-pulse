# Memo Formatting Guide - API Integration

## Overview

Memos support rich text formatting using a simple markdown-like syntax. This guide explains how to format memo descriptions for both manual creation and API responses.

## Formatting Syntax

### Text Formatting

#### Bold

```
**bold text**
or
__bold text__
```

Result: **bold text**

#### Italic

```
*italic text*
or
_italic text_
```

Result: _italic text_

#### Strikethrough

```
~~strikethrough text~~
```

Result: ~~strikethrough text~~

#### Code

```
`code snippet`
```

Result: `code snippet`

### Colors

#### Text Color

```
[color:red]red text[/color]
[color:blue]blue text[/color]
[color:green]green text[/color]
[color:#ff5733]custom hex color[/color]
```

Supported color names: red, blue, green, yellow, orange, purple, pink, or any hex code (#RRGGBB)

#### Background Color (Highlight)

```
[bg:yellow]highlighted text[/bg]
[bg:#ffeb3b]custom highlight[/bg]
```

### Lists

#### Unordered List

```
- First item
- Second item
- Third item
```

or

```
* First item
* Second item
* Third item
```

#### Ordered List

```
1. First item
2. Second item
3. Third item
```

### Checkboxes

#### Unchecked

```
- [ ] Task not done
```

#### Checked

```
- [x] Task completed
```

## API Response Format

When sending memo data from Google Sheets or any API, the description field should contain the raw markdown-like syntax:

### Example API Response (Google Sheets)

```json
{
  "table": {
    "rows": [
      {
        "c": [
          { "v": 1 },
          { "v": "Meeting Notes" },
          {
            "v": "**Important:** Review the following items:\n\n1. Budget proposal\n2. Timeline updates\n3. Resource allocation\n\n- [ ] Send follow-up email\n- [x] Update project board\n\n[color:red]Deadline: Friday[/color]"
          },
          { "v": false }
        ]
      }
    ]
  }
}
```

### Google Sheets Format

In your Google Sheets memo sheet (GID: 1177077213), the Description column (Column C) should contain:

| S No | Title         | Description                                                                                                                                                                                                    | Status |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Meeting Notes | **Important:** Review the following items:\n\n1. Budget proposal\n2. Timeline updates\n3. Resource allocation\n\n- [ ] Send follow-up email\n- [x] Update project board\n\n[color:red]Deadline: Friday[/color] | FALSE  |

**Note:** Use `\n` for line breaks in Google Sheets cells.

## Complete Example

### Input (Raw Markdown)

```
**Project Update**

This is the *latest* update on the project.

Key Points:
1. Completed user research
2. Designed mockups
3. Started development

Tasks:
- [x] Research phase
- [x] Design phase
- [ ] Development phase
- [ ] Testing phase

[color:red]**Important:**[/color] Review by [bg:yellow]Friday 5 PM[/bg]

Technical notes: Use `npm install` to setup.
~~Old approach~~ - using new framework instead.
```

### Rendered Output

**Project Update**

This is the _latest_ update on the project.

Key Points:

1. Completed user research
2. Designed mockups
3. Started development

Tasks:

- ✓ Research phase
- ✓ Design phase
- ☐ Development phase
- ☐ Testing phase

<span style="color:red">**Important:**</span> Review by <span style="background:yellow">Friday 5 PM</span>

Technical notes: Use `npm install` to setup.
~~Old approach~~ - using new framework instead.

## Best Practices

1. **Line Breaks:** Use `\n` in Google Sheets or actual line breaks in the application
2. **Nesting:** You can combine multiple formats: `**[color:red]bold red text[/color]**`
3. **Lists:** Each list item must be on its own line
4. **Checkboxes:** Must start with `- [ ]` or `- [x]` at the beginning of a line
5. **Colors:** Use standard color names or hex codes without the # symbol being URL-encoded

## Limitations

- No support for images or links (security)
- No support for tables
- No support for headers (use bold instead)
- Checkboxes are display-only (not interactive in memos)

## Security

All user input is sanitized to prevent XSS attacks:

- HTML tags are escaped
- Only whitelisted formatting is allowed
- Script injection is prevented
