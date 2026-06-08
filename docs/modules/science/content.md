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
