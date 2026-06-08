import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ScoreSnapshot } from "../../../core/types";
import type { MatchingGroup, Word } from "../types";
import { makeScoreSnapshot } from "../../../core/score";
import { updateGroupModeStats } from "../../../core/storage";
import { useActivitySessionLogger } from "../../../core/hooks/useActivitySessionLogger";

type Props = {
  group: MatchingGroup;
  onRepeatSame: () => void;
  onChangeGroup: () => void;
  onHome: () => void;
};

type MatchWord = Word & {
  id: string;
};

type ConnectorLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type DragState = {
  sourceId: string;
  line: ConnectorLine;
};

const DROP_TARGET_TOLERANCE_PX = 18;

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

function centerPoint(board: HTMLElement, el: HTMLElement): { x: number; y: number } {
  const boardRect = board.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - boardRect.left,
    y: rect.top + rect.height / 2 - boardRect.top,
  };
}

function pointerPoint(board: HTMLElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const boardRect = board.getBoundingClientRect();
  return {
    x: e.clientX - boardRect.left,
    y: e.clientY - boardRect.top,
  };
}

export default function MatchingSession({
  group,
  onRepeatSame,
  onChangeGroup,
  onHome,
}: Props) {
  const englishWords = useMemo<MatchWord[]>(
    () =>
      group.words.map((word, index) => ({
        ...word,
        id: `${index}-${word.en}`,
      })),
    [group.words]
  );
  const hebrewWords = useMemo(() => shuffle(englishWords), [englishWords]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const englishDotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hebrewItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hebrewDotRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const wrongLineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(0);

  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [connectedLines, setConnectedLines] = useState<Record<string, ConnectorLine>>({});
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [wrongLine, setWrongLine] = useState<ConnectorLine | null>(null);
  const [phase, setPhase] = useState<"run" | "summary">("run");

  const matchedSet = useMemo(() => new Set(matchedIds), [matchedIds]);
  const missedSet = useMemo(() => new Set(missedIds), [missedIds]);
  const snapshotFor = useCallback(
    (nextMatchedIds: string[], nextMissedIds: string[]): ScoreSnapshot => {
      const missed = new Set(nextMissedIds);
      return makeScoreSnapshot({
        correctCount: nextMatchedIds.filter((id) => !missed.has(id)).length,
        completedCount: nextMatchedIds.length,
        totalCount: englishWords.length,
        errorCount: missed.size,
      });
    },
    [englishWords.length]
  );
  const logActivitySession = useActivitySessionLogger({
    moduleId: "english",
    groupId: group.id,
    groupTitle: group.title,
    mode: "matching",
    getItemCount: () => completedRef.current,
    getScoreSnapshot: () => snapshotFor(matchedIds, missedIds),
  });

  const measureConnection = useCallback((sourceId: string): ConnectorLine | null => {
    const board = boardRef.current;
    const englishDot = englishDotRefs.current[sourceId];
    const hebrewDot = hebrewDotRefs.current[sourceId];
    if (!board || !englishDot || !hebrewDot) return null;
    const start = centerPoint(board, englishDot);
    const end = centerPoint(board, hebrewDot);
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }, []);

  const persist = useCallback(
    (nextMatchedIds: string[], nextMissedIds: string[]): ScoreSnapshot => {
      const missed = new Set(nextMissedIds);
      const correct = nextMatchedIds.filter((id) => !missed.has(id)).length;
      const weak = englishWords
        .filter((word) => missed.has(word.id))
        .map((word) => word.en);
      const score = snapshotFor(nextMatchedIds, nextMissedIds);

      updateGroupModeStats(
        "english",
        group.id,
        "matching",
        {
          lastRunAt: new Date().toISOString(),
          lastScoreNumerator: correct,
          lastScoreDenominator: englishWords.length,
          lastWeakItems: weak,
          lastCompletedCount: nextMatchedIds.length,
          lastTotalCount: englishWords.length,
          lastErrorCount: missed.size,
        },
        group.id
      );

      return score;
    },
    [englishWords, group.id, snapshotFor]
  );

  useLayoutEffect(() => {
    const refreshLines = () => {
      const nextLines: Record<string, ConnectorLine> = {};
      matchedIds.forEach((sourceId) => {
        const line = measureConnection(sourceId);
        if (line) nextLines[sourceId] = line;
      });
      setConnectedLines(nextLines);
    };

    refreshLines();
    window.addEventListener("resize", refreshLines);
    return () => window.removeEventListener("resize", refreshLines);
  }, [matchedIds, measureConnection]);

  useEffect(() => {
    return () => {
      if (wrongLineTimer.current) {
        clearTimeout(wrongLineTimer.current);
      }
    };
  }, []);

  const clearWrongLineSoon = () => {
    if (wrongLineTimer.current) {
      clearTimeout(wrongLineTimer.current);
    }
    wrongLineTimer.current = setTimeout(() => {
      setWrongLine(null);
      wrongLineTimer.current = null;
    }, 1000);
  };

  const dropTargetId = (e: ReactPointerEvent): string | undefined => {
    let closestTarget: { id: string; distance: number } | undefined;

    Object.entries(hebrewItemRefs.current).forEach(([id, el]) => {
      if (!el || matchedSet.has(id)) return;
      const rect = el.getBoundingClientRect();
      const left = rect.left - DROP_TARGET_TOLERANCE_PX;
      const right = rect.right + DROP_TARGET_TOLERANCE_PX;
      const top = rect.top - DROP_TARGET_TOLERANCE_PX;
      const bottom = rect.bottom + DROP_TARGET_TOLERANCE_PX;

      if (
        e.clientX < left ||
        e.clientX > right ||
        e.clientY < top ||
        e.clientY > bottom
      ) {
        return;
      }

      const dx = e.clientX < rect.left ? rect.left - e.clientX : Math.max(0, e.clientX - rect.right);
      const dy = e.clientY < rect.top ? rect.top - e.clientY : Math.max(0, e.clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (!closestTarget || distance < closestTarget.distance) {
        closestTarget = { id, distance };
      }
    });

    return closestTarget?.id;
  };

  const startDrag = (sourceId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "run" || matchedSet.has(sourceId)) return;
    const board = boardRef.current;
    const englishDot = englishDotRefs.current[sourceId];
    if (!board || !englishDot) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = centerPoint(board, englishDot);
    const end = pointerPoint(board, e);
    setWrongLine(null);
    setDragging({
      sourceId,
      line: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    });
  };

  const moveDrag = (sourceId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragging?.sourceId !== sourceId || !boardRef.current) return;
    const end = pointerPoint(boardRef.current, e);
    setDragging((current) =>
      current?.sourceId === sourceId
        ? { ...current, line: { ...current.line, x2: end.x, y2: end.y } }
        : current
    );
  };

  const finishDrag = (sourceId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragging?.sourceId !== sourceId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const targetId = dropTargetId(e);
    if (!targetId || matchedSet.has(targetId)) {
      setDragging(null);
      return;
    }

    if (targetId === sourceId) {
      const nextMatchedIds = [...matchedIds, sourceId];
      completedRef.current = nextMatchedIds.length;
      setMatchedIds(nextMatchedIds);
      setDragging(null);
      const score = persist(nextMatchedIds, missedIds);
      if (nextMatchedIds.length === englishWords.length) {
        logActivitySession(nextMatchedIds.length, score);
        setPhase("summary");
      }
      return;
    }

    const wrongTargetDot = hebrewDotRefs.current[targetId];
    const wrongEnd = boardRef.current && wrongTargetDot
      ? centerPoint(boardRef.current, wrongTargetDot)
      : { x: dragging.line.x2, y: dragging.line.y2 };
    const nextMissedIds = missedSet.has(sourceId) ? missedIds : [...missedIds, sourceId];

    setMissedIds(nextMissedIds);
    persist(matchedIds, nextMissedIds);
    setWrongLine({ ...dragging.line, x2: wrongEnd.x, y2: wrongEnd.y });
    setDragging(null);
    clearWrongLineSoon();
  };

  const weakList = englishWords
    .filter((word) => missedSet.has(word.id))
    .map((word) => word.en);
  const correctCount = matchedIds.filter((id) => !missedSet.has(id)).length;

  if (phase === "summary") {
    return (
      <div className="session column">
        <header className="session-head">
          <h1 className="title">סיכום — חיבור תרגומים</h1>
          <p className="subtitle">{group.title}</p>
        </header>
        <div className="card summary-card grow">
          <p className="score-line">
            ציון: <strong>{correctCount}</strong> / {englishWords.length} נכון בניסיון ראשון
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
            <p className="success-msg">נהדר — כל החיבורים היו נכונים בפעם הראשונה!</p>
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
    <div className="session column matching-root">
      <header className="session-head">
        <p className="progress">
          חיבורים {matchedIds.length} מתוך {englishWords.length}
        </p>
        <h1 className="title">חיבור תרגומים</h1>
        <p className="subtitle">{group.title}</p>
      </header>

      <main className="matching-stage grow">
        <p className="hint matching-hint">
          גרור מהנקודה של המילה באנגלית אל התרגום הנכון בעברית.
        </p>

        <div className="matching-board" ref={boardRef}>
          <svg className="matching-lines" aria-hidden="true">
            {Object.entries(connectedLines).map(([id, line]) => (
              <line
                key={id}
                className="matching-line matching-line--correct"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ))}
            {wrongLine && (
              <line
                className="matching-line matching-line--wrong"
                x1={wrongLine.x1}
                y1={wrongLine.y1}
                x2={wrongLine.x2}
                y2={wrongLine.y2}
              />
            )}
            {dragging && (
              <line
                className="matching-line matching-line--dragging"
                x1={dragging.line.x1}
                y1={dragging.line.y1}
                x2={dragging.line.x2}
                y2={dragging.line.y2}
              />
            )}
          </svg>

          <div className="matching-columns">
            <section className="matching-column matching-column--en" aria-label="English words">
              <p className="matching-column-label">English</p>
              <div className="matching-list">
                {englishWords.map((word) => {
                  const isMatched = matchedSet.has(word.id);
                  const wasMissed = missedSet.has(word.id);
                  return (
                    <div
                      key={word.id}
                      className={cx(
                        "matching-item matching-item--en",
                        isMatched && "matching-item--matched",
                        wasMissed && !isMatched && "matching-item--missed"
                      )}
                    >
                      <span className="matching-word matching-word--en">{word.en}</span>
                      <button
                        type="button"
                        ref={(el) => {
                          englishDotRefs.current[word.id] = el;
                        }}
                        className="matching-dot matching-dot--source"
                        disabled={isMatched}
                        aria-label={`חבר את ${word.en}`}
                        onPointerDown={(e) => startDrag(word.id, e)}
                        onPointerMove={(e) => moveDrag(word.id, e)}
                        onPointerUp={(e) => finishDrag(word.id, e)}
                        onPointerCancel={() => setDragging(null)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="matching-column matching-column--he" aria-label="Hebrew translations">
              <p className="matching-column-label">עברית</p>
              <div className="matching-list">
                {hebrewWords.map((word) => {
                  const isMatched = matchedSet.has(word.id);
                  return (
                    <div
                      key={word.id}
                      ref={(el) => {
                        hebrewItemRefs.current[word.id] = el;
                      }}
                      className={cx(
                        "matching-item matching-item--he",
                        isMatched && "matching-item--matched"
                      )}
                    >
                      <span
                        ref={(el) => {
                          hebrewDotRefs.current[word.id] = el;
                        }}
                        className="matching-dot matching-dot--target"
                        aria-hidden="true"
                      />
                      <span className="matching-word matching-word--he">{word.he}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
