import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ScoreSnapshot } from "../../../core/types";
import type { PronounWritingGroup, PronounWritingSentence } from "../types";
import { makeScoreSnapshot } from "../../../core/score";
import { updateGroupModeStats } from "../../../core/storage";
import { useActivitySessionLogger } from "../../../core/hooks/useActivitySessionLogger";
import { answersMatch } from "../lib/normalize";
import { PRONOUN_WRITING_ITEMS_PER_RUN } from "../lib/score";

type Props = {
  group: PronounWritingGroup;
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

function sentenceText(sentence: PronounWritingSentence): string {
  return `${sentence.prefix}${sentence.target}${sentence.suffix}`.trim();
}

function sentenceWithPronoun(sentence: PronounWritingSentence): string {
  return `${sentence.prefix}${sentence.correctPronoun}${sentence.suffix}`.trim();
}

function weakItemLabel(sentence: PronounWritingSentence): string {
  return `${sentenceText(sentence)} -> ${sentenceWithPronoun(sentence)}`;
}

export default function PronounWritingSession({
  group,
  onRepeatSame,
  onChangeGroup,
  onHome,
}: Props) {
  const sentences = useMemo(
    () => shuffle(group.sentences).slice(0, group.itemsPerRun ?? PRONOUN_WRITING_ITEMS_PER_RUN),
    [group.itemsPerRun, group.sentences]
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, string>>({});
  const [wrongAnswers, setWrongAnswers] = useState<Record<number, string>>({});
  const [missedIndexes, setMissedIndexes] = useState<number[]>([]);
  const [phase, setPhase] = useState<"run" | "summary">("run");
  const wrongTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const completedRef = useRef(0);

  const missedSet = useMemo(() => new Set(missedIndexes), [missedIndexes]);
  const completedCount = Object.keys(correctAnswers).length;
  const correctFirstTryCount = sentences.length - missedIndexes.length;
  const snapshotFor = useCallback(
    (
      nextCorrectAnswers: Record<number, string>,
      nextMissedIndexes: number[]
    ): ScoreSnapshot => {
      const missed = new Set(nextMissedIndexes);
      const completedIndexes = Object.keys(nextCorrectAnswers).map(Number);
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
    moduleId: "english",
    groupId: group.id,
    groupTitle: group.title,
    mode: "pronounWriting",
    getItemCount: () => completedRef.current,
    getScoreSnapshot: () => snapshotFor(correctAnswers, missedIndexes),
  });

  useEffect(() => {
    return () => {
      Object.values(wrongTimers.current).forEach(clearTimeout);
    };
  }, []);

  const persist = useCallback(
    (nextCorrectAnswers: Record<number, string>, nextMissedIndexes: number[]) => {
      const nextCompletedCount = Object.keys(nextCorrectAnswers).length;
      const missed = new Set(nextMissedIndexes);
      const score = snapshotFor(nextCorrectAnswers, nextMissedIndexes);
      const weak = sentences
        .map((sentence, index) => (missed.has(index) ? weakItemLabel(sentence) : undefined))
        .filter((sentence): sentence is string => Boolean(sentence));

      updateGroupModeStats(
        "english",
        group.id,
        "pronounWriting",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: score.correctCount,
          lastScoreDenominator: sentences.length,
          lastWeakItems: weak,
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

  const clearWrongAnswerSoon = (sentenceIndex: number) => {
    const existingTimer = wrongTimers.current[sentenceIndex];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    wrongTimers.current[sentenceIndex] = setTimeout(() => {
      setWrongAnswers((current) => {
        const next = { ...current };
        delete next[sentenceIndex];
        return next;
      });
      delete wrongTimers.current[sentenceIndex];
    }, 1200);
  };

  const setAnswer = (sentenceIndex: number, answer: string) => {
    if (correctAnswers[sentenceIndex]) return;
    setAnswers((current) => ({
      ...current,
      [sentenceIndex]: answer,
    }));
    setWrongAnswers((current) => {
      if (!current[sentenceIndex]) return current;
      const next = { ...current };
      delete next[sentenceIndex];
      return next;
    });
  };

  const submit = (sentenceIndex: number, event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const sentence = sentences[sentenceIndex];
    const answer = answers[sentenceIndex]?.trim() ?? "";
    if (!sentence || phase !== "run" || correctAnswers[sentenceIndex] || !answer) {
      return;
    }

    if (answersMatch(answer, sentence.correctPronoun)) {
      const nextCorrectAnswers = {
        ...correctAnswers,
        [sentenceIndex]: sentence.correctPronoun,
      };
      setCorrectAnswers(nextCorrectAnswers);
      setAnswers((current) => ({
        ...current,
        [sentenceIndex]: sentence.correctPronoun,
      }));
      persist(nextCorrectAnswers, missedIndexes);
      return;
    }

    const nextMissedIndexes = missedSet.has(sentenceIndex)
      ? missedIndexes
      : [...missedIndexes, sentenceIndex];
    setMissedIndexes(nextMissedIndexes);
    persist(correctAnswers, nextMissedIndexes);
    setWrongAnswers((current) => ({
      ...current,
      [sentenceIndex]: answer,
    }));
    clearWrongAnswerSoon(sentenceIndex);
  };

  const weakList = sentences
    .map((sentence, index) => (missedSet.has(index) ? weakItemLabel(sentence) : undefined))
    .filter((sentence): sentence is string => Boolean(sentence));

  if (phase === "summary") {
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — כינויי גוף</h1>
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
            <p className="success-msg">מצוין — כל כינויי הגוף נכונים בפעם הראשונה!</p>
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
    <div className="session column pronoun-root">
      <header className="session-head">
        <p className="progress">
          כינויי גוף {completedCount} מתוך {sentences.length}
        </p>
        <h1 className="title">הקלדת כינוי גוף</h1>
        <p className="subtitle">{group.title}</p>
      </header>

      <main className="pronoun-stage grow">
        <p className="hint pronoun-hint">
          הקלד את כינוי הגוף המתאים למילה המודגשת. אפשר לכתוב באותיות גדולות או קטנות.
        </p>

        <ol className="pronoun-list">
          {sentences.map((sentence, sentenceIndex) => {
            const answer = answers[sentenceIndex] ?? "";
            const correctAnswer = correctAnswers[sentenceIndex];
            const wrongAnswer = wrongAnswers[sentenceIndex];
            const isCorrect = Boolean(correctAnswer);

            return (
              <li key={`${sentence.target}-${sentenceIndex}`} className="pronoun-card">
                <form className="pronoun-question" onSubmit={(event) => submit(sentenceIndex, event)}>
                  <p className="pronoun-sentence">
                    <span>{sentence.prefix}</span>
                    <strong className="pronoun-target">{sentence.target}</strong>
                    <span>{sentence.suffix}</span>
                  </p>

                  <div className="pronoun-answer-row">
                    <input
                      type="text"
                      className={cx(
                        "pronoun-input",
                        isCorrect && "pronoun-input--correct",
                        wrongAnswer && "pronoun-input--wrong"
                      )}
                      value={correctAnswer ?? answer}
                      disabled={isCorrect}
                      dir="ltr"
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`Pronoun for ${sentence.target}`}
                      placeholder="He / She / It"
                      onChange={(event) => setAnswer(sentenceIndex, event.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn secondary pronoun-submit"
                      disabled={isCorrect || !answer.trim()}
                    >
                      בדיקה
                    </button>
                  </div>

                  <p
                    className={cx(
                      "pronoun-feedback",
                      isCorrect && "pronoun-feedback--correct",
                      wrongAnswer && "pronoun-feedback--wrong"
                    )}
                    role="status"
                  >
                    {isCorrect ? "נכון!" : wrongAnswer ? "נסה שוב" : "\u00a0"}
                  </p>
                </form>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
