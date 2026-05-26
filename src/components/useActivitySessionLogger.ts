import { useCallback, useEffect, useRef } from "react";
import type { PracticeMode, ScoreSnapshot } from "../types";
import { recordActivitySession } from "../lib/storage";

type ActivitySessionLoggerOptions = {
  groupId: string;
  groupTitle: string;
  mode: PracticeMode;
  getItemCount: () => number;
  getScoreSnapshot?: () => ScoreSnapshot | undefined;
};

export function useActivitySessionLogger({
  groupId,
  groupTitle,
  mode,
  getItemCount,
  getScoreSnapshot,
}: ActivitySessionLoggerOptions): (itemCount?: number, score?: ScoreSnapshot) => void {
  const loggedRef = useRef(false);
  const getItemCountRef = useRef(getItemCount);
  const getScoreSnapshotRef = useRef(getScoreSnapshot);
  getItemCountRef.current = getItemCount;
  getScoreSnapshotRef.current = getScoreSnapshot;

  const logSession = useCallback(
    (itemCount?: number, score?: ScoreSnapshot) => {
      const count = itemCount ?? getItemCountRef.current();
      if (loggedRef.current || count <= 0) return;

      loggedRef.current = true;
      recordActivitySession({
        groupId,
        groupTitle,
        mode,
        itemCount: count,
        score: score ?? getScoreSnapshotRef.current?.(),
      });
    },
    [groupId, groupTitle, mode]
  );

  useEffect(() => {
    return () => logSession();
  }, [logSession]);

  return logSession;
}
