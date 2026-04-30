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
    (weak: string[], known: number, total: number) => {
      updateGroupModeStats(
        group.id,
        "flashcard",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: known,
          lastScoreDenominator: total,
          lastWeakEn: weak,
        },
        group.id
      );
    },
    [group.id]
  );

  const finishCard = (rating: "know" | "more") => {
    const en = current.en;
    const addWeak = rating === "more";
    const newWeak = addWeak ? [...needMore, en] : [...needMore];
    const wordsSoFar = index + 1;
    const known = wordsSoFar - newWeak.length;

    persist(newWeak, known, wordsSoFar);

    if (isLast) {
      setNeedMore(newWeak);
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
          מילה {index + 1} מתוך {deck.length}
        </p>
        <h1 className="title">כרטיסיות</h1>
      </header>

      <div className="grow flex-center">
        <div
          className={`fc-card ${flipped ? "fc-card--flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          aria-label={flipped ? "חזרה לאנגלית" : "הראה תרגום בעברית"}
        >
          <div className="fc-card__inner">
            <div className="fc-card__face fc-card__front">
              <p className="fc-card__label">English</p>
              <p className="fc-card__word">{current.en}</p>
            </div>
            <div className="fc-card__face fc-card__back">
              <p className="fc-card__label">תרגום לעברית</p>
              <p className="fc-card__word fc-card__word--he">{current.he}</p>
            </div>
          </div>
        </div>
        <p className="hint tap-hint">
          {flipped
            ? "ידעת את התשובה? סמנו למטה"
            : "לחץ על הכרטיס לראות את התרגום"}
        </p>
      </div>

      {flipped && (
        <footer className="sticky-footer row rating-footer">
          <button
            type="button"
            className="btn success"
            onClick={() => finishCard("know")}
          >
            ידעתי ✓
          </button>
          <button
            type="button"
            className="btn warn"
            onClick={() => finishCard("more")}
          >
            לא ידעתי ✗
          </button>
        </footer>
      )}
    </div>
  );
}
