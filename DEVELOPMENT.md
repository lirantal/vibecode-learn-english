# Development Guide

## Project Overview

A mobile-first web app for practicing English vocabulary. Designed for a 7th-grade Hebrew-speaking student who receives word lists from their teacher and needs to:

1. **Know the Hebrew meaning** of each English word (flashcard mode)
2. **Spell the English word** when hearing it (spelling mode with TTS + Wordle-style feedback)

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | React 19 + TypeScript               |
| Bundler    | Vite 6                              |
| Styling    | Plain CSS (variables, mobile-first) |
| TTS        | Web Speech API (`SpeechSynthesis`)  |
| Persistence| `sessionStorage` (browser-only)     |
| Package mgr| pnpm                                |

No backend. Fully static — word data ships with the bundle.

## Directory Structure

```
├── index.html              # Entry HTML (RTL, Hebrew lang)
├── package.json
├── vite.config.ts          # Dev server on port 5959, host: true
├── tsconfig.json
└── src/
    ├── main.tsx            # React root
    ├── App.tsx             # Top-level router (state-driven views)
    ├── types.ts            # Shared TypeScript types
    ├── index.css           # All styles (mobile-first, RTL)
    ├── vite-env.d.ts
    ├── data/
    │   └── wordGroups.json # THE word list file to edit
    ├── lib/
    │   ├── storage.ts      # sessionStorage read/write
    │   ├── tts.ts          # Web Speech TTS helpers
    │   └── normalize.ts    # String comparison + Wordle feedback
    └── components/
        ├── FlashcardSession.tsx
        ├── SpellingSession.tsx
        └── OnScreenKeyboard.tsx
```

## App Views & Navigation

Navigation is state-driven (no router library):

```
Home (pick group) → Pick Mode → Flashcard Session → Summary
                              → Spelling Session  → Summary
```

A persistent **navbar** at the top allows returning home from any screen.

## Adding / Editing Word Groups

Edit `src/data/wordGroups.json`. The schema:

```json
{
  "groups": [
    {
      "id": "unique-slug",
      "title": "Display title (Hebrew is fine)",
      "words": [
        { "en": "English word", "he": "Hebrew translation" }
      ]
    }
  ]
}
```

Rules:
- `id` must be unique across groups.
- `en` is used for TTS pronunciation, spelling slots, and display on the flashcard front.
- `he` is the Hebrew meaning shown on the flashcard back.
- Multi-word phrases are supported — spaces become gaps in the spelling grid.
- Vite picks up changes via HMR (no restart needed in dev).

## Practice Modes

### Flashcards

- Shows English word on front of a flip card.
- Tap/click flips to reveal Hebrew translation.
- User self-rates: "ידעתי" (knew) or "לא ידעתי" (didn't know).
- At end: summary with score and list of words to practice more.

### Spelling

- Plays the English word via TTS (`SpeechSynthesis`, `en-US`).
- Shows empty letter slots (Wordle/Scrabble style).
- User types using physical keyboard or on-screen QWERTY (A–Z only).
- On submit: Wordle-style color feedback (green = correct position, yellow = in word but wrong position, gray = not in word).
- On correct answer: all boxes flash green with a pop animation + "!נכון" text for 1.5s, then auto-advances to next word.
- Unlimited attempts per word; words needing 4+ attempts go on the "practice more" list.
- "דלג" (skip) counts as needs-practice.
- Score is saved incrementally after each word (not only at end), so partial progress shows on the home screen even if the user exits mid-session.

## Persistence

Uses `sessionStorage` under key `vibecode-learn-english:v1`. Structure:

```typescript
{
  version: 1,
  byGroup: {
    [groupId]: {
      flashcard?: { lastRunAt, lastScoreNumerator, lastScoreDenominator, lastWeakEn[] },
      spelling?: { same shape }
    }
  },
  lastSelectedGroupId?: string
}
```

All read/write goes through `src/lib/storage.ts` — swap to `localStorage` there if cross-session persistence is desired.

Spelling mode persists progress **after every word** (not just at session end). This means partial scores appear on the home screen even if the user navigates away mid-session via the navbar.

## Styling Conventions

- **RTL by default** — `<html dir="rtl" lang="he">`. English text elements use `direction: ltr` explicitly.
- **Mobile-first** — `100dvh`, safe-area insets, 48px minimum touch targets, single-column vertical flow.
- **Dark theme** — CSS variables in `:root` (e.g. `--bg`, `--surface`, `--primary`).
- **No CSS framework** — all styles in `src/index.css`.
- On-screen keyboard and letter grid are always `direction: ltr`.

## Home Screen Score Badges

Group cards on the home screen show color-coded score pills from the last run:
- **Green** — 80%+ correct (great)
- **Yellow** — 50–79% (needs some work)
- **Red** — below 50% (needs more practice)

Each badge shows the mode name and the fraction (e.g. "כרטיסיות 8/10").

## Key Design Decisions

1. **No router** — simple state in `App.tsx` is enough for 4 views.
2. **Shuffle per session** — word order is randomized each time a practice session starts.
3. **Wordle feedback** — motivates correct spelling through visual hints without giving away the answer.
4. **`sessionStorage` over cookies/localStorage** — scores reset on tab close so the kid re-practices regularly. Easy to change.
5. **On-screen keyboard** — ensures the kid can practice on mobile without fighting the OS keyboard language.

## Common Tasks

| Task | How |
|------|-----|
| Add a new word group | Edit `src/data/wordGroups.json`, add object to `groups[]` |
| Change TTS voice/lang | Edit `src/lib/tts.ts` |
| Adjust weak threshold | Change `WEAK_TRY_THRESHOLD` in `SpellingSession.tsx` |
| Switch to localStorage | Change `sessionStorage` → `localStorage` in `src/lib/storage.ts` |
| Change port | Update `vite.config.ts` `server.port` and `.devcontainer/devcontainer.json` `forwardPorts` |
