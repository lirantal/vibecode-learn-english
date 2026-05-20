# Development Guide

## Project Overview

A mobile-first web app for practicing English vocabulary and grammar. Designed for a 7th-grade Hebrew-speaking student who receives word lists and grammar worksheets from their teacher and needs to:

1. **Know the Hebrew meaning** of each English word (flashcard mode)
2. **Spell the English word** when hearing it (spelling mode with TTS + Wordle-style feedback)
3. **Connect English words to Hebrew translations** (matching mode for dedicated word groups)
4. **Choose the correct grammar word** inside English sentences (grammar-choice mode)

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
        ├── GrammarChoiceSession.tsx
        ├── MatchingSession.tsx
        ├── SpellingSession.tsx
        └── OnScreenKeyboard.tsx
```

## App Views & Navigation

Navigation is state-driven (no router library):

```
Home (pick group) → Pick Mode → Flashcard Session → Summary
                              → Spelling Session  → Summary
                  → Matching Session → Summary (for matching-only groups)
                  → Grammar Choice Session → Summary (for grammar-only groups)
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
      "exerciseType": "matching",
      "words": [
        { "en": "English word", "he": "Hebrew translation" }
      ]
    }
  ]
}
```

For grammar-choice groups:

```json
{
  "groups": [
    {
      "id": "grammar-present-simple-01",
      "title": "דקדוק — don't / doesn't",
      "exerciseType": "grammarChoice",
      "sentences": [
        {
          "prefix": "I ",
          "choices": ["don't", "doesn't"],
          "suffix": " like ice cream.",
          "correctChoice": "don't"
        }
      ]
    }
  ]
}
```

Rules:
- `id` must be unique across groups.
- `exerciseType` is optional. Omit it for standard flashcard + spelling groups; set `"matching"` for groups that should open the connection exercise only; set `"grammarChoice"` for grammar sentence groups.
- `en` is used for TTS pronunciation, spelling slots, and display on the flashcard front.
- `he` is the Hebrew meaning shown on the flashcard back.
- Multi-word phrases are supported — spaces become gaps in the spelling grid.
- Grammar-choice groups use `sentences` instead of `words`. Each sentence has `prefix`, two `choices`, `suffix`, and `correctChoice`.
- Keep grammar-choice groups to 5 sentences for the portrait mobile layout.
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

### Matching

- Available for groups with `"exerciseType": "matching"`.
- Shows English words in the left column and Hebrew translations in the right column.
- User drags from the English connector dot to the matching Hebrew translation.
- Correct connections stay visible as green lines; wrong connections flash red for 1 second and then disappear.
- Score is first-try based: a word only counts correct if the first completed drag was to the correct translation. Words with a wrong first attempt still can be connected later, but go on the "practice more" list.
- The board is designed for up to 10 words in the vertical two-column layout.

### Grammar Choice

- Available for groups with `"exerciseType": "grammarChoice"`.
- Shows 5 English sentences in a compact vertical list. Each sentence renders two inline choices as elevated button-like controls.
- English sentence content is explicitly LTR inside the RTL app shell.
- Wrong choices turn red, lock the sentence briefly for 1 second, then reset so the student can try again.
- Correct choices turn green, stay locked, and count the sentence as complete.
- Score is first-try based: a sentence only counts correct if the first selected choice was correct. Sentences missed at least once go on the "practice more" list.

## Persistence

Uses `sessionStorage` under key `vibecode-learn-english:v1`. Structure:

```typescript
{
  version: 1,
  byGroup: {
    [groupId]: {
      flashcard?: { lastRunAt, lastScoreNumerator, lastScoreDenominator, lastWeakEn[] },
      spelling?: { same shape },
      matching?: { same shape },
      grammarChoice?: { same shape }
    }
  },
  lastSelectedGroupId?: string
}
```

All read/write goes through `src/lib/storage.ts` — swap to `localStorage` there if cross-session persistence is desired.

Spelling, matching, and grammar-choice modes persist progress during the run, not just at the final summary. This means partial scores appear on the home screen even if the user navigates away mid-session via the navbar.

## Styling Conventions

- **RTL by default** — `<html dir="rtl" lang="he">`. English text elements use `direction: ltr` explicitly.
- **Mobile-first** — `100dvh`, safe-area insets, 48px minimum touch targets, single-column vertical flow.
- **Dark theme** — CSS variables in `:root` (e.g. `--bg`, `--surface`, `--primary`).
- **No CSS framework** — all styles in `src/index.css`.
- On-screen keyboard and letter grid are always `direction: ltr`.
- Grammar-choice sentences, choices, and summaries that show English sentences are explicitly `direction: ltr`.

## Home Screen Score Badges

Group cards on the home screen show color-coded score pills from the last run:
- **Green** — 80%+ correct (great)
- **Yellow** — 50–79% (needs some work)
- **Red** — below 50% (needs more practice)

Each badge shows the mode name and the fraction (e.g. "כרטיסיות 8/10").

## Key Design Decisions

1. **No router** — simple state in `App.tsx` is enough for the small set of app views.
2. **Shuffle per session** — word order is randomized each time a practice session starts.
3. **Wordle feedback** — motivates correct spelling through visual hints without giving away the answer.
4. **First-try scoring for choice modes** — matching and grammar-choice exercises let the student recover from mistakes while still marking missed items for more practice.
5. **`sessionStorage` over cookies/localStorage** — scores reset on tab close so the kid re-practices regularly. Easy to change.
6. **On-screen keyboard** — ensures the kid can practice on mobile without fighting the OS keyboard language.

## Common Tasks

| Task | How |
|------|-----|
| Add a new word group | Edit `src/data/wordGroups.json`, add object to `groups[]` |
| Add a grammar exercise | Add a group with `"exerciseType": "grammarChoice"` and 5 sentence objects in `sentences[]` |
| Change TTS voice/lang | Edit `src/lib/tts.ts` |
| Adjust weak threshold | Change `WEAK_TRY_THRESHOLD` in `SpellingSession.tsx` |
| Switch to localStorage | Change `sessionStorage` → `localStorage` in `src/lib/storage.ts` |
| Change port | Update `vite.config.ts` `server.port` and `.devcontainer/devcontainer.json` `forwardPorts` |
