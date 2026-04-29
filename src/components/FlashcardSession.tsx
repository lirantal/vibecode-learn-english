import { useCallback, useMemo, useState } from "react";
import type { WordGroup } from "../types";
import { updateGroupModeStats } from "../lib/storage";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Props = {
  group: WordGroup;
  onRepeatSame: () => void;
  onChangeMode: () => void;
  onHome: () => void;
};

export default function FlashcardSession({
  group,
  onRepeatSame,
  onChangeMode,
  onHome,
}: Props) {
  const deck = useMemo(() => shuffle(group.words), [group.words]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [needMore, setNeedMore] = useState<string[]>([]);
  const [phase, setPhase] = useState<"run" | "summary">("run");

  const current = deck[index];
  const isLast = index >= deck.length - 1;

  const persist = useCallback(
    (weak: string[], known: number) => {
      updateGroupModeStats(
        group.id,
        "flashcard",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: known,
          lastScoreDenominator: deck.length,
          lastWeakEn: weak,
        },
        group.id
      );
    },
    [group.id, deck.length]
  );

  const finishCard = (rating: "know" | "more") => {
    const en = current.en;
    const addWeak = rating === "more";

    if (isLast) {
      const weak = addWeak ? [...needMore, en] : [...needMore];
      const known = deck.length - weak.length;
      persist(weak, known);
      setNeedMore(weak);
      setPhase("summary");
      return;
    }

    if (addWeak) {
      setNeedMore((m) => [...m, en]);
    }
    setIndex((i) => i + 1);
    setFlipped(false);
  };

  if (phase === "summary") {
    const known = deck.length - needMore.length;
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — כרטיסיות</h1>
          <p className="subtitle">{group.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{known}</strong> / {deck.length} ידעתי
          </p>
          {needMore.length > 0 ? (
            <>
              <p className="weak-title">כדאי לתרגל עוד:</p>
              <ul className="weak-list">
                {needMore.map((w, i) => (
                  <li key={`${w}-${i}`}>{w}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="success-msg">מעולה — כל המילים ברורות!</p>
          )}
        </div>
        <footer className="sticky-footer column gap">
          <button type="button" className="btn primary" onClick={onRepeatSame}>
            שוב אותו אימון
          </button>
          <button type="button" className="btn secondary" onClick={onChangeMode}>
            מצב אחר (איות)
          </button>
          <button type="button" className="btn ghost" onClick={onHome}>
            בחירת קבוצה
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="session column">
      <header className="session-head">
        <p className="progress">
          {index + 1} / {deck.length}
        </p>
        <h1 className="title">כרטיסיות</h1>
      </header>

      <div className="grow flex-center">
        <button
          type="button"
          className={`flashcard ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Show English" : "Show Hebrew"}
        >
          <span className="flashcard-inner">
            <span className="flashcard-face front">
              <span className="flashcard-label">English</span>
              <span className="flashcard-word">{current.en}</span>
            </span>
            <span className="flashcard-face back">
              <span className="flashcard-label">עברית</span>
              <span className="flashcard-word he">{current.he}</span>
            </span>
          </span>
        </button>
        <p className="hint tap-hint">
          {flipped ? "בחר למטה — האם ידעת?" : "לחץ להפוך את הכרטיס"}
        </p>
      </div>

      {flipped && (
        <footer className="sticky-footer row gap">
          <button
            type="button"
            className="btn flex1 success"
            onClick={() => finishCard("know")}
          >
            יודע
          </button>
          <button
            type="button"
            className="btn flex1 warn"
            onClick={() => finishCard("more")}
          >
            צריך עוד
          </button>
        </footer>
      )}
    </div>
  );
}
