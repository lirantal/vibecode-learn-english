# Development Guide

## Project Overview

A mobile-first web app for practicing English vocabulary and grammar. Designed for a 7th-grade Hebrew-speaking student who receives word lists and grammar worksheets from their teacher and needs to:

1. **Know the Hebrew meaning** of each English word (flashcard mode)
2. **Spell the English word** when hearing it (spelling mode with TTS + Wordle-style feedback)
3. **Connect English words to Hebrew translations** (matching mode for dedicated word groups)
4. **Choose the correct grammar word** inside English sentences (grammar-choice mode)
5. **Find grammar words in a story and complete blanks from context** (story-cloze mode)

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | React 19 + TypeScript               |
| Bundler    | Vite 6                              |
| Styling    | Plain CSS (variables, mobile-first) |
| TTS        | Web Speech API (`SpeechSynthesis`)  |
| PWA        | `vite-plugin-pwa` + Workbox         |
| Persistence| Browser storage with fallbacks      |
| Package mgr| pnpm                                |

No backend. Fully static — word data ships with the bundle, and production builds emit installable PWA assets.

## Directory Structure

```
├── index.html              # Entry HTML (RTL, Hebrew lang, SEO/social metadata)
├── package.json
├── vite.config.ts          # Dev server + generated PWA manifest/service worker
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── icon-192.png        # PWA install icon
│   ├── icon-512.png        # PWA install icon
│   └── og-image.png        # Social sharing preview
└── src/
    ├── main.tsx            # React root + service worker registration
    ├── App.tsx             # Top-level router + install prompt UI
    ├── types.ts            # Shared TypeScript types
    ├── index.css           # All styles (mobile-first, RTL)
    ├── vite-env.d.ts
    ├── data/
    │   └── wordGroups.json # THE word list file to edit
    ├── lib/
    │   ├── storage.ts      # Progress persistence + fallbacks
    │   ├── tts.ts          # Web Speech TTS helpers
    │   └── normalize.ts    # String comparison + Wordle feedback
    └── components/
        ├── FlashcardSession.tsx
        ├── GrammarChoiceSession.tsx
        ├── MatchingSession.tsx
        ├── SpellingSession.tsx
        ├── StoryClozeSession.tsx
        └── OnScreenKeyboard.tsx
```

## App Views & Navigation

Navigation is state-driven (no router library):

```
Home (pick group) → Pick Mode → Flashcard Session → Summary
                              → Spelling Session  → Summary
                  → Matching Session → Summary (for matching-only groups)
                  → Grammar Choice Session → Summary (for grammar-only groups)
                  → Story Cloze Session → Summary (for story-cloze groups)
```

A persistent **navbar** at the top allows returning home from any screen.

On the home screen, the navbar also shows `התקן אפליקציה` when the app is not already installed/running standalone. Supported Chromium browsers use the native PWA install prompt. iOS Safari and unsupported browsers fall back to Hebrew instructions for adding the app to the home screen manually.

## PWA Behavior

PWA support is generated during production builds with `vite-plugin-pwa` in `vite.config.ts`:

- `manifestFilename: "site.webmanifest"` emits the install manifest at build time.
- `registerType: "autoUpdate"` keeps the service worker updated.
- `src/main.tsx` calls `registerSW({ immediate: true })`.
- Manifest metadata is Hebrew/RTL and uses `display: "standalone"`.
- Required install icons live in `public/icon-192.png` and `public/icon-512.png`; favicon and Apple touch icons are also included.

The source HTML should not include a static manifest link. The PWA plugin injects the manifest link into built `index.html`, which avoids duplicate manifest tags.

Use `pnpm run build` to verify PWA generation. A successful production build should emit `dist/site.webmanifest`, `dist/sw.js`, and Workbox assets.

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

For story-cloze groups:

```json
{
  "groups": [
    {
      "id": "possessives-my-day-01",
      "title": "מילות שייכות — My day",
      "exerciseType": "storyCloze",
      "storyTitle": "My day",
      "story": "Every morning I wake up...",
      "targetWords": ["my", "her", "its", "our", "their"],
      "blanks": [
        {
          "prefix": "I live in a big house. ",
          "suffix": " house is nice.",
          "choices": ["My", "Your", "His", "Her", "Its", "Our", "Their"],
          "correctChoice": "My",
          "hintHe": "הבית שייך לי."
        }
      ]
    }
  ]
}
```

Rules:
- `id` must be unique across groups.
- `exerciseType` is optional. Omit it for standard flashcard + spelling groups; set `"matching"` for groups that should open the connection exercise only; set `"grammarChoice"` for grammar sentence groups; set `"storyCloze"` for story + fill-in groups.
- `en` is used for TTS pronunciation, spelling slots, and display on the flashcard front.
- `he` is the Hebrew meaning shown on the flashcard back.
- Multi-word phrases are supported — spaces become gaps in the spelling grid.
- Grammar-choice groups use `sentences` instead of `words`. Each sentence has `prefix`, two `choices`, `suffix`, and `correctChoice`.
- Grammar-choice banks can contain more than 5 sentences, but each run samples 5 sentences for the portrait mobile layout.
- Chart-style grammar worksheets can be adapted by expanding each subject + verb phrase combination into a `sentences[]` item.
- Story-cloze groups use `story`, `targetWords`, and `blanks` instead of `words`. The story phase asks the student to find every occurrence of the target words in the story; the fill-in phase scores the blanks by first try.
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
- Samples 5 English sentences from the bank and shows them in a compact vertical list. Each sentence renders two inline choices as elevated button-like controls.
- English sentence content is explicitly LTR inside the RTL app shell.
- Wrong choices turn red, lock the sentence briefly for 1 second, then reset so the student can try again.
- Correct choices turn green, stay locked, and count the sentence as complete.
- Score is first-try based: a sentence only counts correct if the first selected choice was correct. Sentences missed at least once go on the "practice more" list.

