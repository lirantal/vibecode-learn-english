# English Content Guide

Edit English content in:

```text
src/modules/english/data/wordGroups.json
```

The module loads this JSON file statically, so changes are picked up by Vite HMR
during development.

## Standard Vocabulary Groups

Omit `exerciseType` for groups that should offer both flashcard and spelling
practice.

```json
{
  "id": "sample-grade7-01",
  "title": "מילים — שבוע 1",
  "words": [
    { "en": "Away", "he": "רחוק,הרחק" },
    { "en": "Come back", "he": "לחזור" }
  ]
}
```

Rules:

- `id` must be unique within the English module.
- `title` is shown in the module group list and session summaries.
- `en` is used for TTS, spelling slots, matching, and flashcard fronts.
- `he` is shown as the Hebrew translation.
- Multi-word phrases are supported; spaces become gaps in spelling slots.

## Matching Groups

Use `exerciseType: "matching"` for translation matching only.

```json
{
  "id": "matching-food-01",
  "title": "חיבור מילים — אוכל",
  "exerciseType": "matching",
  "words": [
    { "en": "apple", "he": "תפוח" },
    { "en": "bread", "he": "לחם" }
  ]
}
```

Keep matching groups to about 10 words or fewer for the vertical two-column
mobile layout.

## Grammar Choice Groups

Use `exerciseType: "grammarChoice"` and provide `sentences` instead of `words`.

```json
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
```

Rules:

- Each sentence has `prefix`, two `choices`, `suffix`, and `correctChoice`.
- Banks can contain more than 5 sentences; each run samples 5.
- Worksheet charts can be adapted by expanding each subject/verb combination
  into a sentence item.

## Story Cloze Groups

Use `exerciseType: "storyCloze"` for a story noticing phase followed by fill-in
questions.

```json
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
```

Rules:

- `storyTitle` and `story` are displayed in the noticing phase.
- `targetWords` are the words the student must find in the story.
- `blanks` are scored fill-in items.
- `hintHe` is optional Hebrew guidance for a blank.

## Type Source

The canonical TypeScript schema is in:

```text
src/modules/english/types.ts
```
