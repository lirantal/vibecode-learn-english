# English Practice Modes

## Flashcards

- Shows the English word on the front of a flip card.
- Tap/click flips to reveal the Hebrew translation.
- The student self-rates with `ידעתי` or `לא ידעתי`.
- The summary shows the score and words to practice more.

## Spelling

- Plays the English word with the Web Speech API.
- Shows empty letter slots for the normalized English answer.
- Supports physical keyboard input and the on-screen QWERTY keyboard.
- Uses Wordle-style feedback: correct position, present elsewhere, or absent.
- Correct answers flash success and auto-advance.
- Unlimited attempts are allowed.
- `דלג` marks the item as practice-more.
- Words solved in 4+ attempts are also marked practice-more.
- Progress is saved after each completed word, not only at the summary.

## Matching

- Available for groups with `exerciseType: "matching"`.
- Shows English words and Hebrew translations in two columns.
- The student drags from the English connector dot to the matching Hebrew item.
- Correct connections stay visible as green lines.
- Wrong connections flash red and disappear.
- Scoring is first-try based: a word missed on the first completed drag can
  still be connected later, but remains in the practice-more list.

## Grammar Choice

- Available for groups with `exerciseType: "grammarChoice"`.
- Samples 5 sentences from the bank each run.
- Shows two inline choices inside each English sentence.
- English sentence content is explicitly LTR inside the RTL app shell.
- Wrong choices turn red briefly and then reset.
- Correct choices turn green and lock.
- Scoring is first-try based.

## Story Cloze

- Available for groups with `exerciseType: "storyCloze"`.
- Starts with an English story and asks the student to find target grammar words.
- Found target words stay green; wrong story taps briefly flash red.
- The story phase is guided noticing practice and does not affect the score.
- The fill-in phase shows one sentence at a time with a choice bank.
- English story text, fill-in sentences, choices, and summaries are explicitly
  LTR inside the RTL app shell.
- Scoring is first-try based for blanks.

## Shared Session Behavior

- Every scored mode stores a `ScoreSnapshot` through `src/core/storage.ts`.
- Activity logging is handled through `useActivitySessionLogger`.
- Partial sessions are logged when the student leaves after completing at least
  one item.
- Weak/practice-more items are stored as `lastWeakItems` in shared progress.
