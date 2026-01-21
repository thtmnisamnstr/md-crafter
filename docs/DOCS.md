# md-crafter Documentation

Complete user and developer documentation for the md-crafter cloud-synced markdown editor.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Interface](#user-interface)
3. [Features](#features)
4. [Keyboard Shortcuts](#keyboard-shortcuts)
5. [Cloud Sync](#cloud-sync)
6. [Themes](#themes)
7. [Configuration](#configuration)
8. [API Reference](#api-reference)
9. [Self-Hosting](#self-hosting)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/thtmnisamnstr/md-crafter.git
cd md-crafter

# Install dependencies
npm install

# Build the shared package
npm run build -w @md-crafter/shared

# Start development servers
npm run dev
```

### First Launch

1. Open `http://localhost:5173` in your browser
2. You'll see the editor with a default document
3. Click "Sign In" in the sidebar to enable cloud sync
4. Click "Create Account" to generate an API token
5. Save your token securely - it cannot be recovered

---

## User Interface


### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar  │  Tab Bar                                    │
│           ├─────────────────────────────────────────────┤
│  - Open   │                                             │
│    Editors│           Editor                 │ Preview  │
│           │                                  │ (MD)     │
│  - Cloud  │                                  │          │
│    Docs   │                                  │          │
│           │                                             │
├───────────┴─────────────────────────────────────────────┤
│  Status Bar                                              │
└──────────────────────────────────────────────────────────┘
```

### Sidebar

- **Open Editors**: Shows all currently open documents
- **Cloud Documents**: Shows documents saved to the cloud (requires sign-in)
- **Sign In/Out**: Authentication controls
- **New Document** (+): Create a new document
- **Settings** (⚙️): Open settings panel

### Tab Bar

- Click a tab to switch to that document
- Click X to close a tab
- Yellow dot indicates unsaved changes
- Cloud icon indicates cloud-synced document

### Status Bar

The status bar at the bottom of the editor displays:

- **Sidebar toggle**: Show/hide sidebar
- **Online/Offline**: Network status based on connectivity
- **Auth Status**: Shows "Syncing enabled" when signed in and cloud sync is available
- **Sync Status**: For cloud-synced documents, shows the current sync state:
  - **Synced** - Document is up to date with the cloud
  - **Syncing** - Document is currently being synchronized
  - **Pending** - Changes are queued for sync
  - **Conflict** - A sync conflict has been detected
- **Language**: Current file type/language
- **Lines**: Line count for the document
- **Document Statistics**: Document-wide and selection-based word/character counts (see below)
- **Preview Toggle**: Toggle markdown preview (for markdown files)
- **Unsaved Indicator**: Shows "● Unsaved" when document has unsaved changes

The status bar automatically updates as you type, select text, or change documents.

#### Word and Character Count

- **Document Counts** - Shows total word and character count for the active document
- **Selection Counts** - When text is selected, shows:
  - Word count and character count for selected text
  - Total word and character count for the entire document
- **Real-time Updates** - Counts update automatically as you type or change selection
- **Works in All Editor Modes** - Selection stats work in regular editor, split editor, and diff view modes
- **Display Format**:
  - No selection: "X words | Y chars"
  - With selection: "X words selected | Y chars selected | A words total | B chars total"

---

## Features

### Markdown Preview

Toggle the preview pane for markdown files to see rendered output:

- Side-by-side editing and preview
- GitHub Flavored Markdown support
- Resizable preview pane (drag the divider)
- Click links in preview to open them

### Diff Viewer

Compare documents using the diff viewer:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Search for "Compare"
3. Choose comparison type

### Export

Export documents to different formats:

1. Press `Ctrl+E` or use Command Palette
2. Choose format (HTML or Markdown)
3. File will download automatically

### Zen Mode

Enter distraction-free writing mode:

1. Press `Ctrl+K` then `Z`
2. Or use Command Palette → "Enter Zen Mode"
3. Press `Esc` to exit

### Split Editor

View and edit multiple documents side-by-side or top-to-bottom:

- **Split Right** - Vertical split (side-by-side)
- **Split Down** - Horizontal split (top-to-bottom)
- **No Split** - Disable split mode
- **Tab Selectors** - Each pane has a dropdown to select any open file
- **Resizable Panes** - Drag the divider between panes to adjust sizes
- **Independent Editing** - Each pane can show a different file and be edited independently

To use split editor:
1. Open View menu → Split Editor
2. Choose Split Right (vertical) or Split Down (horizontal)
3. Use the dropdown menus in each pane to select files
4. Drag the divider to resize panes
5. Select "No Split" to disable split mode

### Diff View

Compare documents side-by-side with visual diff highlighting:

- **Compare with Saved Version** - Compare the current document with its last saved version (only available when document has unsaved changes)
- **Compare Active File with...** - Compare the active document with any other open document
- **Exit Diff View** - Return to normal editor view

To use diff view:
1. Open View menu → Compare Files
2. Select comparison type:
   - "Compare with Saved Version" to see unsaved changes
   - "Compare Active File with..." to compare with another open document
3. The diff editor shows:
   - Left side: Original document (read-only)
   - Right side: Modified document (read-only)
   - Visual highlighting of additions (green) and deletions (red)
4. Use the dropdown to switch which document to compare
5. Click "Exit Diff View" or select "No Split" to return to normal view

**Note**: Diff view uses Monaco's built-in diff editor for accurate line-by-line comparison with syntax highlighting. Word wrap is supported in both panes and respects your editor settings.

### Open Recent

Quickly access recently opened files:

- **Recent Files Menu** - File menu → Open Recent shows up to 5 most recent files
- **Cloud Documents** - Can be reopened directly from recent menu via API
- **Local Files** - Desktop app can reopen files from disk; web app requires files to be currently open
- **Remove Files** - Click the X button next to any recent file to remove it from the list
- **Automatic Tracking** - Files are automatically added to recent when opened
- **Sorted by Date** - Most recently opened files appear first

**Desktop App**: Recent files with saved paths can be reopened directly from disk, even if not currently open.

**Web App**: Cloud documents can be reopened via API. Local files can only be reopened if they're currently open in a tab. Use File → Open to manually reopen local files.

**Document Persistence**: All open documents (saved and unsaved) are automatically restored when you restart the app, just like VS Code. Your work is preserved across sessions.

### Drag and Drop

Drop files directly into the editor:

- Supported: `.md`, `.txt`, `.js`, `.ts`, `.json`, `.html`, `.css`, `.py`, etc.
- Files open in new tabs
- Multiple files can be dropped at once

### Search and Replace

Find and replace functionality in the active document:

- **Find in Document** - Press `Ctrl+F` (or `Cmd+F` on Mac) to open the find widget
- **Replace in Document** - Press `Ctrl+H` (or `Cmd+H` on Mac) to open the replace widget
- **Search Options** - The find widget supports:
  - Case-sensitive search (toggle button)
  - Regex search (toggle button)
  - Whole word search (toggle button)
- **Navigation** - Use Find Next/Previous buttons or keyboard shortcuts
- **Global Search** - Press `Ctrl+Shift+Alt+F` to search across all documents

### Smart Paste

The editor automatically handles rich text pasting:

- **Regular Paste** (`Ctrl+V`) - Automatically converts rich text (from Word, Google Docs, etc.) to plaintext
- **Word/Docs Paste** (`Ctrl+Shift+V`) - Converts rich text to markdown format, preserving formatting
- **Copy to HTML** (`Alt+Cmd+C` / `Alt+Ctrl+C`) - Converts selected Markdown to clean HTML and copies to clipboard
- **Paste from HTML** (`Alt+Cmd+V` / `Alt+Ctrl+V`) - Converts HTML from clipboard to Markdown, stripping non-text CSS (colors, backgrounds, classes)
- **Plain Text** - Plain text pastes normally without conversion

**Supported conversions** (when using `Ctrl+Shift+V`):
- **Tables** - HTML tables are converted to GitHub Flavored Markdown (GFM) table syntax
- **Bold/Italic** - Formatting is preserved as `**bold**` and `*italic*`
- **Lists** - Ordered and unordered lists are converted to markdown list syntax
- **Headings** - HTML headings become markdown headings (`#`, `##`, etc.)
- **Links** - Hyperlinks are converted to `[text](url)` format
- **Strikethrough** - Deleted text becomes `~~strikethrough~~`

This ensures that when you paste content from Word or Google Docs, it's automatically converted to plaintext or markdown, preventing formatting issues in your markdown documents.

**Note**: Complex table features like merged cells are not supported by markdown and will be simplified during conversion.

**Browser Compatibility**: Clipboard features work across all modern browsers (Chrome, Firefox, Safari). Rich text paste (ClipboardItem API) has full support in Chrome/Chromium, with automatic fallback to plain text in Firefox and Safari when needed.

### Format Document

Auto-format markdown documents for consistent styling:

1. Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
2. Or use Edit → Format Document
3. Document is formatted using Prettier markdown formatter
4. Only available for markdown files (`.md` extension)

### Spell Check

Advanced spell checking powered by monaco-spellchecker and typo-js:

- **Real-time checking** - Misspelled words are underlined with red squiggles as you type
- **Suggestions** - Right-click on misspelled words to see correction suggestions
- **Custom dictionary** - Add words to your personal dictionary (right-click → Add to Dictionary)
- **Ignore words** - Right-click → Ignore to skip checking specific words
- **Lazy loading** - Dictionary files load on-demand when spellcheck is first enabled
- **Persistence** - Ignored words and custom dictionary persist across sessions
- **Toggle** - Enable/disable in Settings (`Ctrl+,`) → Spell Check

**Note**: Dictionary files (~2-5MB) are loaded from `/public/dictionaries/en_US/` when spellcheck is first enabled. Only English (US) dictionary is included by default.

### Grammar Check

Comprehensive grammar and style checking using textlint:

- **On-demand checking** - Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) to check grammar
- **Markdown-aware** - Specifically designed for markdown documents
- **Multiple rules** - Checks for:
  - Common misspellings (`textlint-rule-common-misspellings`)
  - Writing style (`textlint-rule-write-good`):
    - Passive voice
    - Weasel words (very, really, quite, etc.)
    - Wordiness
    - Cliches
    - Unnecessary "there is/there are" phrases
- **Monaco integration** - Grammar issues appear as warning markers in the editor
- **Code actions** - Right-click on issues to see suggested fixes
- **Web worker** - Runs in background thread to keep UI responsive
- **Lazy loading** - Textlint (~2MB) loads only when grammar check is first used

**Usage**:
1. Open a markdown document
2. Press `Ctrl+Shift+G` or use Edit → Check Grammar
3. Grammar issues appear as yellow warning markers
4. Hover over markers to see the issue description
5. Right-click for code actions to fix issues

**Note**: Grammar checking is only available for markdown files (`.md` extension).

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New document |
| `Ctrl+O` | Open file(s) |
| `Ctrl+S` | Save |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+P` | Print / Export PDF |
| `Ctrl+,` | Settings |

### View

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+K Z` | Toggle Zen mode |

### File

| Shortcut | Action |
|----------|--------|
| `Ctrl+E` | Export document |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Find in active document |
| `Ctrl+H` | Replace in active document |
| `Ctrl+Shift+F` | Format document |
| `Ctrl+Shift+Alt+F` | Global search (across all documents) |
| `Ctrl+Shift+G` | Check grammar |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste (converts rich text to plaintext) |
| `Ctrl+Shift+C` | Copy to Word/Docs (Rich Text) |
| `Ctrl+Shift+V` | Paste from Word/Docs (as markdown) |
| `Alt+Cmd+C` | Copy to HTML |
| `Alt+Cmd+V` | Paste from HTML (strips styles) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+/` | Toggle comment |

### Markdown (in editor)

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold (wraps selection with **) |
| `Ctrl+I` | Italic (wraps selection with *) |
| `Ctrl+K` | Insert link |

**Note**: `Ctrl+B` toggles sidebar when editor is not focused.

---

## Cloud Sync

### How It Works

1. Documents are stored locally by default
2. "Save to Cloud" uploads a document to the server
3. Cloud documents sync automatically when edited
4. Conflicts are detected and can be resolved visually

### Conflict Resolution

When a document is edited on multiple devices:

1. A conflict modal appears
2. You can see differences between versions
3. Choose to keep local, keep remote, or merge manually

### Offline Mode

- The editor works fully offline
- Changes are queued and sync when back online
- Status bar shows connection state

---

## Themes

### Built-in Themes

- **Dark+** (default) - VS Code dark theme
- **Light+** - VS Code light theme
- **Monokai** - Classic Monokai colors
- **Dracula** - Popular purple/pink theme
- **GitHub Dark** - GitHub's dark mode
- **Nord** - Arctic, bluish color palette

### Changing Themes

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "theme"
3. Select "Change Color Theme"
4. Choose your preferred theme

### Theme in Settings

1. Open Settings (`Ctrl+,`)
2. Click on your preferred theme in the grid

---

## Configuration

### Editor Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Theme | Editor theme | Dark+ |
| Font Size | Editor font size in pixels | 14 |
| Tab Size | Number of spaces per tab | 2 |
| Word Wrap | Wrap long lines | On |
| Line Numbers | Show line numbers | On |
| Minimap | Show minimap | On |
| Auto Sync | Automatically sync cloud documents | On |
| Spell Check | Enable browser-native spell checking | On |

### Server Configuration

Create `.env` in `packages/server/`:

```bash
# Port
PORT=3001

# Database path
DB_PATH=./data/md-crafter.db

# CORS origin
CORS_ORIGIN=http://localhost:5173

# Max versions to keep
MAX_DOCUMENT_VERSIONS=50
```

---

## API Reference

### Authentication

#### Generate Token
```http
POST /api/auth/token
Content-Type: application/json

{
  "email": "optional@email.com"
}
```

Response:
```json
{
  "success": true,
  "userId": "uuid",
  "apiToken": "xxxx-xxxx-xxxx-xxxx"
}
```

#### Validate Token
```http
POST /api/auth/validate
Content-Type: application/json

{
  "token": "xxxx-xxxx-xxxx-xxxx"
}
```

### Documents

#### List Documents
```http
GET /api/documents
Authorization: Bearer <token>
```

Response:
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "My Document",
      "content": "# Hello World",
      "language": "markdown",
      "etag": "etag-hash",
      "isCloudSynced": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Document
```http
GET /api/documents/:id
Authorization: Bearer <token>
```

#### Create Document
```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Document",
  "content": "# Hello World",
  "language": "markdown"
}
```

#### Update Document
```http
PUT /api/documents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Sync Document
```http
POST /api/documents/:id/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "New content",
  "etag": "previous-etag"
}
```

Response (conflict):
```json
{
  "success": false,
  "conflict": {
    "serverContent": "...",
    "serverEtag": "...",
    "serverTimestamp": 1234567890
  }
}
```

---

## Self-Hosting

For easiest deployment, use published Docker images (see [DOCKER.md](DOCKER.md)). For manual builds, follow the instructions below.

### Requirements

- Node.js 18+
- npm 9+

### Production Build

```bash
# Build all packages
npm run build

# Start production server
NODE_ENV=production npm run start -w @md-crafter/server
```

### Serving the Web App

The built web app is in `packages/web/dist/`. Serve with any static file server:

```bash
# Using serve
npx serve packages/web/dist

# Using nginx
# Copy dist to /var/www/html and configure nginx
```

### Docker (Example)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

RUN npm ci
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@md-crafter/server"]
```

---

## Troubleshooting

### Common Issues

#### "Failed to connect to server"

1. Check if the server is running (`npm run dev:server`)
2. Verify the port is not in use
3. Check CORS_ORIGIN matches your frontend URL

#### "Invalid API token"

1. Generate a new token
2. Make sure you're using the complete token
3. Token is case-sensitive

#### "Sync failed"

1. Check your internet connection
2. Look for conflict notifications
3. Try "Refresh Cloud Documents" in sidebar

#### Editor not loading

1. Clear browser cache
2. Check browser console for errors
3. Try a different browser

### Getting Help

- Open an issue on GitHub
- Check existing issues for solutions
- Include browser/OS info in bug reports

---

## License

MIT License - see LICENSE file for details.
