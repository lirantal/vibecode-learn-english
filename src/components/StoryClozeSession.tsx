import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScoreSnapshot, StoryClozeBlank, StoryClozeGroup } from "../types";
import { makeScoreSnapshot } from "../lib/score";
import { updateGroupModeStats } from "../lib/storage";
import { useActivitySessionLogger } from "./useActivitySessionLogger";

type Props = {
  group: StoryClozeGroup;
  onRepeatSame: () => void;
  onChangeGroup: () => void;
  onHome: () => void;
};

type StoryToken = {
  text: string;
  word?: string;
};

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function tokenizeStory(story: string): StoryToken[] {
  return (story.match(/[A-Za-z']+|[^A-Za-z'\s]+|\s+/g) ?? []).map((text) => {
    if (/^[A-Za-z']+$/.test(text)) {
      return { text, word: text.toLowerCase() };
    }
    return { text };
  });
}

function sentenceWithChoice(blank: StoryClozeBlank, choice: string): string {
  return `${blank.prefix}${choice}${blank.suffix}`.trim();
}

export default function StoryClozeSession({
  group,
  onRepeatSame,
  onChangeGroup,
  onHome,
}: Props) {
  const tokens = useMemo(() => tokenizeStory(group.story), [group.story]);
  const targetWordSet = useMemo(
    () => new Set(group.targetWords.map((word) => word.toLowerCase())),
    [group.targetWords]
  );
  const targetTokenIndexes = useMemo(
    () =>
      tokens
        .map((token, index) => (token.word && targetWordSet.has(token.word) ? index : undefined))
        .filter((index): index is number => index !== undefined),
    [targetWordSet, tokens]
  );

  const [phase, setPhase] = useState<"notice" | "fill" | "summary">("notice");
  const [foundTokenIndexes, setFoundTokenIndexes] = useState<number[]>([]);
  const [wrongTokenIndexes, setWrongTokenIndexes] = useState<Record<number, true>>({});
  const [currentBlankIndex, setCurrentBlankIndex] = useState(0);
  const [correctChoices, setCorrectChoices] = useState<Record<number, string>>({});
  const [wrongChoice, setWrongChoice] = useState<string | undefined>();
  const [missedIndexes, setMissedIndexes] = useState<number[]>([]);

  const wrongStoryTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const wrongChoiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(0);

  const foundTokenSet = useMemo(() => new Set(foundTokenIndexes), [foundTokenIndexes]);
  const targetTokenSet = useMemo(() => new Set(targetTokenIndexes), [targetTokenIndexes]);
  const missedSet = useMemo(() => new Set(missedIndexes), [missedIndexes]);
  const correctFirstTryCount = group.blanks.length - missedIndexes.length;
  const currentBlank = group.blanks[currentBlankIndex];
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
        totalCount: group.blanks.length,
        errorCount: missed.size,
      });
    },
    [group.blanks.length]
  );
  const logActivitySession = useActivitySessionLogger({
    groupId: group.id,
    groupTitle: group.title,
    mode: "storyCloze",
    getItemCount: () => completedRef.current,
    getScoreSnapshot: () => snapshotFor(correctChoices, missedIndexes),
  });

  useEffect(() => {
    return () => {
      Object.values(wrongStoryTimers.current).forEach(clearTimeout);
      if (wrongChoiceTimer.current) clearTimeout(wrongChoiceTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const persist = useCallback(
    (nextCorrectChoices: Record<number, string>, nextMissedIndexes: number[]) => {
      const nextCompletedCount = Object.keys(nextCorrectChoices).length;
      const missed = new Set(nextMissedIndexes);
      const score = snapshotFor(nextCorrectChoices, nextMissedIndexes);
      const weak = group.blanks
        .map((blank, index) =>
          missed.has(index) ? sentenceWithChoice(blank, blank.correctChoice) : undefined
        )
        .filter((sentence): sentence is string => Boolean(sentence));

      updateGroupModeStats(
        group.id,
        "storyCloze",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: score.correctCount,
          lastScoreDenominator: group.blanks.length,
          lastWeakEn: weak,
          lastCompletedCount: nextCompletedCount,
          lastTotalCount: group.blanks.length,
          lastErrorCount: missed.size,
        },
        group.id
      );

      completedRef.current = nextCompletedCount;
      if (nextCompletedCount === group.blanks.length) {
        logActivitySession(nextCompletedCount, score);
        setPhase("summary");
      }
    },
    [group.blanks, group.id, logActivitySession, snapshotFor]
  );

  const clearWrongStoryTokenSoon = (tokenIndex: number) => {
    const existingTimer = wrongStoryTimers.current[tokenIndex];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    wrongStoryTimers.current[tokenIndex] = setTimeout(() => {
      setWrongTokenIndexes((current) => {
        const next = { ...current };
        delete next[tokenIndex];
        return next;
      });
      delete wrongStoryTimers.current[tokenIndex];
    }, 900);
  };

  const chooseStoryToken = (tokenIndex: number) => {
    if (phase !== "notice") return;
    if (targetTokenSet.has(tokenIndex)) {
      if (!foundTokenSet.has(tokenIndex)) {
        setFoundTokenIndexes((current) => [...current, tokenIndex]);
      }
      return;
    }

    setWrongTokenIndexes((current) => ({
      ...current,
      [tokenIndex]: true,
    }));
    clearWrongStoryTokenSoon(tokenIndex);
  };

  const clearWrongChoiceSoon = () => {
    if (wrongChoiceTimer.current) {
      clearTimeout(wrongChoiceTimer.current);
    }
    wrongChoiceTimer.current = setTimeout(() => {
      setWrongChoice(undefined);
      wrongChoiceTimer.current = null;
    }, 1000);
  };

  const chooseBlankChoice = (choice: string) => {
    const blank = currentBlank;
    if (!blank || phase !== "fill" || wrongChoice || correctChoices[currentBlankIndex]) {
      return;
    }

    if (choice === blank.correctChoice) {
      const nextCorrectChoices = {
        ...correctChoices,
        [currentBlankIndex]: choice,
      };
      setCorrectChoices(nextCorrectChoices);
      persist(nextCorrectChoices, missedIndexes);

      if (Object.keys(nextCorrectChoices).length < group.blanks.length) {
        advanceTimer.current = setTimeout(() => {
          setCurrentBlankIndex((index) => index + 1);
        }, 850);
      }
      return;
    }

    const nextMissedIndexes = missedSet.has(currentBlankIndex)
      ? missedIndexes
      : [...missedIndexes, currentBlankIndex];
    setMissedIndexes(nextMissedIndexes);
    persist(correctChoices, nextMissedIndexes);
    setWrongChoice(choice);
    clearWrongChoiceSoon();
  };

  const weakList = group.blanks
    .map((blank, index) =>
      missedSet.has(index) ? sentenceWithChoice(blank, blank.correctChoice) : undefined
    )
    .filter((sentence): sentence is string => Boolean(sentence));

  if (phase === "summary") {
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — סיפור והשלמה</h1>
          <p className="subtitle">{group.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{correctFirstTryCount}</strong> / {group.blanks.length} נכון בניסיון ראשון
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
            <p className="success-msg">מצוין — כל ההשלמות נכונות בפעם הראשונה!</p>
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

  if (phase === "fill" && currentBlank) {
    const correctChoice = correctChoices[currentBlankIndex];
    const isLocked = Boolean(correctChoice || wrongChoice);

    return (
      <div className="session column story-root">
        <header className="session-head">
          <p className="progress">
            השלמה {currentBlankIndex + 1} מתוך {group.blanks.length}
          </p>
          <h1 className="title">השלמת מילת שייכות</h1>
          <p className="subtitle">{group.title}</p>
        </header>

        <main className="story-fill-stage grow">
          <p className="hint story-hint">
            בחר את מילת השייכות הנכונה לפי מי שהדבר שייך לו.
          </p>

          <section className="story-fill-card">
            <p className="story-fill-sentence">
              <span>{currentBlank.prefix}</span>
              <span className="story-blank" aria-label="מקום להשלמה">
                ___
              </span>
              <span>{currentBlank.suffix}</span>
            </p>
            {currentBlank.hintHe && <p className="story-fill-hint">{currentBlank.hintHe}</p>}
            <div className="story-choice-bank" role="group" aria-label="אפשרויות תשובה">
              {currentBlank.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={cx(
                    "grammar-choice story-choice",
                    correctChoice === choice && "grammar-choice--correct",
                    wrongChoice === choice && "grammar-choice--wrong"
                  )}
                  disabled={isLocked}
                  onClick={() => chooseBlankChoice(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const allTargetsFound = foundTokenIndexes.length === targetTokenIndexes.length;

  return (
    <div className="session column story-root">
      <header className="session-head">
        <p className="progress">
          מצאת {foundTokenIndexes.length} מתוך {targetTokenIndexes.length}
        </p>
        <h1 className="title">מציאת מילות שייכות</h1>
        <p className="subtitle">{group.title}</p>
      </header>

      <main className="story-stage grow">
        <p className="hint story-hint">
          קרא את הסיפור ולחץ על מילות השייכות באנגלית, למשל my, her, our.
        </p>

        <article className="story-card">
          <h2 className="story-title">{group.storyTitle}</h2>
          <p className="story-text">
            {tokens.map((token, index) => {
              if (!token.word) {
                return <span key={`${token.text}-${index}`}>{token.text}</span>;
              }

              const isTarget = targetTokenSet.has(index);
              const isFound = foundTokenSet.has(index);
              const isWrong = wrongTokenIndexes[index];

              return (
                <button
                  key={`${token.text}-${index}`}
                  type="button"
                  className={cx(
                    "story-word",
                    isFound && "story-word--found",
                    isWrong && "story-word--wrong"
                  )}
                  disabled={isFound}
                  aria-label={isTarget ? `מילת שייכות: ${token.text}` : token.text}
                  onClick={() => chooseStoryToken(index)}
                >
                  {token.text}
                </button>
              );
            })}
          </p>
        </article>
      </main>

      <footer className="sticky-footer column gap">
        <button
          type="button"
          className="btn primary"
          disabled={!allTargetsFound}
          onClick={() => setPhase("fill")}
        >
          המשך להשלמות
        </button>
      </footer>
    </div>
  );
}
