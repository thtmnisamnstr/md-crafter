# Desktop App Development

This document provides comprehensive instructions for developing, building, and distributing the md-crafter desktop application.

## Overview

The desktop app is built with:
- **Electron 28** - Cross-platform desktop framework
- **electron-vite** - Fast build tooling for Electron
- **electron-builder** - Packaging and distribution
- **electron-store** - Persistent local storage
- **electron-updater** - Auto-update support

## Downloading Pre-built Executables

Pre-built executables are available on [GitHub Releases](https://github.com/thtmnisamnstr/md-crafter/releases).

### Available Formats

**macOS:**
- `.dmg` - Disk image installer (recommended)
- `.zip` - Unpackaged application bundle

**Windows:**
- `.exe` (NSIS) - Installer with setup wizard (recommended)
- `.exe` (portable) - Portable executable, no installation required

**Linux:**
- `.AppImage` - Universal Linux application (recommended)
- `.deb` - Debian/Ubuntu package

### Installation

1. Visit [GitHub Releases](https://github.com/thtmnisamnstr/md-crafter/releases)
2. Download the appropriate file for your platform
3. Follow platform-specific installation:
   - **macOS**: Open `.dmg` and drag to Applications folder
   - **Windows**: Run `.exe` installer or extract portable `.exe`
   - **Linux**: Make AppImage executable (`chmod +x md-crafter.AppImage`) or install `.deb` package

### Development Build

For building from source, see [Development](#development) section below.

## Prerequisites

### All Platforms
- Node.js 18+
- npm 9+

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

### Windows
- Visual Studio Build Tools
- Python 3.x (for node-gyp)

### Linux
```bash
# Debian/Ubuntu
sudo apt-get install build-essential rpm

# Fedora
sudo dnf install rpm-build
```

## Development

### Starting Development Mode

```bash
# From project root
npm run dev:desktop
```

This will:
1. Build the shared package
2. Start electron-vite in development mode
3. Launch the Electron app with hot reload

The renderer dev server runs on port 5174 (or next available port).

### Development Architecture

```
packages/desktop/
├── src/
│   ├── main/           # Main process (Node.js)
│   │   └── index.ts    # App lifecycle, IPC handlers, menus
│   └── preload/        # Preload scripts (bridge)
│       └── index.ts    # Exposes safe APIs to renderer
├── resources/          # App icons and assets
├── dist/               # Built output
│   ├── main/           # Compiled main process
│   ├── preload/        # Compiled preload
│   └── renderer/       # Web app (from packages/web)
└── release/            # Packaged apps
```

### IPC Communication

The desktop app uses Electron's IPC for secure communication:

```typescript
// Main process (src/main/index.ts)
ipcMain.handle('file:read', async (event, filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  return { success: true, content };
});

// Preload (src/preload/index.ts)
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('file:read', path),
});

// Renderer (web app)
const result = await window.electronAPI.readFile('/path/to/file');
```

### Available IPC Handlers

| Handler | Description |
|---------|-------------|
| `dialog:open-file` | Open native file picker |
| `dialog:save-as` | Open native save dialog |
| `dialog:select-folder` | Open folder picker |
| `file:read` | Read file contents |
| `file:write` | Write file contents |
| `file:exists` | Check if file exists |
| `file:watch` | Start watching file for changes |
| `file:unwatch` | Stop watching file |
| `store:get` | Get value from electron-store |
| `store:set` | Set value in electron-store |
| `sync:get-mapping` | Get cloud-to-local mapping |
| `sync:set-mapping` | Set cloud-to-local mapping |
| `sync:remove-mapping` | Remove cloud-to-local mapping |

## Building

### Development Build

```bash
npm run build:desktop
```

This creates unpackaged builds in `packages/desktop/dist/`.

### Production Packages

```bash
# macOS
npm run package:desktop:mac

# Windows
npm run package:desktop:win

# Linux
npm run package:desktop:linux

# All platforms (from macOS)
npm run package:desktop
```

Output is placed in `packages/desktop/release/`.

### Build Configuration

The build is configured in `packages/desktop/package.json`:

```json
{
  "build": {
    "appId": "com.mdedit.app",
    "productName": "md-crafter",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    },
    "fileAssociations": [
      { "ext": "md", "name": "Markdown Document" },
      { "ext": "mdx", "name": "MDX Document" }
    ]
  }
}
```

## Code Signing

### macOS

For distribution outside the Mac App Store:

1. Obtain a Developer ID certificate from Apple
2. Add to Keychain
3. Set environment variables:

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
npm run package:desktop:mac
```

For notarization (macOS 10.15+):

```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### Windows

For EV code signing:

```bash
export WIN_CSC_LINK="/path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="password"
npm run package:desktop:win
```

## Auto-Updates

The app includes electron-updater for auto-updates.

### Configuration

1. Create releases on GitHub
2. Attach built assets to the release
3. The app will check for updates on startup

### Update Server

For private update servers, configure in `electron-builder.yml`:

```yaml
publish:
  provider: generic
  url: https://your-update-server.com/releases
```

## Debugging

### Main Process

```bash
# Start with debugging enabled
npm run dev:desktop -- --inspect
```

Then attach Chrome DevTools to `chrome://inspect`.

### Renderer Process

The renderer DevTools are enabled in development:
- `View > Toggle Developer Tools` or `Cmd/Ctrl+Shift+I`

### Logging

Logs are stored in:
- macOS: `~/Library/Logs/md-crafter/`
- Windows: `%APPDATA%/md-crafter/logs/`
- Linux: `~/.config/md-crafter/logs/`

## File Associations

The app registers as a handler for:
- `.md` - Markdown files
- `.mdx` - MDX files

To register file associations after installation:

**macOS**: Handled automatically by the app bundle

**Windows**: Handled by NSIS installer

**Linux**: Add to `~/.local/share/applications/`:
```desktop
[Desktop Entry]
Type=Application
Name=md-crafter
Exec=/path/to/md-crafter %F
MimeType=text/markdown;text/mdx;
```

## Troubleshooting

### Black Screen on Launch

1. **Check web package build**: Ensure `packages/web/dist` exists
2. **Clear dist**: `rm -rf packages/desktop/dist`
3. **Rebuild**: `npm run build:desktop`

### UI Appears Unstyled (CSS Not Loading)

If the app shows raw HTML without styles (menu items stacked vertically, no colors):

1. **Check Tailwind content paths**: `packages/web/tailwind.config.js` must use absolute paths:
   ```javascript
   import { dirname, resolve } from 'path';
   import { fileURLToPath } from 'url';
   const __dirname = dirname(fileURLToPath(import.meta.url));
   
   export default {
     content: [
       resolve(__dirname, './index.html'),
       resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
     ],
     // ...
   };
   ```

2. **Check postcss.config.js exists**: Ensure `packages/web/postcss.config.js` exists:
   ```javascript
   export default {
     plugins: {
       tailwindcss: {
         config: resolve(__dirname, 'tailwind.config.js'),
       },
       autoprefixer: {},
     },
   };
   ```

3. **Check electron.vite.config.ts**: Ensure the `css.postcss` option points to the web package:
   ```typescript
   renderer: {
     // ...
     css: {
       postcss: webPackagePath,
     },
   }
   ```

4. **Clean rebuild**: `rm -rf packages/desktop/dist && npm run build:desktop`

### App Won't Start

1. **Check logs**: See logging section above
2. **Run from terminal**: See error output
3. **Check permissions**: macOS may require Security approval

### Auto-Update Fails

1. **Check network**: Ensure update server is reachable
2. **Check signatures**: Ensure builds are properly signed
3. **Check version**: Version must be higher than current

### Native Module Issues

If you encounter native module errors:

```bash
# Rebuild native modules for Electron
npm run postinstall
# or
npx electron-rebuild
```

## Performance Tips

1. **Lazy load heavy modules**: Import dynamically
2. **Use worker threads**: For CPU-intensive tasks
3. **Minimize IPC calls**: Batch operations where possible
4. **Profile with DevTools**: Use Performance tab

## Security Considerations

1. **Context Isolation**: Enabled by default
2. **Node Integration**: Disabled in renderer
3. **Preload Scripts**: Only expose necessary APIs
4. **Content Security Policy**: Configured in HTML

```javascript
// Good - controlled API exposure
contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('file:read', path),
});

// Bad - exposing entire ipcRenderer
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
```

## Contributing

When contributing to the desktop app:

1. Test on all platforms if possible
2. Follow Electron security best practices
3. Update this documentation for new features
4. Add tests for new IPC handlers

