import { useCallback, useEffect, useRef, useState } from "react";
import type { AppView } from "../types";

function isAppView(value: unknown): value is AppView {
  if (!value || typeof value !== "object" || !("name" in value)) {
    return false;
  }

  const name = (value as AppView).name;
  if (name === "home") {
    return true;
  }

  return "groupId" in value && typeof (value as { groupId: unknown }).groupId === "string";
}

function readViewFromHistoryState(state: unknown): AppView | null {
  if (!state || typeof state !== "object" || !("view" in state)) {
    return null;
  }

  const view = (state as { view: unknown }).view;
  return isAppView(view) ? view : null;
}

export function useAppNavigation() {
  const [view, setView] = useState<AppView>({ name: "home" });
  const depthRef = useRef(0);

  useEffect(() => {
    if (!readViewFromHistoryState(history.state)) {
      history.replaceState({ view: { name: "home" } }, "");
    }

    const onPopState = (event: PopStateEvent) => {
      const next = readViewFromHistoryState(event.state) ?? { name: "home" };
      setView(next);
      if (next.name === "home") {
        depthRef.current = 0;
      } else {
        depthRef.current = Math.max(0, depthRef.current - 1);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    history.pushState({ view: next }, "");
    depthRef.current += 1;
  }, []);

  const goHome = useCallback(() => {
    if (depthRef.current > 0) {
      history.go(-depthRef.current);
      return;
    }

    setView({ name: "home" });
  }, []);

  return { view, navigate, goHome };
}
