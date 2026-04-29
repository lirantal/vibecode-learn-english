# Agent Instructions

## What Is This Project?

A mobile-first English vocabulary practice app for Hebrew-speaking students. Built with Vite + React + TypeScript. No backend, no database — everything runs in the browser.

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
- Navigation is state-driven in `App.tsx`, not a router.

## File to Edit for Word Content

`src/data/wordGroups.json` — add groups or words here. See format in DEVELOPMENT.md.

## Architecture & Detailed Docs

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Full directory structure
- Component responsibilities
- Data model schema
- Styling conventions
- Design decisions
- Common modification tasks
