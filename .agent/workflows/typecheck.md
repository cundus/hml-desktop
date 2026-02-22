---
description: Run TypeScript type checking for the project
---

# Type Check

## Full Typecheck (Main + Renderer)
// turbo
```bash
npm run typecheck
```
This runs both `typecheck:node` and `typecheck:web` sequentially.

## Main/Preload Only (Node)
// turbo
```bash
npm run typecheck:node
```
Uses `tsconfig.node.json`. Covers `src/main/` and `src/preload/`.

## Renderer Only (Web)
// turbo
```bash
npm run typecheck:web
```
Uses `tsconfig.web.json`. Covers `src/renderer/`.

## Quick Check (no config)
// turbo
```bash
npx tsc --noEmit
```

## Notes
- Always run typecheck after making changes to service, controller, or preload files
- The `@renderer` path alias maps to `src/renderer/src/`
- Separate configs exist because main/preload use Node types while renderer uses DOM types
