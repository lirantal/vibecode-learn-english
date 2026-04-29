import type { GroupProgress, ModeStats, StoredProgress } from "../types";

const KEY = "vibecode-learn-english:v1";

function emptyStore(): StoredProgress {
  return { version: 1, byGroup: {} };
}

export function loadProgress(): StoredProgress {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StoredProgress;
    if (parsed?.version !== 1 || typeof parsed.byGroup !== "object") {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveProgress(data: StoredProgress): void {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function updateGroupModeStats(
  groupId: string,
  mode: "flashcard" | "spelling",
  stats: ModeStats,
  lastSelected?: string
): void {
  const cur = loadProgress();
  const prev: GroupProgress = cur.byGroup[groupId] ?? {};
  cur.byGroup[groupId] = {
    ...prev,
    [mode]: stats,
  };
  if (lastSelected !== undefined) {
    cur.lastSelectedGroupId = lastSelected;
  }
  saveProgress(cur);
}

export function setLastSelectedGroupId(groupId: string): void {
  const cur = loadProgress();
  cur.lastSelectedGroupId = groupId;
  saveProgress(cur);
}
