# English Module

The English module is the first learning module in the app. It teaches English
vocabulary and grammar to Hebrew-speaking students through:

- Flashcards for English-to-Hebrew meaning.
- Spelling practice with English TTS and a QWERTY keyboard.
- Translation matching.
- Grammar choice sentences.
- Story cloze noticing and fill-in practice.

## Source Files

```text
src/modules/english/
  index.tsx                  # Module registry, group list, route rendering
  types.ts                   # English content and route types
  data/wordGroups.json       # English content
  components/                # English session components
  lib/                       # English TTS, normalization, exercise totals
```

## Docs

- [Content guide](content.md)
- [Practice modes](practice-modes.md)

Shared app behavior such as navigation, storage, activity logging, PWA support,
and styling conventions is documented in [the app spec](../../app-spec.md).
