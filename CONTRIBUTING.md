# Contributing to md-crafter

Thank you for your interest in contributing to md-crafter! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/md-crafter.git
   cd md-crafter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the shared package**
   ```bash
   npm run build:shared
   ```

4. **Start development servers**
   ```bash
   # Web + Server
   npm run dev

   # Desktop
   npm run dev:desktop
   ```

## Project Structure

```
md-crafter/
├── packages/
│   ├── shared/      # Shared types, utilities, sync logic
│   ├── server/      # Express API backend
│   ├── web/         # React web application
│   └── desktop/     # Electron desktop wrapper
├── scripts/         # Build and test scripts
├── e2e/             # End-to-end tests
└── docs/            # Additional documentation
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding style (TypeScript, ESLint, Prettier)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run unit tests
   npm test

   # Run E2E tests
   npm run test:e2e

   # Check linting
   npm run lint

   # Verify all builds
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: description of your change"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code change that neither fixes a bug nor adds a feature
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Run pre-push verification**
   ```bash
   ./scripts/pre-push-check.sh
   ```
   This runs all CI checks locally to ensure your push will succeed:
   - Verifies `package-lock.json` is in sync
   - Builds all packages
   - Runs linting
   - Runs all tests
   - Builds desktop app

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Guidelines

- **Title**: Use conventional commit format
- **Description**: Explain what and why, not how
- **Tests**: Ensure all tests pass
- **Documentation**: Update relevant docs
- **Screenshots**: Include for UI changes

### Code Review

- All PRs require at least one review
- Address feedback promptly
- Keep PRs focused and reasonably sized

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types from shared package

### React

- Use functional components with hooks
- Prefer composition over inheritance
- Use Zustand for global state
- Memoize expensive computations

### CSS

- Use Tailwind CSS classes
- Use CSS variables for theming
- Follow existing naming conventions

### Testing

- **Unit tests** with Vitest and happy-dom
- **E2E tests** with Playwright (Chromium, Firefox, WebKit)
- **Testing Library** - Use `render()` return values, avoid `screen` for better reliability
- Aim for 80%+ coverage on components and utilities
- See [docs/TESTING.md](docs/TESTING.md) for detailed testing guide

## Architecture Guidelines

### Shared Package

The `packages/shared` package contains:
- TypeScript types and interfaces
- Utility functions
- Sync logic and conflict resolution

Changes here affect all other packages.

### Server Package

The `packages/server` package:
- Uses Express.js
- Supports SQLite, PostgreSQL, MySQL
- Handles authentication and document storage

### Web Package

The `packages/web` package:
- Uses React 19.2.3
- Monaco Editor for code editing
- Zustand for state management
- **Editor Context** for managing editor instances (see below)

#### Editor Context Guidelines

**DO:**
- Use `useEditorContext()` hook to access editor instances
- Use `getActiveEditor()` to get the currently focused editor
- Wrap components that use `useEditorContext()` with `MockEditorContextProvider` in tests
- Pass editor instances as parameters to store actions instead of accessing global `window` objects

**DON'T:**
- Access `window.monacoEditor`, `window.monaco`, or `window.grammarService` directly
- Store editor instances on global objects
- Access editor instances outside of React components without using the context

**Example:**
```typescript
// ✅ Good: Use Editor Context
function MyComponent() {
  const { getActiveEditor } = useEditorContext();
  const editor = getActiveEditor();
  // Use editor...
}

// ❌ Bad: Direct global access
function MyComponent() {
  const editor = (window as any).monacoEditor; // Don't do this!
}
```

**Testing:**
```typescript
// ✅ Good: Use MockEditorContextProvider
render(
  <MockEditorContextProvider primaryEditor={mockEditor} primaryMonaco={mockMonaco}>
    <MyComponent />
  </MockEditorContextProvider>
);
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed Editor Context architecture.

### Desktop Package

The `packages/desktop` package:
- Uses Electron
- Wraps the web app
- Adds native file system access

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Desktop build test
npm run test:desktop
```

### Writing Tests

See [docs/TESTING.md](docs/TESTING.md) for comprehensive testing guide.

**Quick Example:**

```typescript
// Unit test example
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    const { container } = render(<MyComponent />);
    expect(container.querySelector('[data-testid="my-component"]')).toBeTruthy();
  });
});
```

**Key Points:**
- Use `render()` return values (`getByText`, `getByRole`, `container`) instead of `screen`
- Test user-visible behavior, not implementation details
- Mock only external dependencies (APIs, file system, browser APIs)

## Documentation

- Update ../README.md for user-facing changes
- Update DESKTOP.md for desktop-specific changes
- Update DOCKER.md for deployment changes
- Add JSDoc comments for public APIs

## Releases

Releases are managed by maintainers:

1. Version bump in package.json files
2. Update docs/CHANGELOG.md
3. Create GitHub release
4. CI/CD handles building and publishing

## Getting Help

- **Issues**: Use GitHub Issues for bugs and features
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community (link TBD)

## Code of Conduct

- Be respectful and inclusive
- No harassment or discrimination
- Constructive feedback only
- Help others learn and grow

Thank you for contributing!
