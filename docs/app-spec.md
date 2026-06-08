# App Spec

## Project Overview

The app is a mobile-first learning center for Hebrew-speaking students. It is
built as a static PWA with a shared app shell and subject-specific modules. The
first module is English, which includes vocabulary and grammar practice.

There is no backend and no database. Content ships with the bundle, and progress
is stored in browser storage with fallbacks.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Styling | Plain CSS variables, mobile-first |
| PWA | `vite-plugin-pwa` + Workbox |
| Persistence | Browser storage with memory fallback |
| Package manager | pnpm |

## Source Structure

```text
src/
  app/
    App.tsx                    # App shell, navbar, install prompt, module picker
  core/
    aiStudyPrompt.ts            # ChatGPT prompt URL, clipboard, and launch helpers
    components/ActivityLogPage.tsx
    hooks/useActivitySessionLogger.ts
    navigation.ts              # History-backed state navigation
    score.ts                   # Shared score snapshots and badge tone logic
    storage.ts                 # Progress persistence and migrations
    types.ts                   # Shared app/core types
  modules/
    english/                   # English learning module
    science/                   # Science learning module
  main.tsx                     # React root + service worker registration
  index.css                    # Shared stylesheet and module style sections
```

Root configuration:

- `vite.config.ts` configures the dev server and generated PWA manifest/service worker.
- `index.html` contains Hebrew/RTL metadata and social sharing tags.
- `public/` contains favicon, install icons, Apple touch icon, and social image.

## Navigation

Navigation is state-driven and uses `history.pushState`; there is no router
library.

```text
App Home -> Module Home -> Module Route -> Session/Summary
         -> Activity Log
```

Core views are defined in `src/core/types.ts`:

- `home` — module picker.
- `activity` — shared activity log.
- `moduleHome` — a module-owned home screen, identified by `moduleId`.
- `moduleRoute` — a module-owned route payload.

Modules are responsible for validating and rendering their own routes. The app
shell only looks up the selected module and delegates rendering.

## Module Contract

A module should export a registry object from `src/modules/<module>/index.tsx`
with:

- `id`, `title`, `description`, and optional counts/metadata for the app home.
- `modeLabels` for activity log display.
- `renderHome(...)` for the module home screen.
- `renderRoute(...)` for module-specific routes and sessions.

Module code should own subject-specific data schemas, helpers, and session UI.
Core code should not import subject types such as English word groups.

## Persistence

Progress is centralized in `src/core/storage.ts`. Components and modules should
not access browser storage directly.

Current storage key:

```text
vibecode-learn:v2
```

Legacy English-only progress is read from:

```text
vibecode-learn-english:v1
```

When legacy progress is found, it is migrated into the `english` module and then
saved back to available v2 storage.

Stored shape:

```ts
{
  version: 2,
  byModule: {
    [moduleId]: {
      byGroup: {
        [groupId]: {
          [mode]: {
            lastRunAt,
            lastScoreNumerator,
            lastScoreDenominator,
            lastWeakItems,
            lastCompletedCount,
            lastTotalCount,
            lastErrorCount
          }
        }
      },
      lastSelectedGroupId
    }
  },
  activityLog: [
    { id, runAt, moduleId, groupId, groupTitle, mode, itemCount, score }
  ]
}
```

Storage reads and merges all available sources:

1. `localStorage`
2. `sessionStorage`
3. In-memory fallback

If the same module/group/mode exists in multiple stores, the newest `lastRunAt`
wins. When browser storage is writable, the app also requests persistent origin
storage via `navigator.storage.persist?.()`.

## Scoring

Core scoring uses `ScoreSnapshot`:

```ts
{
  correctCount: number,
  completedCount: number,
  totalCount: number,
  errorCount: number
}
```

Core owns normalization, score badges, and activity log display. Modules own
their exercise totals and decide which items count as weak/practice-more items.

Score badge tones:

- Empty when nothing has been completed.
- Incomplete when a run has partial progress and no errors.
- Great when all items are complete and correct.
- Weak when errors or practice-more items exist.

## Activity Log

Each session records one activity entry through
`src/core/hooks/useActivitySessionLogger.ts`. Sessions can log when completed or
when unmounted after partial progress. The shared activity log resolves labels
through each module's `modeLabels` map.

## AI Study Prep Export

The shared ChatGPT launch helper lives in `src/core/aiStudyPrompt.ts`. It builds
a `https://chatgpt.com/?q=...` URL using `URL.searchParams`, attempts to copy the
full prompt to the clipboard, and opens ChatGPT in a new tab. If the generated URL
is extremely long, it falls back to opening plain `https://chatgpt.com/` and
relies on the copied prompt.

Module-specific prompt builders should stay inside the owning module because
content schemas are module-owned. For example, Science builds its topic prompt in
`src/modules/science/lib/finalPrepPrompt.ts` and passes the generated text into
the shared `ChatGptStudyButton` component.

The feature is intentionally clipboard-first: ChatGPT URL prefill depends on the
student's browser/session state, while clipboard paste remains the reliable
fallback after login or if prefill fails.

## PWA Behavior

Production builds use `vite-plugin-pwa` in `vite.config.ts`:

- `manifestFilename: "site.webmanifest"`
- `registerType: "autoUpdate"`
- `src/main.tsx` calls `registerSW({ immediate: true })`

The source HTML should not include a static manifest link; the PWA plugin injects
it during production builds. A successful build emits `dist/site.webmanifest`,
`dist/sw.js`, and Workbox assets.

The app shell shows `התקן אפליקציה` on the home screen when the app is not
already installed/running standalone. Chromium browsers use the native install
prompt; iOS and unsupported browsers show Hebrew Add to Home Screen instructions.

## Styling Conventions

- All UI text is Hebrew and the app is RTL by default.
- English or other LTR learning content must explicitly set `direction: ltr`.
- Styles remain in `src/index.css` using CSS custom properties.
- No CSS modules, Tailwind, or component libraries.
- Keep mobile-first layout, safe-area support, and touch-friendly controls.

## Common Tasks

| Task | Where |
| --- | --- |
| Add English content | `src/modules/english/data/wordGroups.json` |
| Add English exercise docs | `docs/modules/english/` |
| Add Science content | `src/modules/science/data/topics.json` |
| Change AI study prep launch behavior | `src/core/aiStudyPrompt.ts` |
| Add a new subject module | `src/modules/<module>/` and register it in `src/app/App.tsx` |
| Change persistence | `src/core/storage.ts` |
| Change scoring primitives | `src/core/score.ts` |
| Change PWA metadata/icons | `vite.config.ts`, `index.html`, and `public/` |
| Change dev port | `vite.config.ts` and `.devcontainer/devcontainer.json` |

## Design Decisions

1. No router library: the state-driven navigation model is enough and keeps the
   PWA simple.
2. Modules own subject behavior: new subjects should not add subject-specific
   unions to core.
3. Persistence is module-aware: module IDs prevent group/mode collisions as new
   subjects are added.
4. Shared UI remains Hebrew/RTL: subject content can opt into LTR where needed.
5. Static-first architecture: no backend, database, or runtime content service.
