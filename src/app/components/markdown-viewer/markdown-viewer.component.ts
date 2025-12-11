import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';

interface HistoryEntry {
  name: string;
  content: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-markdown-viewer',
  imports: [CommonModule, FormsModule, MarkdownModule],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewerComponent {
  readonly markdownContent = signal<string>('');
  readonly fileName = signal<string>('');
  readonly showInstructions = signal<boolean>(true);
  readonly history = signal<HistoryEntry[]>(this.loadHistory());

  readonly instructionsMarkdown = `# Markdown Viewer Guide

Welcome to the Markdown Viewer! This tool supports **advanced markdown features** including syntax highlighting, math equations, and diagrams.

## 📝 Basic Markdown Syntax

### Headers
Use \`#\` for headers (H1-H6):
\`\`\`markdown
# H1 Header
## H2 Header
### H3 Header
\`\`\`

### Text Formatting
- **Bold**: \`**text**\` or \`__text__\`
- *Italic*: \`*text*\` or \`_text_\`
- ~~Strikethrough~~: \`~~text~~\`
- \`Inline code\`: \`\\\`code\\\`\`

### Lists
**Unordered:**
\`\`\`markdown
- Item 1
- Item 2
  - Sub-item
\`\`\`

**Ordered:**
\`\`\`markdown
1. First
2. Second
3. Third
\`\`\`

---

## 💻 Prism.js Syntax Highlighting

Wrap code blocks with triple backticks and specify the language:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const getUser = async (id: number): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
\`\`\`

\`\`\`bash
npm install ngx-markdown prismjs mermaid katex
ng serve --open
\`\`\`

---

## 🧮 KaTeX Math Equations

### Inline Math
Use single dollar signs: \`$E = mc^2$\` renders as $E = mc^2$

### Block Math
Use double dollar signs:

\`\`\`
$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
\`\`\`

Renders as:

$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

**Common Symbols:**
- Greek: \`$\\alpha, \\beta, \\gamma, \\Delta, \\Omega$\`
- Operators: \`$\\sum, \\prod, \\int, \\lim$\`
- Relations: \`$\\leq, \\geq, \\neq, \\approx$\`

---

## 📊 Mermaid.js Diagrams

### Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server
    User->>Browser: Enter URL
    Browser->>Server: HTTP Request
    Server->>Browser: HTML Response
    Browser->>User: Render Page
\`\`\`

### Class Diagram
\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog
\`\`\`

### Gantt Chart
\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Design           :a1, 2024-01-01, 30d
    Development      :a2, after a1, 45d
    section Phase 2
    Testing          :a3, after a2, 20d
    Deployment       :a4, after a3, 10d
\`\`\`

---

## 📋 Tables

\`\`\`markdown
| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ | High |
| Prism.js | ✅ | High |
| Mermaid | ✅ | Medium |
| KaTeX | ✅ | Medium |
\`\`\`

Renders as:

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ | High |
| Prism.js | ✅ | High |
| Mermaid | ✅ | Medium |
| KaTeX | ✅ | Medium |

---

## 🔗 Links and Images

**Links:** \`[Google](https://google.com)\`

**Images:** \`![Alt text](image-url.jpg)\`

---

## 💡 Tips

1. **Upload your markdown file** using the file input above
2. Files are saved in history (max 5) for quick access
3. Click on history items to reload them
4. Clear individual entries or all history as needed
5. All content is stored locally in your browser

**Happy documenting! 🚀**
`;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        this.fileName.set(file.name);
        this.markdownContent.set(content);
        this.showInstructions.set(false);
        this.addToHistory(file.name, content);
      };
      reader.readAsText(file);
    }
  }

  addToHistory(name: string, content: string): void {
    let hist = this.history().filter(h => h.name !== name);
    hist.unshift({
      name,
      content,
      uploadedAt: new Date().toISOString(),
    });
    if (hist.length > 5) {
      hist = hist.slice(0, 5);
    }
    this.history.set(hist);
    localStorage.setItem('markdownHistory', JSON.stringify(hist));
  }

  loadHistory(): HistoryEntry[] {
    const raw = localStorage.getItem('markdownHistory');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  loadFromHistory(entry: HistoryEntry): void {
    this.fileName.set(entry.name);
    this.markdownContent.set(entry.content);
    this.showInstructions.set(false);
  }

  clearHistory(): void {
    this.history.set([]);
    localStorage.removeItem('markdownHistory');
  }

  removeHistoryEntry(name: string): void {
    const hist = this.history().filter(h => h.name !== name);
    this.history.set(hist);
    localStorage.setItem('markdownHistory', JSON.stringify(hist));
  }

  showInstructionsView(): void {
    this.showInstructions.set(true);
    this.fileName.set('');
    this.markdownContent.set('');
  }

  getFormattedDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
