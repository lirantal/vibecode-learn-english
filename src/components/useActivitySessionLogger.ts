import { useCallback, useEffect, useRef } from "react";
import type { PracticeMode } from "../types";
import { recordActivitySession } from "../lib/storage";

type ActivitySessionLoggerOptions = {
  groupId: string;
  groupTitle: string;
  mode: PracticeMode;
  getItemCount: () => number;
};

export function useActivitySessionLogger({
  groupId,
  groupTitle,
  mode,
  getItemCount,
}: ActivitySessionLoggerOptions): (itemCount?: number) => void {
  const loggedRef = useRef(false);
  const getItemCountRef = useRef(getItemCount);
  getItemCountRef.current = getItemCount;

  const logSession = useCallback(
    (itemCount?: number) => {
      const count = itemCount ?? getItemCountRef.current();
      if (loggedRef.current || count <= 0) return;

      loggedRef.current = true;
      recordActivitySession({
        groupId,
        groupTitle,
        mode,
        itemCount: count,
      });
    },
    [groupId, groupTitle, mode]
  );

  useEffect(() => {
    return () => logSession();
  }, [logSession]);

  return logSession;
}
