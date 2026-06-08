# Science Content Guide

Edit Science content in:

```text
src/modules/science/data/topics.json
```

The module loads this JSON file statically, so changes are picked up by Vite HMR
during development.

## Topic Shape

Each topic has an `id`, Hebrew `title`, short `description`, mode metadata, and
exercise banks for the supported modes:

- `multipleChoice` — closed factual and comprehension questions.
- `wordBank` — Hebrew sentence completion from a closed word bank.
- `definitionChoice` — textbook terms and definitions.
- `sequenceOrder` — ordering stages in a process.
- `scenarioAnalysis` — applying concepts to real-life or animal examples.

The canonical TypeScript schema is in:

```text
src/modules/science/types.ts
```

## Final-Prep Prompt Content

Completed Science topics can unlock a `תרגול מסכם ב-ChatGPT` button. The prompt
for that button is generated from the same topic JSON, so content authors should
treat `topics.json` as both practice content and final-prep source material.

The prompt builder includes:

- Topic `title` and `description`.
- Key concepts from `definitionChoice` terms and correct definitions.
- Every `multipleChoice`, `wordBank`, `definitionChoice`, and `scenarioAnalysis`
  item with only the correct answer.
- Every `sequenceOrder` item with the `steps` array as the correct order.
- Optional `explanation` and `hint` text when present.

Write prompts, correct answers, explanations, and hints in clear Hebrew that can
stand alone outside the exercise UI. Avoid relying on distractor choices for
essential knowledge, because the final-prep prompt intentionally sends the
correct answer key rather than every wrong option.
