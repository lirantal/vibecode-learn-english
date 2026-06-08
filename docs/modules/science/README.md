# Science Module

The Science module teaches Hebrew-speaking sixth-grade students with short,
closed-answer exercises. The first topic is `מערכת העצבים`.

## Source Files

```text
src/modules/science/
  index.tsx                # Module registry, topic list, route rendering
  types.ts                 # Science content and route types
  data/topics.json         # Science topic content
  components/              # Science session components
  lib/                     # Science exercise totals
```

Shared behavior such as navigation, storage, score badges, activity logging, PWA
support, and styling conventions is documented in [the app spec](../../app-spec.md).
