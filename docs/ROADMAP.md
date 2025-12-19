# md-crafter Product Roadmap

## Overview

This document outlines planned features and improvements for md-crafter. Features are organized by release milestone and priority.

---

## v0.1.0 - Stable Release (Current Focus)

### Goals
- [ ] All existing features fully functional and tested
- [ ] Complete documentation
- [ ] All tests passing (unit + E2E)
- [ ] Docker images published to registry
- [ ] Desktop app installers for macOS/Windows/Linux

---

## v0.1.1 - Document Chest & Media Support

### Document Chest (Enhanced Cloud Documents)
> *Replaces current "Cloud Documents" with a more robust local-first approach*

- [ ] Implement persistent local "Document Chest" storage
- [ ] Store documents with all attachments (images, media) in the chest
- [ ] Add **Save to Document Chest** action in File menu and command palette
- [ ] Add **Delete from Document Chest** action with confirmation
- [ ] Sync documents between Document Chest and external file paths
  - [ ] Detect when document exists in both locations
  - [ ] Keep changes in sync across both locations
  - [ ] Handle conflict resolution when both change
- [ ] Optional cloud sync for Document Chest contents
- [ ] Document Chest browser/manager UI in sidebar

### Image & Media Handling
> *Native support for images and media in markdown documents*

- [ ] Render image URLs automatically in markdown preview
- [ ] Support image paste from clipboard
  - [ ] Save pasted images to document cache/storage
  - [ ] Auto-insert markdown image syntax
  - [ ] Display in preview immediately
- [ ] Support image drag-and-drop insertion
- [ ] Store all document images in Document Chest when saving
  - [ ] Handle URL-referenced images (download and store)
  - [ ] Handle pasted images
  - [ ] Handle embedded base64 images
- [ ] Persist images across tab changes and sessions
- [ ] Add option to embed images directly in markdown (base64)
- [ ] Render embedded base64 images correctly in preview
- [ ] Image resize handles in preview
- [ ] Image alt-text and caption editing

---

## v0.2.0 - Collaboration & Offline

### Real-Time Collaboration
> *Infrastructure exists: WebSocket cursor/selection/presence events already implemented*

- [ ] Show other users' cursors with name labels and colors
- [ ] Display real-time selection highlights from collaborators
- [ ] Presence indicators (who's viewing the document)
- [ ] User avatars in sidebar/tab bar
- [ ] "Share document" feature with permission levels (view/edit)
- [ ] Collaborative editing with operational transformation (OT) or CRDT

### Offline-First Web App
> *Mentioned in ARCHITECTURE.md as future consideration*

- [ ] Service Worker for offline web app functionality
- [ ] IndexedDB local storage for documents
- [ ] Background sync when connection restored
- [ ] Offline indicator with sync queue status
- [ ] Progressive Web App (PWA) manifest

### Version History UI
> *Backend already stores versions*

- [ ] Version history sidebar panel
- [ ] Visual diff between any two versions
- [ ] Restore previous version with confirmation
- [ ] Named snapshots/bookmarks

---

## v0.2.1 - Cascading/Hybrid Search

### Advanced Search Infrastructure
> *Intelligent search combining multiple retrieval strategies*

- [ ] **Keyword Search (FTS5)**
  - [ ] Implement SQLite FTS5 full-text search index
  - [ ] Index document titles, content, and metadata
  - [ ] Support phrase matching and boolean operators
  - [ ] Retrieve top lexical matches efficiently

- [ ] **Semantic Search (sqlite-vec + BGE embeddings)**
  - [ ] Integrate sqlite-vec extension for vector similarity
  - [ ] Generate embeddings using BGE-small-en-v1.5 model
  - [ ] Store document embeddings in vector index
  - [ ] Retrieve top semantic matches by cosine similarity
  - [ ] Incremental embedding updates on document changes

- [ ] **Hybrid Retrieval Pipeline**
  - [ ] Combine keyword and semantic search results
  - [ ] Merge and deduplicate candidate sets
  - [ ] Configurable weights for lexical vs. semantic scores

- [ ] **Cross-Encoder Reranking**
  - [ ] Integrate jina-reranker-v1-tiny-en as reranker
  - [ ] Rerank combined candidate set by relevance
  - [ ] Produce final ranked list ordered by cross-encoder score
  - [ ] Return top K results with metadata

- [ ] **Search API & UI**
  - [ ] Search API endpoint with configurable parameters
  - [ ] Enhanced search modal with result previews
  - [ ] Search result snippets with match highlighting
  - [ ] Filter by document type, date, tags
  - [ ] Search history and saved searches

---

## v0.2.2 - Enhanced MDX & Components

### Custom MDX Components
> *Listed in MDX.md "Coming Soon"*

- [ ] User-defined component library
- [ ] Component definition editor/wizard
- [ ] Import components from npm packages
- [ ] Live component preview while editing
- [ ] Component props documentation

### Additional Built-in Components
- [ ] `<Mermaid>` - Mermaid diagram support
- [ ] `<Math>` - LaTeX math rendering (KaTeX)
- [ ] `<Video>` - Embedded video player
- [ ] `<Image>` - Enhanced image with lightbox
- [ ] `<Table>` - Enhanced sortable/filterable tables
- [ ] `<Chart>` - Simple chart visualizations

### Export Enhancements
> *Listed in MDX.md "Coming Soon"*

- [ ] Export MDX to static HTML with embedded styles
- [ ] Export to Markdown (strip MDX components)
- [ ] Export to EPUB for e-readers
- [ ] Batch export multiple documents

---

## v0.3.0 - Plugin System

### Plugin Architecture
> *Mentioned in ARCHITECTURE.md as future consideration*

- [ ] Plugin API specification
- [ ] Plugin marketplace/registry
- [ ] Core plugin types:
  - Editor extensions (new commands, keybindings)
  - Preview renderers (custom blocks)
  - Export formats
  - Language integrations
- [ ] Plugin settings UI
- [ ] Plugin sandboxing for security

### First-Party Plugins
- [ ] GitHub/GitLab integration (commit, push, PR)
- [ ] AI writing assistant (grammar suggestions, completions)
- [ ] Image hosting integration (Imgur, Cloudinary)
- [ ] Notion import/export
- [ ] Obsidian vault sync

---

## Future Considerations (Backlog)

### Nice to Have
- [ ] Document templates library
- [ ] Presentation mode (slides from markdown)
- [ ] Footnotes and citations (academic writing)
- [ ] Multi-language spell check
- [ ] Document analytics (reading time, complexity)
- [ ] Table of contents generation
- [ ] Document linking and backlinks
- [ ] Tags and categories system

### Community Requested
*Track feature requests from users here*

---

## Technical Debt & Improvements

### Code Quality
- [ ] Increase test coverage to 80%+
- [ ] Add integration tests for sync flows
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (WCAG 2.1 AA)

### Developer Experience
- [ ] Storybook for component documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Contributing guide improvements
- [ ] Development environment setup scripts

---

## How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup. Feature requests and PRs welcome!

### Prioritization Criteria
1. **Impact**: How many users benefit?
2. **Effort**: Development complexity
3. **Strategic**: Alignment with product vision
4. **Dependencies**: What needs to be built first?

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for released features.

