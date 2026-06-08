import { useCallback, useEffect, useRef } from "react";
import type { ScoreSnapshot } from "../types";
import { recordActivitySession } from "../storage";

type ActivitySessionLoggerOptions = {
  moduleId: string;
  groupId: string;
  groupTitle: string;
  mode: string;
  getItemCount: () => number;
  getScoreSnapshot?: () => ScoreSnapshot | undefined;
};

export function useActivitySessionLogger({
  moduleId,
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
        moduleId,
        groupId,
        groupTitle,
        mode,
        itemCount: count,
        score: score ?? getScoreSnapshotRef.current?.(),
      });
    },
    [moduleId, groupId, groupTitle, mode]
  );

  useEffect(() => {
    return () => logSession();
  }, [logSession]);

  return logSession;
}
