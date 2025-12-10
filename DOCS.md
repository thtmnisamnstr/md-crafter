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

- **Sidebar toggle**: Show/hide sidebar
- **Online/Offline**: Network status
- **Syncing enabled**: Cloud sync status
- **Language**: Current file type
- **Lines/Chars**: Document statistics
- **Preview**: Toggle markdown preview
- **Unsaved**: Indicates unsaved changes

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

### Drag and Drop

Drop files directly into the editor:

- Supported: `.md`, `.txt`, `.js`, `.ts`, `.json`, `.html`, `.css`, `.py`, etc.
- Files open in new tabs
- Multiple files can be dropped at once

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New document |
| `Ctrl+S` | Save |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+P` | Quick open |
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
| `Ctrl+F` | Find |
| `Ctrl+H` | Find and replace |
| `Ctrl+G` | Go to line |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+/` | Toggle comment |

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
| Font Size | Editor font size in pixels | 14 |
| Tab Size | Number of spaces per tab | 2 |
| Word Wrap | Wrap long lines | On |
| Line Numbers | Show line numbers | On |
| Minimap | Show minimap | On |
| Auto Sync | Automatically sync cloud documents | On |

### Server Configuration

Create `.env` in `packages/server/`:

```bash
# Port
PORT=3001

# Database path
DB_FILENAME=./data/md-crafter.json

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
FROM node:18-alpine

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

