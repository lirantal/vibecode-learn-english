import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WordGroup } from "../types";
import {
  answersMatch,
  normalizeEn,
  wordleFeedback,
  type LetterFeedback,
} from "../lib/normalize";
import { cancelSpeech, ensureVoicesLoaded, speakEnglish } from "../lib/tts";
import { updateGroupModeStats } from "../lib/storage";
import OnScreenKeyboard from "./OnScreenKeyboard";

/** Successful solve after this many attempts (including the correct one) → practice-more list. */
const WEAK_TRY_THRESHOLD = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initSlots(canonical: string): string[] {
  return canonical.split("").map((c) => (c === " " ? " " : ""));
}

type Props = {
  group: WordGroup;
  onRepeatSame: () => void;
  onChangeMode: () => void;
  onHome: () => void;
};

export default function SpellingSession({
  group,
  onRepeatSame,
  onChangeMode,
  onHome,
}: Props) {
  const deck = useMemo(() => shuffle(group.words), [group.words]);
  const [wordIndex, setWordIndex] = useState(0);
  const [triesThisWord, setTriesThisWord] = useState(0);
  const canonical = useMemo(
    () => normalizeEn(deck[wordIndex].en),
    [deck, wordIndex]
  );
  const [slots, setSlots] = useState(() => initSlots(normalizeEn(deck[0].en)));
  const [feedback, setFeedback] = useState<LetterFeedback[] | null>(null);
  const [weakList, setWeakList] = useState<string[]>([]);
  const [phase, setPhase] = useState<"run" | "summary">("run");

  const correctRef = useRef(0);
  const weakRef = useRef<string[]>([]);

  const word = deck[wordIndex];
  const isLast = wordIndex >= deck.length - 1;

  const filledGuess = useMemo(() => slots.join(""), [slots]);

  const allLetterSlotsFilled = useMemo(() => {
    const c = canonical.split("");
    for (let i = 0; i < c.length; i++) {
      if (c[i] === " ") continue;
      if (!slots[i] || slots[i] === " ") return false;
    }
    return true;
  }, [canonical, slots]);

  useEffect(() => {
    void ensureVoicesLoaded();
    return () => cancelSpeech();
  }, []);

  useEffect(() => {
    setSlots(initSlots(canonical));
    setTriesThisWord(0);
    setFeedback(null);
  }, [canonical]);

  const persist = useCallback(
    (weak: string[], correct: number) => {
      updateGroupModeStats(
        group.id,
        "spelling",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: correct,
          lastScoreDenominator: deck.length,
          lastWeakEn: weak,
        },
        group.id
      );
    },
    [group.id, deck.length]
  );

  const goSummary = useCallback(
    (weak: string[], correct: number) => {
      persist(weak, correct);
      setWeakList(weak);
      setPhase("summary");
    },
    [persist]
  );

  const submit = useCallback(() => {
    if (!allLetterSlotsFilled || phase !== "run") return;
    const displayEn = word.en.trim();

    if (answersMatch(filledGuess, canonical)) {
      const attempts = triesThisWord + 1;
      if (attempts >= WEAK_TRY_THRESHOLD) {
        weakRef.current = [...weakRef.current, displayEn];
      }
      correctRef.current += 1;

      if (isLast) {
        goSummary([...weakRef.current], correctRef.current);
        return;
      }
      setWordIndex((i) => i + 1);
      setFeedback(null);
      return;
    }
    setTriesThisWord((t) => t + 1);
    setFeedback(wordleFeedback(canonical, filledGuess));
  }, [
    allLetterSlotsFilled,
    phase,
    word,
    filledGuess,
    canonical,
    triesThisWord,
    isLast,
    goSummary,
  ]);

  const skipWord = useCallback(() => {
    const displayEn = word.en.trim();
    weakRef.current = [...weakRef.current, displayEn];
    if (isLast) {
      goSummary([...weakRef.current], correctRef.current);
      return;
    }
    setWordIndex((i) => i + 1);
    setFeedback(null);
  }, [word, isLast, goSummary]);

  const onLetter = useCallback(
    (ch: string) => {
      if (phase !== "run") return;
      setFeedback(null);
      const c = canonical.split("");
      const idx = c.findIndex(
        (char, i) => char !== " " && (!slots[i] || slots[i] === "")
      );
      if (idx === -1) return;
      setSlots((prev) => {
        const next = [...prev];
        next[idx] = ch;
        return next;
      });
    },
    [phase, canonical, slots]
  );

  const onBackspace = useCallback(() => {
    if (phase !== "run") return;
    setFeedback(null);
    const c = canonical.split("");
    let idx = -1;
    for (let i = c.length - 1; i >= 0; i--) {
      if (c[i] === " ") continue;
      if (slots[i] && slots[i] !== " ") {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = "";
      return next;
    });
  }, [phase, canonical, slots]);

  const handlersRef = useRef({
    submit,
    onLetter,
    onBackspace,
    allLetterSlotsFilled,
    phase,
  });
  handlersRef.current = { submit, onLetter, onBackspace, allLetterSlotsFilled, phase };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      if (h.phase !== "run") return;
      if (e.key === "Enter") {
        e.preventDefault();
        h.submit();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        h.onBackspace();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        h.onLetter(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const play = () => {
    speakEnglish(word.en);
  };

  if (phase === "summary") {
    const correctCount = correctRef.current;
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — איות</h1>
          <p className="subtitle">{group.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{correctCount}</strong> / {deck.length} נכון
          </p>
          {weakList.length > 0 ? (
            <>
              <p className="weak-title">כדאי לתרגל עוד:</p>
              <ul className="weak-list">
                {weakList.map((w, i) => (
                  <li key={`${w}-${i}`}>{w}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="success-msg">מצוין — כל המילים בלי קושי!</p>
          )}
        </div>
        <footer className="sticky-footer column gap">
          <button type="button" className="btn primary" onClick={onRepeatSame}>
            שוב אותו אימון
          </button>
          <button type="button" className="btn secondary" onClick={onChangeMode}>
            מצב אחר (כרטיסיות)
          </button>
          <button type="button" className="btn ghost" onClick={onHome}>
            בחירת קבוצה
          </button>
        </footer>
      </div>
    );
  }

  const chars = canonical.split("");

  return (
    <div className="session column spelling-root">
      <header className="session-head">
        <p className="progress">
          {wordIndex + 1} / {deck.length}
        </p>
        <h1 className="title">איות</h1>
      </header>

      <div className="spelling-top grow">
        <button type="button" className="btn primary play-btn" onClick={play}>
          השמע את המילה
        </button>
        <p className="hint">לחץ להשמעה, ואז הקלד או השתמש במקלדת למטה.</p>

        <div className="letter-grid" role="group" aria-label="Spelling slots">
          {chars.map((ch, i) => {
            if (ch === " ") {
              return (
                <span key={`sp-${i}`} className="slot space-gap" aria-hidden />
              );
            }
            const letter = slots[i] || "";
            const fb = feedback?.[i];
            const cls = [
              "slot",
              "letter",
              fb === "correct" ? "fb-correct" : "",
              fb === "present" ? "fb-present" : "",
              fb === "absent" ? "fb-absent" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span key={i} className={cls}>
                {letter.toUpperCase()}
              </span>
            );
          })}
        </div>

        {feedback && (
          <p className="hint feedback-hint">
            ירוק = מקום נכון, צהוב = באותה מילה אבל מקום אחר, אפור = לא במילה.
          </p>
        )}

        <button type="button" className="btn ghost skip-btn" onClick={skipWord}>
          דלג (נחשב כצריך תרגול)
        </button>
      </div>

      <footer className="sticky-footer spelling-footer column gap">
        <OnScreenKeyboard
          onLetter={onLetter}
          onBackspace={onBackspace}
          onEnter={submit}
          enterDisabled={!allLetterSlotsFilled}
        />
      </footer>
    </div>
  );
}
