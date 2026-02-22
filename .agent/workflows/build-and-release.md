---
description: Build, package, and release the Electron desktop app
---

# Build and Release

## Development Server
```bash
npm run dev
```
Starts electron-vite dev server with hot reload.

## Type Check Only
// turbo
```bash
npm run typecheck
```

## Full Build (typecheck + compile)
```bash
npm run build
```
Runs `npm run typecheck && electron-vite build`.

## Build for Windows (.exe installer)
```bash
npm run build:win
```
This runs: `bump-version → typecheck → electron-vite build → electron-builder --win`

Output: `dist/` directory with installer.

## Build for Mac
```bash
npm run build:mac
```

## Build for Linux
```bash
npm run build:linux
```

## Notes
- Version bumping is handled by `scripts/bump-version.js` (auto-increments patch version)
- Build config is in `electron-builder.yml`
- Auto-update is configured via `electron-updater` and `dev-app-update.yml`
- Always run typecheck before building to catch errors early
