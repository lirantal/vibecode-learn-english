import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScoreSnapshot } from "../../../core/types";
import { makeScoreSnapshot } from "../../../core/score";
import { updateGroupModeStats } from "../../../core/storage";
import { useActivitySessionLogger } from "../../../core/hooks/useActivitySessionLogger";
import { itemsForMode } from "../lib/score";
import type {
  ScienceChoiceItem,
  ScienceDefinitionItem,
  SciencePracticeMode,
  ScienceScenarioItem,
  ScienceSequenceItem,
  ScienceTopic,
  ScienceWordBankItem,
} from "../types";

type SciencePracticeItem =
  | ScienceChoiceItem
  | ScienceWordBankItem
  | ScienceDefinitionItem
  | ScienceSequenceItem
  | ScienceScenarioItem;

type Props = {
  topic: ScienceTopic;
  mode: SciencePracticeMode;
  modeLabel: string;
  onRepeatSame: () => void;
  onChangeTopic: () => void;
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

function isWordBankItem(item: SciencePracticeItem): item is ScienceWordBankItem {
  return "prefix" in item && "suffix" in item;
}

function isDefinitionItem(item: SciencePracticeItem): item is ScienceDefinitionItem {
  return "term" in item;
}

function isSequenceItem(item: SciencePracticeItem): item is ScienceSequenceItem {
  return "steps" in item;
}

function isScenarioItem(item: SciencePracticeItem): item is ScienceScenarioItem {
  return "scenario" in item;
}

function promptForItem(item: SciencePracticeItem): string {
  if (isWordBankItem(item)) return `${item.prefix}___${item.suffix}`;
  if (isDefinitionItem(item)) return `${item.term}: ${item.prompt}`;
  if (isScenarioItem(item)) return item.prompt;
  return item.prompt;
}

function weakLabelForItem(item: SciencePracticeItem): string {
  if (isWordBankItem(item)) return `${item.prefix}${item.correctChoice}${item.suffix}`;
  if (isDefinitionItem(item)) return `${item.term}: ${item.correctChoice}`;
  if (isSequenceItem(item)) return item.prompt;
  if (isScenarioItem(item)) return `${item.scenario} ${item.prompt}`;
  return item.prompt;
}

function choicesForItem(item: SciencePracticeItem): string[] {
  if (isSequenceItem(item)) return item.steps;
  return item.choices;
}

function correctChoiceForItem(item: SciencePracticeItem): string | undefined {
  if (isSequenceItem(item)) return undefined;
  return item.correctChoice;
}

function explanationForItem(item: SciencePracticeItem): string | undefined {
  return "explanation" in item ? item.explanation : undefined;
}

export default function SciencePracticeSession({
  topic,
  mode,
  modeLabel,
  onRepeatSame,
  onChangeTopic,
  onHome,
}: Props) {
  const items = useMemo(() => {
    const modeItems = itemsForMode(topic, mode) as SciencePracticeItem[];
    return shuffle(modeItems);
  }, [mode, topic]);
  const choiceOrders = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, shuffle(choicesForItem(item))])
      ) as Record<string, string[]>,
    [items]
  );
  const [correctItems, setCorrectItems] = useState<Record<string, true>>({});
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [wrongChoices, setWrongChoices] = useState<Record<string, string>>({});
  const [sequenceSelections, setSequenceSelections] = useState<Record<string, string[]>>({});
  const [wrongSequences, setWrongSequences] = useState<Record<string, true>>({});
  const [phase, setPhase] = useState<"run" | "summary">("run");
  const wrongTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const completedRef = useRef(0);

  const missedSet = useMemo(() => new Set(missedIds), [missedIds]);
  const completedCount = Object.keys(correctItems).length;
  const correctFirstTryCount = items.length - missedIds.length;
  const snapshotFor = useCallback(
    (nextCorrectItems: Record<string, true>, nextMissedIds: string[]): ScoreSnapshot => {
      const missed = new Set(nextMissedIds);
      const completedIds = Object.keys(nextCorrectItems);
      return makeScoreSnapshot({
        correctCount: completedIds.filter((id) => !missed.has(id)).length,
        completedCount: completedIds.length,
        totalCount: items.length,
        errorCount: missed.size,
      });
    },
    [items.length]
  );
  const logActivitySession = useActivitySessionLogger({
    moduleId: "science",
    groupId: topic.id,
    groupTitle: topic.title,
    mode,
    getItemCount: () => completedRef.current,
    getScoreSnapshot: () => snapshotFor(correctItems, missedIds),
  });

  useEffect(() => {
    return () => {
      Object.values(wrongTimers.current).forEach(clearTimeout);
    };
  }, []);

  const persist = useCallback(
    (nextCorrectItems: Record<string, true>, nextMissedIds: string[]) => {
      const nextCompletedCount = Object.keys(nextCorrectItems).length;
      const missed = new Set(nextMissedIds);
      const score = snapshotFor(nextCorrectItems, nextMissedIds);
      const weak = items
        .map((item) => (missed.has(item.id) ? weakLabelForItem(item) : undefined))
        .filter((item): item is string => Boolean(item));

      updateGroupModeStats(
        "science",
        topic.id,
        mode,
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: score.correctCount,
          lastScoreDenominator: items.length,
          lastWeakItems: weak,
          lastCompletedCount: nextCompletedCount,
          lastTotalCount: items.length,
          lastErrorCount: missed.size,
        },
        topic.id
      );

      completedRef.current = nextCompletedCount;
      if (nextCompletedCount === items.length) {
        logActivitySession(nextCompletedCount, score);
        setPhase("summary");
      }
    },
    [items, logActivitySession, mode, snapshotFor, topic.id]
  );

  const markMissed = (itemId: string): string[] => {
    if (missedSet.has(itemId)) return missedIds;
    return [...missedIds, itemId];
  };

  const clearWrongSoon = (itemId: string, resetSequence = false) => {
    const existingTimer = wrongTimers.current[itemId];
    if (existingTimer) clearTimeout(existingTimer);

    wrongTimers.current[itemId] = setTimeout(() => {
      setWrongChoices((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setWrongSequences((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      if (resetSequence) {
        setSequenceSelections((current) => ({ ...current, [itemId]: [] }));
      }
      delete wrongTimers.current[itemId];
    }, 1050);
  };

  const chooseAnswer = (item: SciencePracticeItem, choice: string) => {
    const correctChoice = correctChoiceForItem(item);
    if (
      phase !== "run" ||
      !correctChoice ||
      correctItems[item.id] ||
      wrongChoices[item.id]
    ) {
      return;
    }

    if (choice === correctChoice) {
      const nextCorrectItems = {
        ...correctItems,
        [item.id]: true,
      } as Record<string, true>;
      setCorrectItems(nextCorrectItems);
      persist(nextCorrectItems, missedIds);
      return;
    }

    const nextMissedIds = markMissed(item.id);
    setMissedIds(nextMissedIds);
    persist(correctItems, nextMissedIds);
    setWrongChoices((current) => ({ ...current, [item.id]: choice }));
    clearWrongSoon(item.id);
  };

  const selectSequenceStep = (item: ScienceSequenceItem, step: string) => {
    if (phase !== "run" || correctItems[item.id] || wrongSequences[item.id]) return;
    const current = sequenceSelections[item.id] ?? [];
    if (current.includes(step)) return;
    setSequenceSelections((next) => ({ ...next, [item.id]: [...current, step] }));
  };

  const removeSequenceStep = (itemId: string, step: string) => {
    if (correctItems[itemId] || wrongSequences[itemId]) return;
    const current = sequenceSelections[itemId] ?? [];
    setSequenceSelections((next) => ({
      ...next,
      [itemId]: current.filter((selectedStep) => selectedStep !== step),
    }));
  };

  const checkSequence = (item: ScienceSequenceItem) => {
    const selected = sequenceSelections[item.id] ?? [];
    if (
      phase !== "run" ||
      correctItems[item.id] ||
      wrongSequences[item.id] ||
      selected.length !== item.steps.length
    ) {
      return;
    }

    const isCorrect = item.steps.every((step, index) => selected[index] === step);
    if (isCorrect) {
      const nextCorrectItems = {
        ...correctItems,
        [item.id]: true,
      } as Record<string, true>;
      setCorrectItems(nextCorrectItems);
      persist(nextCorrectItems, missedIds);
      return;
    }

    const nextMissedIds = markMissed(item.id);
    setMissedIds(nextMissedIds);
    persist(correctItems, nextMissedIds);
    setWrongSequences((current) => ({ ...current, [item.id]: true }));
    clearWrongSoon(item.id, true);
  };

  const weakList = items
    .map((item) => (missedSet.has(item.id) ? weakLabelForItem(item) : undefined))
    .filter((item): item is string => Boolean(item));

  if (phase === "summary") {
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — {modeLabel}</h1>
          <p className="subtitle">{topic.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{correctFirstTryCount}</strong> / {items.length} נכון בניסיון ראשון
          </p>
          {weakList.length > 0 ? (
            <>
              <p className="weak-title">כדאי לתרגל עוד:</p>
              <ul className="weak-list weak-list--rtl">
                {weakList.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="success-msg">מצוין — כל התשובות נכונות בפעם הראשונה!</p>
          )}
        </div>
        <footer className="sticky-footer column gap">
          <button type="button" className="btn primary" onClick={onRepeatSame}>
            שוב אותו אימון
          </button>
          <button type="button" className="btn secondary" onClick={onChangeTopic}>
            בחירת נושא אחר
          </button>
          <button type="button" className="btn ghost" onClick={onHome}>
            תפריט ראשי
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="session column science-root">
      <header className="session-head">
        <p className="progress">
          {modeLabel} {completedCount} מתוך {items.length}
        </p>
        <h1 className="title">{modeLabel}</h1>
        <p className="subtitle">{topic.title}</p>
      </header>

      <main className="science-stage grow">
        <p className="hint science-hint">
          בחרו את התשובה הנכונה. תשובה שגויה תסומן לרגע ותוכלו לנסות שוב.
        </p>
        <ol className="science-list">
          {items.map((item) => {
            const correctChoice = correctChoiceForItem(item);
            const selectedWrongChoice = wrongChoices[item.id];
            const isCorrect = Boolean(correctItems[item.id]);
            const isSequence = isSequenceItem(item);
            const explanation = isCorrect ? explanationForItem(item) : undefined;

            return (
              <li
                key={item.id}
                className={cx(
                  "science-card",
                  isCorrect && "science-card--correct",
                  wrongSequences[item.id] && "science-card--wrong"
                )}
              >
                {isScenarioItem(item) && (
                  <p className="science-scenario">{item.scenario}</p>
                )}
                <p className="science-prompt">{promptForItem(item)}</p>
                {isWordBankItem(item) && item.hint && (
                  <p className="science-note">{item.hint}</p>
                )}

                {isSequence ? (
                  <div className="science-sequence">
                    <div className="science-sequence__bank" aria-label="שלבים לבחירה">
                      {(choiceOrders[item.id] ?? item.steps).map((step) => {
                        const isSelected = (sequenceSelections[item.id] ?? []).includes(step);
                        return (
                          <button
                            key={step}
                            type="button"
                            className="science-chip"
                            disabled={isCorrect || isSelected}
                            onClick={() => selectSequenceStep(item, step)}
                          >
                            {step}
                          </button>
                        );
                      })}
                    </div>
                    <div className="science-sequence__answer" aria-label="הסדר שבחרת">
                      {(sequenceSelections[item.id] ?? []).map((step, index) => (
                        <button
                          key={`${step}-${index}`}
                          type="button"
                          className="science-chip science-chip--selected"
                          disabled={isCorrect}
                          onClick={() => removeSequenceStep(item.id, step)}
                        >
                          {index + 1}. {step}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={cx(
                        "btn secondary science-check",
                        isCorrect && "success",
                        wrongSequences[item.id] && "warn"
                      )}
                      disabled={
                        isCorrect ||
                        wrongSequences[item.id] ||
                        (sequenceSelections[item.id] ?? []).length !== item.steps.length
                      }
                      onClick={() => checkSequence(item)}
                    >
                      {isCorrect ? "נכון" : wrongSequences[item.id] ? "נסו שוב" : "בדיקה"}
                    </button>
                  </div>
                ) : (
                  <div className="science-choice-bank" role="group" aria-label="אפשרויות תשובה">
                    {(choiceOrders[item.id] ?? choicesForItem(item)).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className={cx(
                          "grammar-choice science-choice",
                          isCorrect && choice === correctChoice && "grammar-choice--correct",
                          selectedWrongChoice === choice && "grammar-choice--wrong"
                        )}
                        disabled={isCorrect || Boolean(selectedWrongChoice)}
                        onClick={() => chooseAnswer(item, choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}

                {explanation && <p className="science-note">{explanation}</p>}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
