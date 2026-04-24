# React-Explorer: Project Documentation for AI Assistance

## Project Overview

**React-Explorer** is a cross-platform desktop file manager built with modern web technologies. It provides a dual-pane interface with advanced features like media preview, keyboard-first navigation, WSL integration, and plugin-based file system support.

**Version:** 4.0.0-rc.1
**License:** MIT
**Author:** Nicolas Ramz (nicolas.ramz@gmail.com)
**Repository:** https://github.com/warpdesign/react-explorer

### Core Philosophy
- **Plugin-based architecture** - Extensible file system support (Local, FTP, Virtual, WSL)
- **Keyboard-first UX** - All operations accessible via keyboard shortcuts
- **Cross-platform** - Works on Windows, macOS, Linux (both x64 and ARM64)
- **Performance-focused** - Efficient rendering using React virtualization
- **Fully localized** - i18next-based internationalization

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type-safe development
- **MobX 6.6.2** - State management (reactive, observable stores)
- **@mantine/core 8.x** - Modern React component library
- **@tabler/icons-react 3.x** - Icon library (Mantine's recommended icon set)
- **React DnD 14.0.5** - Drag and drop functionality
- **@tanstack/react-virtual 3.13.6** - Virtualized list rendering for performance
- **i18next 24.2.3** - Internationalization (English, French currently supported)

### Desktop Framework
- **Electron 22.3.27** - Native desktop application wrapper
  - ⚠️ **Current security concern:** Uses legacy `nodeIntegration: true` + `contextIsolation: false`

### Build System
- **Webpack 5.74.0** - Module bundler
  - Two separate targets: `electron-main` and `electron-renderer`
  - **SWC 1.3.10** - Fast TypeScript/JavaScript transpilation (replaces Babel)
  - **TerserPlugin** - Production minification
- **PostCSS** - CSS processing for Mantine
- **electron-builder 24.13.3** - Package and distribution
  - Builds for: Windows (x64, ARM64), macOS (Universal), Linux (x64, ARM64, deb/AppImage)

### Testing
- **Jest 29.3.1** - Unit testing framework
- **Cypress** (in e2e/ directory) - End-to-end testing
- **React Testing Library 16.3.0** - Component testing utilities
- **mock-fs** - File system mocking for tests

### Code Quality
- **ESLint 8.27.0** - Linting with TypeScript support
- **Prettier 2.7.1** - Code formatting
- **Husky 3.0.9** - Git hooks
- **lint-staged 10.4.2** - Pre-commit linting

---

## UI Framework: Mantine

React-Explorer uses **Mantine UI** as its component library, providing a modern, fully-featured design system with excellent TypeScript support and dark mode capabilities.

### Mantine Configuration

**PostCSS Setup:**
- `postcss.config.cjs` configures Mantine's PostCSS preset
- Includes responsive breakpoints configuration
- Required for Mantine's styling system

**CSS Organization:**
- `src/css/mantine-extensions.css` - Custom Mantine overrides
- Import Mantine core styles in main entry point
- Use Mantine's CSS modules where appropriate

**Theme Configuration:**
- Configure Mantine theme in app root (`MantineProvider`)
- Set up color scheme (light/dark mode)
- Define custom colors if needed
- Configure default component props globally

---

## Project Structure

```
react-explorer/
├── src/                          # Source code
│   ├── electron/                 # Electron main process code
│   │   ├── main.ts              # Main entry point
│   │   ├── appMenus.ts          # Native menu system
│   │   ├── remote.ts            # IPC bridge replacing @electron/remote
│   │   ├── windowSettings.ts    # Window state persistence
│   │   └── osSupport.ts         # Platform detection utilities
│   ├── gui/                      # Renderer entry point
│   │   └── index.tsx            # React app initialization
│   ├── components/               # React components
│   │   ├── common/              # Shared/common components (Mantine wrappers)
│   │   └── [feature components] # Feature-specific UI components
│   ├── state/                    # MobX stores (business logic)
│   │   ├── fileState.ts         # File operations state
│   │   ├── viewState.ts         # UI view state
│   │   └── [other stores]       # Domain-specific state
│   ├── services/                 # File system plugins & services
│   │   ├── Fs.ts                # Base FS interface
│   │   ├── FsLocal.ts           # Local file system (Node.js fs)
│   │   ├── FsFtp.ts             # FTP file system
│   │   ├── FsVirtual.ts         # In-memory virtual FS
│   │   ├── FsWsl.ts             # WSL integration (Windows)
│   │   └── FsGeneric.ts         # Plugin skeleton
│   ├── hooks/                    # React custom hooks
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript type definitions
│   ├── typings/                  # External library type declarations
│   ├── locale/                   # i18next translations
│   │   └── lang/                # Language JSON files (en.json, fr.json)
│   ├── config/                   # Configuration files
│   ├── constants/                # Application constants
│   ├── css/                      # Global styles + Mantine extensions
│   └── events/                   # Event definitions
├── e2e/                          # Cypress end-to-end tests
├── build/                        # Webpack output (development)
├── dist/                         # electron-builder output (production binaries)
├── webpack.config.ts             # Webpack configuration (dev)
├── webpack.config.production.ts  # Webpack configuration (production)
├── postcss.config.cjs            # PostCSS configuration for Mantine
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## Key Architectural Patterns

### 1. MobX State Management

React-Explorer uses MobX for reactive state management. State is organized into **observable stores** that components observe.

**Key Principles:**
- **Stores are singletons** - Instantiated once, shared across components
- **Use `@observable`** for reactive properties
- **Use `@action`** for state mutations
- **Use `@computed`** for derived values
- **Components use `observer()` HOC** to react to store changes

**Example Store Pattern:**
```typescript
import { observable, action, computed, makeObservable } from 'mobx';

class FileState {
    @observable currentPath = '/';
    @observable files: File[] = [];

    constructor() {
        makeObservable(this);
    }

    @action
    setPath(path: string) {
        this.currentPath = path;
    }

    @computed
    get fileCount() {
        return this.files.length;
    }
}
```

**Component Pattern:**
```typescript
import { observer } from 'mobx-react';

export const FileList = observer(({ fileState }: Props) => {
    return <div>{fileState.fileCount} files</div>;
});
```

### 2. File System Plugin Architecture

React-Explorer uses a **plugin-based** file system abstraction to support multiple backends.

**Base Interface:** `Fs.ts` defines the contract all plugins must implement
- `readDir()` - List directory contents
- `makedir()` - Create directory
- `delete()` - Delete file/folder
- `rename()` - Rename/move
- `size()` - Get file/folder size
- `isDir()` - Check if path is directory
- `stat()` - Get file metadata
- `join()` - Join path segments

**Implementations:**
- **FsLocal** - Local file system (Node.js `fs` module)
- **FsFtp** - FTP/FTPS support
- **FsVirtual** - In-memory virtual file system (for testing)
- **FsWsl** - Windows Subsystem for Linux integration

### 3. Electron IPC Architecture

**⚠️ SECURITY CONCERN:** Current IPC uses insecure legacy pattern.

**Current State:**
- `nodeIntegration: true` - Renderer has full Node.js access
- `contextIsolation: false` - No security boundary
- Direct imports: `import { ipcRenderer, shell, clipboard } from 'electron'`

**IPC Patterns:**
```typescript
// Main → Renderer (events)
webContents.send('exitRequest');
webContents.send('cleanup');
webContents.send('nativeTheme:updated', isDark);

// Renderer → Main (commands)
ipcMain.handle('reloadIgnoringCache', () => { /* ... */ });
ipcMain.handle('openDevTools', () => { /* ... */ });
ipcMain.handle('openTerminal', (e, path) => { /* ... */ });
```

### 4. Virtualized Rendering

Uses `@tanstack/react-virtual` for efficient rendering of large file lists.

**Why:** Rendering 10,000+ files at once would be slow. Virtualization renders only visible items.

**Pattern:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35, // Row height
});

// Render only visible rows
{virtualizer.getVirtualItems().map(virtualRow => (
    <FileRow key={virtualRow.index} file={files[virtualRow.index]} />
))}
```

---

## Development Workflow

### Initial Setup

```bash
npm install              # Install dependencies
npm run build           # Build for development (watch mode)
npx electron ./build/main.js  # Run locally
```

### Scripts

**Development:**
- `npm run build` - Webpack watch mode (rebuilds on file change)
- `npx electron ./build/main.js` - Run Electron app locally

**Testing:**
- `npm test` - Run Jest unit tests
- `npm run test:e2e` - Run Cypress end-to-end tests
- `npm run test:all` - Run all tests

**Distribution:**
- `npm run dist-all` - Build for all platforms (Windows, macOS, Linux, all architectures)
- `npm run dist-win` - Build for Windows (x64 + ARM64)
- `npm run dist-mac` - Build for macOS (Universal binary)
- `npm run dist-linux` - Build for Linux (x64 + ARM64, deb + AppImage)

---

## Coding Conventions

### TypeScript

**Strict Mode:** TypeScript is configured with strict type checking.

**Naming Conventions:**
- **PascalCase** - Components, classes, types, interfaces
- **camelCase** - Functions, variables, methods
- **UPPER_SNAKE_CASE** - Constants

**File Extensions:**
- `.tsx` - React components
- `.ts` - Non-React TypeScript
- `.spec.tsx` / `.spec.ts` - Test files (colocated with source)

### React Components

**Prefer Functional Components** with hooks over class components.

**Component Organization:**
```typescript
// 1. Imports
import React from 'react';
import { observer } from 'mobx-react';
import { Button } from '@mantine/core';

// 2. Types/Interfaces
interface Props {
    fileState: FileState;
}

// 3. Component
export const FileList = observer(({ fileState }: Props) => {
    // Hooks at top
    const [selected, setSelected] = React.useState<string | null>(null);

    // Event handlers
    const handleClick = (id: string) => {
        setSelected(id);
    };

    // Render
    return <Button onClick={() => handleClick('id')}>...</Button>;
});
```

**Exports:**
- Use **named exports** for components (not default exports)
- Makes refactoring easier (IDE support for rename)

### MobX

**Always use `makeObservable(this)`** in constructor:
```typescript
class MyStore {
    @observable data = [];

    constructor() {
        makeObservable(this); // ✅ Required in MobX 6+
    }
}
```

**Use `observer()` HOC** for components that read observables:
```typescript
export const MyComponent = observer(({ store }: Props) => {
    return <div>{store.data.length}</div>;
});
```

### Mantine Components

**Import from @mantine/core:**
```typescript
import { Button, Modal, TextInput } from '@mantine/core';
```

**Use Mantine's styling props:**
```typescript
<Button
    variant="filled"
    color="blue"
    size="md"
    leftSection={<IconPlus />}
>
    Add File
</Button>
```

**Prefer Mantine's built-in theming:**
- Use theme colors instead of custom hex codes
- Use theme spacing instead of hardcoded pixels
- Leverage `useMantineTheme()` hook when needed

### i18next Localization

**Use translation hook:**
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
    const { t } = useTranslation();
    return <Button>{t('COMMON.BUTTON.OK')}</Button>;
};
```

**Translation Keys:**
- Use UPPER_SNAKE_CASE with namespace prefixes
- Example: `COMMON.BUTTON.OK`, `FILE_VIEW.CONTEXT_MENU.COPY`

---

## Common Tasks

### Adding a New Feature

1. **Identify component location** - Is it a new component or modification?
2. **Use Mantine components** - Build with Mantine UI
3. **Create/modify MobX store** - Add state and actions
4. **Create/modify React component** - Use `observer()` if reading store
5. **Add translations** - Update all language files
6. **Wire up IPC** - If requires main process interaction
7. **Add tests** - Unit tests (Jest) and/or E2E tests (Cypress)

---

## Testing Strategy

### Unit Tests (Jest)

**Location:** Colocated with source files (e.g., `FileList.spec.tsx` next to `FileList.tsx`)

**What to Test:**
- Component rendering
- State management (MobX store actions/computed values)
- Utility functions
- File system plugin logic (with mocked fs)

**Mantine Components in Tests:**
- Wrap test components with `MantineProvider`
- Use Testing Library queries to find Mantine elements
- Test behavior, not implementation details

### E2E Tests (Cypress)

**Location:** `e2e/` directory (separate package)

**What to Test:**
- User workflows (open app, navigate folders, copy/paste files)
- Keyboard shortcuts
- Drag and drop
- Context menus
- Integration between UI and file system

---

## Guidelines for AI Assistance

### What to Do

✅ **Use Mantine components** for all new UI code
✅ **Follow Mantine patterns** - Use their styling props, theming, hooks
✅ **Read existing code patterns** before suggesting changes
✅ **Maintain consistency** with current architecture (MobX, file system plugins)
✅ **Add TypeScript types** - Never use `any` unless absolutely necessary
✅ **Write tests** for new features and bug fixes
✅ **Update i18next translations** for all user-facing text
✅ **Consider cross-platform** - Test on Windows, macOS, Linux
✅ **Follow MobX patterns** - Use `observer()`, `@observable`, `@action`, `makeObservable()`
✅ **Use async/await** for file system operations
✅ **Check Mantine docs** when unsure about component API

### What to Avoid

❌ **Don't introduce new frameworks** - Stick to React, MobX, Mantine
❌ **Don't bypass type safety** - No `as any` or `@ts-ignore` without justification
❌ **Don't add unnecessary dependencies** - Bundle size matters
❌ **Don't ignore platform differences** - Windows ≠ macOS ≠ Linux
❌ **Don't break virtualized lists** - Keep `@tanstack/react-virtual` pattern
❌ **Don't use synchronous fs operations** - Always async/await
❌ **Don't forget translations** - All UI text must be localized

---

**Document Version:** 3.0
**Last Updated:** 2026-04-20
**Maintainer:** Nicolas Ramz
