# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Pre-release

> **Note**: This is pre-release software. The first stable release will be v0.1.0.

### Features

#### Editor
- Monaco Editor with syntax highlighting for 50+ languages
- Multi-tab editing with drag-and-drop reordering
- Command palette (Ctrl+Shift+P)
- Live Markdown preview with GitHub-flavored Markdown
- Scroll synchronization between editor and preview
- Split editor (horizontal and vertical)
- Zen mode for distraction-free writing
- 6 built-in themes (Dark+, Light+, Monokai, Dracula, GitHub Dark, Nord)
- Resizable sidebar and preview panels

#### Menu Bar
- Complete File/Edit/View/Help menu system
- Keyboard shortcuts displayed in menu items
- Open Recent submenu with file history
- All editor actions accessible via menu
- Native system menu bar in desktop app (macOS/Windows/Linux)

#### Document Import/Export
- Import Word documents (.docx) - converts to Markdown
- Export to Word (.docx) with formatting preserved
- Export to PDF with print-optimized styling
- Export to HTML as standalone file
- Copy for Word/Google Docs (rich text to clipboard)
- Paste from Word/Google Docs (rich text to Markdown)

#### Google Drive Integration
- Import documents from Google Drive
- Export to Google Drive
- OAuth 2.0 authentication
- Helpful setup instructions when API not configured

#### MDX Support
- Full MDX editing with syntax highlighting
- Live preview with custom components
- Built-in component library:
  - `<Callout>` - Info, warning, error, success callouts
  - `<Tabs>` / `<Tab>` - Tabbed content
  - `<Accordion>` - Collapsible sections
  - `<CodeBlock>` - Syntax-highlighted code
  - `<Steps>` / `<Step>` - Numbered instructions
  - `<Card>` - Styled containers
  - `<Badge>` - Inline status badges

#### Cloud Sync
- Real-time cloud sync with conflict detection
- Offline support with sync queue
- Version history
- Diff viewer for comparing changes

#### Docker Deployment
- Standalone Dockerfile with SQLite database
- Production Dockerfile for PostgreSQL/MySQL
- Docker Compose configurations for all database options
- Health checks and environment variable configuration

#### Database Support
- SQLite adapter using sql.js (no native dependencies)
- PostgreSQL adapter with connection pooling
- MySQL adapter with connection pooling
- Automatic database type detection via DATABASE_URL
- Database abstraction layer for easy extension

#### Global Search
- Search across all open documents
- Search cloud document content
- Real-time results with context
- Keyboard navigation (arrow keys, Enter, Escape)
- Search history with recent queries

#### Desktop Application
- Electron desktop app with native file access
- Native system menu bar
- File watching for external changes
- Local sync mapping
- Platform-specific cloud sync setup (accepts API key + server URL)

#### Testing & CI/CD
- Vitest for unit testing (52 tests)
- Playwright for E2E testing
- GitHub Actions workflow
- Lint, test, build, Docker build jobs
- Pre-push verification script (`npm run pre-push`)

#### Accessibility
- ARIA labels on tabs, buttons, and navigation
- Keyboard navigation for tab bar (arrow keys, home, end)
- Screen reader support
- Focus management in modals

#### Performance
- Manual chunk splitting for Monaco, MDX, docx, pdf
- Lazy loading for modal components
- Separate React vendor chunk

---

## Planned for v0.1.0

- [ ] Stable release with full feature set
- [ ] Complete documentation
- [ ] All tests passing
- [ ] Docker images published

---

## Version History

Once released, version history will be documented here following semantic versioning:
- **0.1.x** - Initial stable release and patches
- **0.2.x** - Feature additions
- **1.0.0** - Production-ready release
