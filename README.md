# md-edit

A cloud-synced markdown and MDX editor with real-time collaboration support. Built with Monaco Editor, React, and Electron.

## Features

### Core Editor
- **Monaco Editor** - VS Code's powerful editor with syntax highlighting for 50+ languages
- **Multi-tab editing** - Work with multiple documents simultaneously
- **Command palette** - Quick access to all commands (`Ctrl+Shift+P`)
- **Live markdown preview** - Side-by-side GitHub-flavored markdown rendering with scroll sync
- **MDX support** - Full MDX editing with built-in component library
- **Diff viewer** - Compare files, versions, or unsaved changes
- **Drag and drop** - Drop files directly into the editor to open them
- **Menu bar** - Familiar File/Edit/View/Help menus with keyboard shortcuts

### Document Formats
- **Markdown (.md)** - Full GitHub-flavored Markdown support
- **MDX (.mdx)** - React components in Markdown with live preview
- **Word (.docx)** - Import and export Word documents
- **PDF** - Export to PDF with print-optimized styling
- **HTML** - Export to standalone HTML files
- **Google Docs** - Import from and export to Google Drive

### Cloud Sync
- **Selective cloud save** - Choose which documents to sync
- **Auto-sync** - Automatic background synchronization with debouncing
- **Offline support** - Work offline with automatic sync when back online
- **Conflict resolution** - Visual diff-based conflict handling
- **Version history** - Access previous versions of your documents

### Desktop App (Electron)
- **Native file access** - Open and save files anywhere on your system
- **File watching** - Detect external changes to synced files
- **Local sync mapping** - Customize where cloud documents are stored locally
- **Native menus** - Full integration with macOS, Windows, and Linux

### Themes
- **6 built-in themes** - Dark+, Light+, Monokai, Dracula, GitHub Dark, Nord
- **VS Code compatible** - Color schemes inspired by popular VS Code themes
- **Quick theme switcher** - Change themes from command palette or menu

### UI Features
- **Resizable panels** - Drag to resize sidebar and preview panes
- **Global search** - Search across all open and cloud documents (`Ctrl+Shift+F`)
- **File search** - Type `@` in command palette to search open files
- **Recent files** - Quick access to recently opened documents
- **Zen mode** - Distraction-free writing mode (`Ctrl+K Z`)
- **Split editor** - Horizontal and vertical split views
- **Status bar** - Shows sync status, line count, and more

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/md-edit.git
cd md-edit

# Install dependencies
npm install

# Build shared package
npm run build -w @md-edit/shared

# Start development servers
npm run dev
```

The web app will be available at `http://localhost:5173` and the API server at `http://localhost:3001`.

### Docker Deployment

```bash
# Standalone with SQLite
docker-compose up -d

# With PostgreSQL
docker-compose -f docker-compose.postgres.yml up -d

# With MySQL
docker-compose -f docker-compose.mysql.yml up -d
```

See [DOCKER.md](DOCKER.md) for detailed deployment options.

### Desktop App

```bash
# Build and run desktop app
npm run dev:desktop
```

## Project Structure

```
md-edit/
├── packages/
│   ├── shared/     # Shared types, utilities, and sync logic
│   ├── server/     # Express API backend
│   ├── web/        # React web application
│   └── desktop/    # Electron desktop wrapper
├── Dockerfile      # Standalone Docker image
├── Dockerfile.prod # Production Docker image
├── docker-compose*.yml
├── package.json    # Root workspace config
└── README.md
```

## Architecture

### Backend (`packages/server`)
- **Express.js** REST API with TypeScript
- **LowDB** JSON file-based database (production-ready, no compilation needed)
- **Socket.io** for real-time sync notifications
- **Token-based auth** with API keys

### Frontend (`packages/web`)
- **React 18** with TypeScript
- **Monaco Editor** for code editing
- **Zustand** for state management
- **Tailwind CSS** for styling
- **MDX** for interactive content

### Desktop (`packages/desktop`)
- **Electron 28** with context isolation
- **electron-vite** for building
- **electron-store** for local settings
- Native file system access and file watchers

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token` | Generate new API token |
| POST | `/api/auth/validate` | Validate API token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create new document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/sync` | Sync with conflict detection |
| GET | `/api/documents/:id/versions` | Get version history |
| GET | `/api/documents/:id/versions/:versionId` | Get specific version |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |
| POST | `/api/settings/reset` | Reset settings to defaults |
| GET | `/api/health` | Health check |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New document |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+W` | Close tab |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+\` | Toggle preview |
| `Ctrl+P` | Quick open / Command palette |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+F` | Global search |
| `Ctrl+Shift+C` | Copy for Word/Docs |
| `Ctrl+Shift+V` | Paste from Word/Docs |
| `Ctrl+,` | Settings |
| `Ctrl+E` | Export |
| `Ctrl+K Z` | Zen mode |
| `Ctrl+F` | Find in editor |
| `Ctrl+H` | Find and replace |

## MDX Components

md-edit includes a library of MDX components:

- `<Callout>` - Info, warning, error, success callouts
- `<Tabs>` / `<Tab>` - Tabbed content panels
- `<Accordion>` - Collapsible content sections
- `<CodeBlock>` - Syntax-highlighted code with copy button
- `<Steps>` / `<Step>` - Numbered step-by-step instructions
- `<Card>` - Styled card containers
- `<Badge>` - Inline status badges

See [MDX.md](MDX.md) for detailed documentation.

## Configuration

### Environment Variables (Server)

Create a `.env` file in `packages/server/`:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database (SQLite)
DB_FILENAME=./data/md-edit.json

# Database (PostgreSQL/MySQL - for production)
# DATABASE_URL=postgresql://user:password@host:5432/database

# CORS
CORS_ORIGIN=http://localhost:5173

# Versioning
MAX_DOCUMENT_VERSIONS=50
```

### Environment Variables (Web)

Create a `.env` file in `packages/web/`:

```bash
# Google API (optional)
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_API_KEY=your-api-key
```

## Building for Production

### Web App

```bash
npm run build
```

The built files will be in `packages/web/dist/`.

### Desktop App

```bash
# macOS
npm run package:mac -w @md-edit/desktop

# Windows
npm run package:win -w @md-edit/desktop

# Linux
npm run package:linux -w @md-edit/desktop
```

## Self-Hosting

1. Clone the repository
2. Create `.env` file in `packages/server/`
3. Run `npm install && npm run build`
4. Start the server: `npm run start -w @md-edit/server`
5. Serve `packages/web/dist` with any static file server

Or use Docker - see [DOCKER.md](DOCKER.md).

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Version History

### v2.0.0
- Menu bar with File/Edit/View/Help menus
- Word document import/export (.docx)
- Copy/Paste for Word/Google Docs
- PDF export
- Google Drive integration
- Full MDX support with component library
- Split editor views
- Docker deployment support
- Global search across documents

### v1.0.0
- Initial release
- Monaco Editor with syntax highlighting
- Cloud sync with conflict detection
- Markdown preview
- Multiple themes
- Electron desktop app

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [VS Code](https://github.com/microsoft/vscode)
- [Electron](https://www.electronjs.org/)
- [Socket.io](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [MDX](https://mdxjs.com/)
- [Mammoth](https://github.com/mwilliamson/mammoth.js)
