import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GrammarChoiceGroup, GrammarChoiceSentence, ScoreSnapshot } from "../types";
import { GRAMMAR_CHOICE_ITEMS_PER_RUN, makeScoreSnapshot } from "../lib/score";
import { updateGroupModeStats } from "../lib/storage";
import { useActivitySessionLogger } from "./useActivitySessionLogger";

type Props = {
  group: GrammarChoiceGroup;
  onRepeatSame: () => void;
  onChangeGroup: () => void;
  onHome: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function sentenceWithChoice(sentence: GrammarChoiceSentence, choice: string): string {
  return `${sentence.prefix}${choice}${sentence.suffix}`.trim();
}

export default function GrammarChoiceSession({
  group,
  onRepeatSame,
  onChangeGroup,
  onHome,
}: Props) {
  const sentences = useMemo(
    () => shuffle(group.sentences).slice(0, GRAMMAR_CHOICE_ITEMS_PER_RUN),
    [group.sentences]
  );
  const [correctChoices, setCorrectChoices] = useState<Record<number, string>>({});
  const [wrongChoices, setWrongChoices] = useState<Record<number, string>>({});
  const [missedIndexes, setMissedIndexes] = useState<number[]>([]);
  const [phase, setPhase] = useState<"run" | "summary">("run");
  const wrongTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const completedRef = useRef(0);

  const missedSet = useMemo(() => new Set(missedIndexes), [missedIndexes]);
  const completedCount = Object.keys(correctChoices).length;
  const correctFirstTryCount = sentences.length - missedIndexes.length;
  const snapshotFor = useCallback(
    (
      nextCorrectChoices: Record<number, string>,
      nextMissedIndexes: number[]
    ): ScoreSnapshot => {
      const missed = new Set(nextMissedIndexes);
      const completedIndexes = Object.keys(nextCorrectChoices).map(Number);
      return makeScoreSnapshot({
        correctCount: completedIndexes.filter((index) => !missed.has(index)).length,
        completedCount: completedIndexes.length,
        totalCount: sentences.length,
        errorCount: missed.size,
      });
    },
    [sentences.length]
  );
  const logActivitySession = useActivitySessionLogger({
    groupId: group.id,
    groupTitle: group.title,
    mode: "grammarChoice",
    getItemCount: () => completedRef.current,
    getScoreSnapshot: () => snapshotFor(correctChoices, missedIndexes),
  });

  useEffect(() => {
    return () => {
      Object.values(wrongTimers.current).forEach(clearTimeout);
    };
  }, []);

  const persist = useCallback(
    (nextCorrectChoices: Record<number, string>, nextMissedIndexes: number[]) => {
      const nextCompletedCount = Object.keys(nextCorrectChoices).length;
      const missed = new Set(nextMissedIndexes);
      const score = snapshotFor(nextCorrectChoices, nextMissedIndexes);
      const weak = sentences
        .map((sentence, index) =>
          missed.has(index)
            ? sentenceWithChoice(sentence, sentence.correctChoice)
            : undefined
        )
        .filter((sentence): sentence is string => Boolean(sentence));

      updateGroupModeStats(
        group.id,
        "grammarChoice",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: score.correctCount,
          lastScoreDenominator: sentences.length,
          lastWeakEn: weak,
          lastCompletedCount: nextCompletedCount,
          lastTotalCount: sentences.length,
          lastErrorCount: missed.size,
        },
        group.id
      );

      completedRef.current = nextCompletedCount;
      if (nextCompletedCount === sentences.length) {
        logActivitySession(nextCompletedCount, score);
        setPhase("summary");
      }
    },
    [group.id, logActivitySession, sentences, snapshotFor]
  );

  const clearWrongChoiceSoon = (sentenceIndex: number) => {
    const existingTimer = wrongTimers.current[sentenceIndex];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    wrongTimers.current[sentenceIndex] = setTimeout(() => {
      setWrongChoices((current) => {
        const next = { ...current };
        delete next[sentenceIndex];
        return next;
      });
      delete wrongTimers.current[sentenceIndex];
    }, 1000);
  };

  const choose = (sentenceIndex: number, choice: string) => {
    const sentence = sentences[sentenceIndex];
    if (
      !sentence ||
      phase !== "run" ||
      correctChoices[sentenceIndex] ||
      wrongChoices[sentenceIndex]
    ) {
      return;
    }

    if (choice === sentence.correctChoice) {
      const nextCorrectChoices = {
        ...correctChoices,
        [sentenceIndex]: choice,
      };
      setCorrectChoices(nextCorrectChoices);
      persist(nextCorrectChoices, missedIndexes);
      return;
    }

    const nextMissedIndexes = missedSet.has(sentenceIndex)
      ? missedIndexes
      : [...missedIndexes, sentenceIndex];
    setMissedIndexes(nextMissedIndexes);
    persist(correctChoices, nextMissedIndexes);
    setWrongChoices((current) => ({
      ...current,
      [sentenceIndex]: choice,
    }));
    clearWrongChoiceSoon(sentenceIndex);
  };

  const weakList = sentences
    .map((sentence, index) =>
      missedSet.has(index)
        ? sentenceWithChoice(sentence, sentence.correctChoice)
        : undefined
    )
    .filter((sentence): sentence is string => Boolean(sentence));

  if (phase === "summary") {
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — דקדוק</h1>
          <p className="subtitle">{group.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{correctFirstTryCount}</strong> / {sentences.length} נכון בניסיון ראשון
          </p>
          {weakList.length > 0 ? (
            <>
              <p className="weak-title">כדאי לתרגל עוד:</p>
              <ul className="weak-list">
                {weakList.map((sentence, i) => (
                  <li key={`${sentence}-${i}`}>{sentence}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="success-msg">מצוין — כל המשפטים נכונים בפעם הראשונה!</p>
          )}
        </div>
        <footer className="sticky-footer column gap">
          <button type="button" className="btn primary" onClick={onRepeatSame}>
            שוב אותו אימון
          </button>
          <button type="button" className="btn secondary" onClick={onChangeGroup}>
            בחירת קבוצה אחרת
          </button>
          <button type="button" className="btn ghost" onClick={onHome}>
            תפריט ראשי
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="session column grammar-root">
      <header className="session-head">
        <p className="progress">
          דקדוק {completedCount} מתוך {sentences.length}
        </p>
        <h1 className="title">בחירת מילת דקדוק</h1>
        <p className="subtitle">{group.title}</p>
      </header>

      <main className="grammar-stage grow">
        <p className="hint grammar-hint">
          בחר את המילה הנכונה בכל משפט. תשובה נכונה נשארת בירוק.
        </p>

        <ol className="grammar-list">
          {sentences.map((sentence, sentenceIndex) => {
            const correctChoice = correctChoices[sentenceIndex];
            const wrongChoice = wrongChoices[sentenceIndex];
            const isLocked = Boolean(correctChoice || wrongChoice);

            return (
              <li key={`${sentence.prefix}-${sentenceIndex}`} className="grammar-card">
                <p className="grammar-sentence">
                  <span>{sentence.prefix}</span>
                  <span className="grammar-choices" role="group" aria-label="אפשרויות תשובה">
                    {sentence.choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className={cx(
                          "grammar-choice",
                          correctChoice === choice && "grammar-choice--correct",
                          wrongChoice === choice && "grammar-choice--wrong"
                        )}
                        disabled={isLocked}
                        onClick={() => choose(sentenceIndex, choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </span>
                  <span>{sentence.suffix}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
