# Modular Learning App

A mobile-first learning app for Hebrew-speaking students. The app is now structured as a shared learning shell with subject modules. The first module is English, with vocabulary and grammar practice.

## Features

- **Module picker** — the app home lists learning modules such as English, with room for Math, Science, and other future subjects.
- **English practice** — flashcards, spelling with TTS, translation matching, grammar choice, and story cloze exercises.
- **Score tracking** — color-coded badges persist progress per module, group, and mode.
- **Activity log** — sessions are recorded with dates, modes, item counts, and scores.
- **Installable PWA** — generated manifest, service worker caching, mobile home-screen install support, and an in-app install button.
- **Static app** — no backend or database; content and progress stay in the browser.

## Quick Start

```bash
pnpm install
pnpm run dev
```

Opens at [http://localhost:5959](http://localhost:5959).

## Social Sharing Metadata

Open Graph and Twitter preview metadata are defined in [`index.html`](index.html).
For production builds, set `VITE_SITE_URL` to the deployed origin so social
platforms receive absolute URLs for the canonical page and `/og-image.png`:

```bash
VITE_SITE_URL=https://your-domain.example pnpm run build
```

## PWA Install Support

Production builds generate a PWA manifest and service worker via [`vite-plugin-pwa`](vite.config.ts). The app can be installed to a mobile home screen from supported browsers, and the home screen shows an `התקן אפליקציה` button when the app is not already running standalone.

Android/desktop Chromium browsers can open the native install prompt. iOS Safari does not expose a programmatic install prompt, so the same button shows Hebrew instructions for using Share → Add to Home Screen.

## Adding English Content

Edit [`src/modules/english/data/wordGroups.json`](src/modules/english/data/wordGroups.json). See the [English content guide](docs/modules/english/content.md) for the schema and examples.

## Documentation

- [AGENTS.md](AGENTS.md) — quick-reference for AI agents and contributors
- [docs/README.md](docs/README.md) — documentation index
- [docs/app-spec.md](docs/app-spec.md) — shared app architecture and behavior
- [docs/modules/english/](docs/modules/english/README.md) — English module docs

## Tech

Vite + React + TypeScript with PWA generation through `vite-plugin-pwa`. No backend. All data and scores live in the browser, with progress stored through durable browser storage and fallbacks.

## License

Private project.

## Contributing

Please consult [CONTRIBUTING](./CONTRIBUTING.md) for guidelines on contributing to this project.
