# Agent Instructions

## What Is This Project?

A mobile-first modular learning app for Hebrew-speaking students. Built with Vite + React + TypeScript. No backend, no database — everything runs in the browser. Production builds are installable PWAs.

The first module is English vocabulary and grammar practice. Future modules can cover other subjects such as Math and Science.

## Quick Start

```bash
pnpm install
pnpm run dev      # http://localhost:5959
```

Production build:

```bash
pnpm run build    # outputs to dist/
pnpm run preview  # preview production build
```

Production builds should emit `dist/site.webmanifest`, `dist/sw.js`, and Workbox assets through `vite-plugin-pwa`.

## Environment

- **Runtime**: Node.js (devcontainer uses `mcr.microsoft.com/devcontainers/typescript-node:24-trixie`)
- **Package manager**: pnpm
- **Dev server port**: 5959 (configured in `vite.config.ts` and `.devcontainer/devcontainer.json`)
- **Language**: TypeScript (strict mode)
- **No tests yet** — if adding tests, use Vitest (already compatible with Vite).

## Project Conventions

- All UI text is in **Hebrew**. The app is **RTL**.
- English text inside the app (word display, keyboard, letter slots) is explicitly set to `direction: ltr`.
- Styles are in a single `src/index.css` file using CSS custom properties. No CSS modules, no Tailwind.
- No component library — plain React components.
- State management is local React state (useState/useRef). No Redux, no Zustand.
- Navigation is state-driven in `src/core/navigation.ts`, not a router.
- App shell code lives in `src/app/`; shared behavior lives in `src/core/`; subject modules live in `src/modules/`.
- PWA manifest/service worker config lives in `vite.config.ts`; `src/main.tsx` registers the generated service worker.
- The home navbar install button text is `התקן אפליקציה`. Chromium browsers use the native install prompt; iOS falls back to Hebrew Add to Home Screen instructions.
- Progress persistence is centralized in `src/core/storage.ts`. It reads/merges `localStorage`, `sessionStorage`, and memory fallback data; do not access browser storage directly from components.

## File to Edit for English Content

`src/modules/english/data/wordGroups.json` — add English word groups, grammar-choice sentence groups, and story-cloze groups here. See format in `docs/modules/english/content.md`.

## Architecture & Detailed Docs

See:
- [docs/README.md](./docs/README.md) for the docs index
- [docs/app-spec.md](./docs/app-spec.md) for shared architecture, storage, navigation, scoring, styling, and PWA behavior
- [docs/modules/english/README.md](./docs/modules/english/README.md) for English module details
