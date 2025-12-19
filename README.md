# md-crafter

A cloud-synced markdown and MDX editor. Built with Monaco Editor (VS Code's editor), React, and Electron.

## What is md-crafter?

md-crafter is a modern markdown editor that combines VS Code's Monaco Editor with cloud synchronization. Write markdown documents, edit MDX files with React components, and sync everything across devices. Works offline and automatically syncs when you're back online.

![md-crafter welcome screen](./docs/images/welcome-screen.png)

## Cool Features

- **VS Code Editor** - Monaco Editor with syntax highlighting (25+ languages configured)
- **MDX Support** - Full MDX editing with built-in React component library
- **Live Preview** - Side-by-side GitHub-flavored markdown rendering with scroll sync
- **Cloud Sync** - Automatic synchronization with conflict detection
- **Document Persistence** - Open documents automatically restored on app restart (like VS Code)
- **Diff View** - Compare documents side-by-side with visual diff highlighting
- **Split Editor** - View multiple documents side-by-side or top-bottom
- **Open Recent** - Quick access to recently opened files with remove functionality
- **Grammar & Spell Check** - Advanced spell checking and grammar/style checking with textlint
- **Smart Paste** - Automatically converts rich text (Word/Docs) to plaintext
- **Word & Character Count** - Real-time word and character count in status bar (including selection counts)
- **Export Options** - Export to PDF, HTML, Word (.docx), or Google Drive
- **6 Themes** - Dark+, Light+, Monokai, Dracula, GitHub Dark, Nord
- **Command Palette** - Quick access to all commands (`Ctrl+Shift+P`)
- **Zen Mode** - Distraction-free writing mode
- **Multi-tab Editing** - Work with multiple documents simultaneously

## Quick Start

### Self-Host with Docker

Pull and run the published Docker image:

```bash
# Standalone (SQLite)
docker pull ghcr.io/thtmnisamnstr/md-crafter:latest
docker run -d -p 3001:3001 \
  -v md-crafter-data:/app/data \
  ghcr.io/thtmnisamnstr/md-crafter:latest

# With PostgreSQL
docker pull ghcr.io/thtmnisamnstr/md-crafter:prod-latest
docker run -d -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  ghcr.io/thtmnisamnstr/md-crafter:prod-latest
```

Access at `http://localhost:3001`

See [docs/DOCKER.md](docs/DOCKER.md) for detailed deployment options.

### Download Desktop App

Download the latest release for your platform:

- **macOS**: [Download .dmg](https://github.com/thtmnisamnstr/md-crafter/releases/latest)
- **Windows**: [Download .exe](https://github.com/thtmnisamnstr/md-crafter/releases/latest)
- **Linux**: [Download AppImage](https://github.com/thtmnisamnstr/md-crafter/releases/latest)

See [docs/DESKTOP.md](docs/DESKTOP.md) for more information.

## Documentation

- [Complete Documentation](docs/DOCS.md) - User guide and features
- [Docker Deployment](docs/DOCKER.md) - Self-hosting guide
- [Desktop App](docs/DESKTOP.md) - Desktop app information
- [MDX Components](docs/MDX.md) - MDX component library
- [Product Roadmap](docs/ROADMAP.md) - Planned features and milestones
- [Contributing](CONTRIBUTING.md) - Development guide

## License

MIT License - see [LICENSE](LICENSE) for details.
