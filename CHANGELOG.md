# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-02

### Added

#### Menu Bar
- Complete File/Edit/View/Help menu system
- Keyboard shortcuts displayed in menu items
- Open Recent submenu with file history
- All editor actions accessible via menu

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

#### Split Editor
- Horizontal split view (editor above editor)
- Vertical split view (side-by-side)
- Independent tabs in each pane
- Resizable split ratio

#### Docker Deployment
- Standalone Dockerfile with SQLite database
- Production Dockerfile for PostgreSQL/MySQL
- Docker Compose configurations for all database options
- Health checks and environment variable configuration

#### Database Multi-Backend
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

#### Testing Infrastructure
- Vitest for unit testing
- Playwright for E2E testing
- 52 unit tests for shared utilities
- E2E test specs for editor, menus, themes

#### CI/CD
- GitHub Actions workflow
- Lint, test, build, Docker build jobs
- E2E tests in CI
- Automatic release creation

### Changed

#### Architecture
- Replaced LowDB with SQLite via sql.js
- Database adapter pattern for multi-backend support
- Improved TypeScript types throughout

#### User Experience
- Enhanced keyboard shortcuts (VS Code compatible)
- Improved accessibility with ARIA labels
- Better error messages for Google API setup
- Status bar with connection and sync status

### Fixed

- Desktop build for macOS/Windows/Linux
- TypeScript strict mode compatibility
- Monaco editor initialization issues
- Split editor state management
- Desktop app black screen issue (electron-vite renderer config)
- Tailwind CSS content paths for desktop build

### Added (v2.0.1)

#### Performance Optimizations
- Manual chunk splitting for Monaco, MDX, docx, pdf
- Lazy loading for modal components
- Separate React vendor chunk
- Improved initial load time

#### Developer Experience
- Desktop build test script
- Comprehensive DESKTOP.md documentation
- CONTRIBUTING.md guide
- Welcome tab for first-run experience

#### Accessibility
- ARIA labels on tabs, buttons, and navigation
- Keyboard navigation for tab bar (arrow keys, home, end)
- Screen reader support improvements
- Focus management in modals

## [1.0.0] - 2024-11-01

### Added

- Initial release
- Monaco Editor with syntax highlighting for 50+ languages
- Multi-tab editing
- Command palette (Ctrl+Shift+P)
- Live Markdown preview with GitHub-flavored Markdown
- Scroll synchronization between editor and preview
- Cloud sync with conflict detection
- Offline support with sync queue
- Version history
- Diff viewer for comparing changes
- 6 built-in themes (Dark+, Light+, Monokai, Dracula, GitHub Dark, Nord)
- Resizable sidebar and preview panels
- Zen mode for distraction-free writing
- Electron desktop app with native file access
- File watching for external changes
- Local sync mapping

---

## Migration Guide

### From 1.0.0 to 2.0.0

1. **Database Migration**: The default database has changed from LowDB (JSON file) to SQLite. Your existing data will need to be migrated:
   - The old data file was at `./data/md-edit.json`
   - The new database is at `./data/md-edit.db`
   - A migration script is planned for a future patch release

2. **Environment Variables**: 
   - `DB_FILENAME` is now `DB_PATH`
   - Add `DATABASE_URL` for PostgreSQL/MySQL

3. **Desktop App**: 
   - Icons have been updated
   - Native dialogs now support .mdx files

4. **Docker**: 
   - Standalone image now uses SQLite instead of JSON
   - Production image supports PostgreSQL and MySQL

