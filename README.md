# English Vocabulary Practice

A mobile-first web app for Hebrew-speaking students to practice English vocabulary through flashcards and spelling exercises.

## Features

- **Flashcards** — see the English word, tap to reveal the Hebrew translation, self-rate your knowledge
- **Spelling** — hear the word via text-to-speech, type it out with Wordle-style feedback
- **Score tracking** — color-coded badges show your progress per word group
- **On-screen QWERTY keyboard** — practice on mobile without switching OS language
- **Extensible word lists** — add new groups by editing a single JSON file

## Quick Start

```bash
pnpm install
pnpm run dev
```

Opens at [http://localhost:5959](http://localhost:5959).

## Adding Words

Edit [`src/data/wordGroups.json`](src/data/wordGroups.json):

```json
{
  "id": "week-2",
  "title": "מילים — שבוע 2",
  "words": [
    { "en": "believe", "he": "להאמין" }
  ]
}
```

Changes are picked up instantly via hot-reload.

## Documentation

- [AGENTS.md](AGENTS.md) — quick-reference for AI agents and contributors
- [DEVELOPMENT.md](DEVELOPMENT.md) — architecture, components, styling conventions, and common tasks

## Tech

Vite + React + TypeScript. No backend. All data and scores live in the browser.

## License

Private project.