### Story Cloze

- Available for groups with `"exerciseType": "storyCloze"`.
- Starts with an English story. The student taps target grammar words in the story, such as possessive adjectives.
- Found target words stay green; wrong story taps briefly flash red. The story phase is guided noticing practice and does not affect the final score.
- The fill-in phase shows one sentence at a time with a choice bank. English story and sentence content are explicitly LTR inside the RTL app shell.
- Wrong choices turn red, lock the item briefly for 1 second, then reset so the student can try again.
- Correct choices turn green, then the session advances to the next blank.
- Score is first-try based: a blank only counts correct if the first selected choice was correct. Blanks missed at least once go on the "practice more" list.

## Persistence

Progress is stored under key `vibecode-learn-english:v1`. All access goes through `src/lib/storage.ts`; components should not call browser storage APIs directly.

The storage helper prefers durable browser storage but reads from every supported location so old or fallback progress is not missed:

1. `localStorage` for cross-session progress.
2. `sessionStorage` as a migration source and fallback.
3. In-memory storage as a last resort when browser storage is unavailable or blocked.

When progress is loaded, stores are merged by group and practice mode. If the same mode exists in multiple stores, the record with the newest `lastRunAt` wins. The merged result is then saved back to every available storage area, which migrates older session-only progress forward.

When browser storage is writable, `storage.ts` also requests persistent origin storage via `navigator.storage.persist?.()`. Browsers may deny or ignore this request, so the app must still work with the local/session/memory fallback chain.

Stored structure:

```typescript
{
  version: 1,
  byGroup: {
    [groupId]: {
      flashcard?: { lastRunAt, lastScoreNumerator, lastScoreDenominator, lastWeakEn[] },
      spelling?: { same shape },
      matching?: { same shape },
      grammarChoice?: { same shape },
      storyCloze?: { same shape }
    }
  },
  activityLog?: [
    { id, runAt, groupId, groupTitle, mode, itemCount }
  ],
  lastSelectedGroupId?: string
}
```

Spelling, matching, grammar-choice, and story-cloze modes persist progress during the run, not just at the final summary. This means partial scores appear on the home screen even if the user navigates away mid-session via the navbar.

Activity logging is also centralized in `storage.ts`. Each practice session records one activity entry with the local run time, exercise mode, group title, and number of completed items; partial sessions are logged when leaving a session after at least one completed item.

## Styling Conventions

- **RTL by default** — `<html dir="rtl" lang="he">`. English text elements use `direction: ltr` explicitly.
- **Mobile-first** — `100dvh`, safe-area insets, 48px minimum touch targets, single-column vertical flow.
- **Dark theme** — CSS variables in `:root` (e.g. `--bg`, `--surface`, `--primary`).
- **No CSS framework** — all styles in `src/index.css`.
- On-screen keyboard and letter grid are always `direction: ltr`.
- Grammar-choice sentences, choices, and summaries that show English sentences are explicitly `direction: ltr`.
- Story-cloze story text, fill-in sentences, choice banks, and summaries that show English sentences are explicitly `direction: ltr`.

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
4. **First-try scoring for choice modes** — matching, grammar-choice, and story-cloze exercises let the student recover from mistakes while still marking missed items for more practice.
5. **Installable PWA** — the app is still static/no-backend, but production builds can be installed to a mobile home screen and cached by a service worker.
6. **Durable progress with fallbacks** — prefer `localStorage`, read/migrate old `sessionStorage`, and keep an in-memory fallback for restricted browsers.
7. **On-screen keyboard** — ensures the kid can practice on mobile without fighting the OS keyboard language.

## Common Tasks

| Task | How |
|------|-----|
| Add a new word group | Edit `src/data/wordGroups.json`, add object to `groups[]` |
| Add a grammar exercise | Add a group with `"exerciseType": "grammarChoice"` and 5 sentence objects in `sentences[]` |
| Add a story cloze exercise | Add a group with `"exerciseType": "storyCloze"`, `story`, `targetWords`, and `blanks[]` |
| Change TTS voice/lang | Edit `src/lib/tts.ts` |
| Adjust weak threshold | Change `WEAK_TRY_THRESHOLD` in `SpellingSession.tsx` |
| Change progress storage behavior | Edit `src/lib/storage.ts`; keep reads/writes centralized there |
| Change PWA metadata/icons | Edit `vite.config.ts` manifest settings and assets in `public/` |
| Change port | Update `vite.config.ts` `server.port` and `.devcontainer/devcontainer.json` `forwardPorts` |
