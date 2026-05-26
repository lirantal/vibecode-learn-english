import type {
  ActivityLogEntry,
  GroupProgress,
  ModeStats,
  PracticeMode,
  ScoreSnapshot,
  StoredProgress,
} from "../types";
import { makeScoreSnapshot } from "./score";

const KEY = "vibecode-learn-english:v1";
const STORAGE_TEST_KEY = `${KEY}:storage-test`;
const STORAGE_AREAS = ["localStorage", "sessionStorage"] as const;
const MAX_ACTIVITY_LOG_ENTRIES = 500;

let memoryStore: StoredProgress | undefined;
let persistenceRequested = false;

function emptyStore(): StoredProgress {
  return { version: 1, byGroup: {}, activityLog: [] };
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return (
    value === "flashcard" ||
    value === "spelling" ||
    value === "matching" ||
    value === "grammarChoice" ||
    value === "storyCloze"
  );
}

function isScoreSnapshot(value: unknown): value is ScoreSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isFinite((value as ScoreSnapshot).correctCount) &&
    Number.isFinite((value as ScoreSnapshot).completedCount) &&
    Number.isFinite((value as ScoreSnapshot).totalCount) &&
    Number.isFinite((value as ScoreSnapshot).errorCount)
  );
}

function isActivityLogEntry(value: unknown): value is ActivityLogEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ActivityLogEntry).id === "string" &&
    typeof (value as ActivityLogEntry).runAt === "string" &&
    typeof (value as ActivityLogEntry).groupId === "string" &&
    typeof (value as ActivityLogEntry).groupTitle === "string" &&
    isPracticeMode((value as ActivityLogEntry).mode) &&
    Number.isFinite((value as ActivityLogEntry).itemCount) &&
    (value as ActivityLogEntry).itemCount > 0 &&
    (
      (value as ActivityLogEntry).score === undefined ||
      isScoreSnapshot((value as ActivityLogEntry).score)
    )
  );
}

function asCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;
}

function asWeakList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeStats(value: unknown): ModeStats | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const stats = value as ModeStats;
  if (typeof stats.lastRunAt !== "string") return undefined;

  const weak = asWeakList(stats.lastWeakEn);
  const correct = asCount(stats.lastScoreNumerator) ?? 0;
  const denominator = asCount(stats.lastScoreDenominator) ?? 0;
  const errors = asCount(stats.lastErrorCount) ?? weak.length;

  return {
    lastRunAt: stats.lastRunAt,
    lastScoreNumerator: correct,
    lastScoreDenominator: denominator,
    lastWeakEn: weak,
    lastCompletedCount:
      asCount(stats.lastCompletedCount) ?? Math.min(denominator, correct + errors),
    lastTotalCount: asCount(stats.lastTotalCount),
    lastErrorCount: errors,
  };
}

function normalizeActivityLogEntry(entry: ActivityLogEntry): ActivityLogEntry {
  return {
    ...entry,
    itemCount: asCount(entry.itemCount) ?? 0,
    score: entry.score ? makeScoreSnapshot(entry.score) : undefined,
  };
}

function isStoredProgress(value: unknown): value is StoredProgress {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as StoredProgress).version === 1 &&
    typeof (value as StoredProgress).byGroup === "object" &&
    (value as StoredProgress).byGroup !== null
  );
}

function getStorageArea(kind: (typeof STORAGE_AREAS)[number]): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const storage = window[kind];
    storage.setItem(STORAGE_TEST_KEY, "1");
    storage.removeItem(STORAGE_TEST_KEY);
    return storage;
  } catch {
    return undefined;
  }
}

function readFromStorage(storage: Storage | undefined): StoredProgress | undefined {
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredProgress(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function statsTime(stats: ModeStats | undefined): number {
  if (!stats) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(stats.lastRunAt);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function activityTime(entry: ActivityLogEntry): number {
  const time = Date.parse(entry.runAt);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function newestStats(
  current: ModeStats | undefined,
  next: ModeStats | undefined
): ModeStats | undefined {
  if (!next) return current;
  if (!current) return next;
  return statsTime(next) >= statsTime(current) ? next : current;
}

function mergeGroupProgress(
  current: GroupProgress | undefined,
  next: GroupProgress | undefined
): GroupProgress {
  return {
    flashcard: newestStats(normalizeStats(current?.flashcard), normalizeStats(next?.flashcard)),
    spelling: newestStats(normalizeStats(current?.spelling), normalizeStats(next?.spelling)),
    matching: newestStats(normalizeStats(current?.matching), normalizeStats(next?.matching)),
    grammarChoice: newestStats(
      normalizeStats(current?.grammarChoice),
      normalizeStats(next?.grammarChoice)
    ),
    storyCloze: newestStats(
      normalizeStats(current?.storyCloze),
      normalizeStats(next?.storyCloze)
    ),
  };
}

function pruneEmptyModes(group: GroupProgress): GroupProgress {
  return Object.fromEntries(
    Object.entries(group).filter(([, value]) => value !== undefined)
  ) as GroupProgress;
}

function mergeActivityLogs(stores: StoredProgress[]): ActivityLogEntry[] {
  const byId = new Map<string, ActivityLogEntry>();

  for (const store of stores) {
    for (const entry of store.activityLog ?? []) {
      if (isActivityLogEntry(entry)) {
        byId.set(entry.id, normalizeActivityLogEntry(entry));
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice(0, MAX_ACTIVITY_LOG_ENTRIES);
}

function mergeProgressStores(stores: StoredProgress[]): StoredProgress {
  const merged = emptyStore();

  for (const store of stores) {
    merged.lastSelectedGroupId ??= store.lastSelectedGroupId;

    for (const [groupId, progress] of Object.entries(store.byGroup)) {
      merged.byGroup[groupId] = pruneEmptyModes(
        mergeGroupProgress(merged.byGroup[groupId], progress)
      );
    }
  }

  merged.activityLog = mergeActivityLogs(stores);

  return merged;
}

function requestPersistentStorage(): void {
  if (persistenceRequested || typeof navigator === "undefined") return;

  persistenceRequested = true;
  void navigator.storage?.persist?.().catch(() => {
    // Browsers may deny or omit persistent storage; local/session fallbacks still apply.
  });
}

function availableStorageAreas(): Storage[] {
  return STORAGE_AREAS.map(getStorageArea).filter(
    (storage): storage is Storage => storage !== undefined
  );
}

export function loadProgress(): StoredProgress {
  const stores = [
    ...availableStorageAreas().map(readFromStorage),
    memoryStore,
  ].filter((store): store is StoredProgress => store !== undefined);

  if (stores.length === 0) return emptyStore();

  const merged = mergeProgressStores(stores);
  saveProgress(merged);
  return merged;
}

export function saveProgress(data: StoredProgress): void {
  const serialized = JSON.stringify(data);
  let wroteToBrowserStorage = false;

  for (const storage of availableStorageAreas()) {
    try {
      storage.setItem(KEY, serialized);
      wroteToBrowserStorage = true;
    } catch {
      // Keep trying other storage areas before falling back to memory.
    }
  }

  memoryStore = data;

  if (wroteToBrowserStorage) {
    requestPersistentStorage();
  }
}

export function updateGroupModeStats(
  groupId: string,
  mode: PracticeMode,
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

export function recordActivitySession(
  entry: Omit<ActivityLogEntry, "id" | "runAt"> & { runAt?: string }
): void {
  const runAt = entry.runAt ?? new Date().toISOString();
  const cur = loadProgress();
  const activity: ActivityLogEntry = {
    ...entry,
    runAt,
    id: `${runAt}-${entry.groupId}-${entry.mode}-${Math.random().toString(36).slice(2, 10)}`,
  };

  cur.activityLog = [activity, ...(cur.activityLog ?? [])].slice(
    0,
    MAX_ACTIVITY_LOG_ENTRIES
  );
  saveProgress(cur);
}

export function setLastSelectedGroupId(groupId: string): void {
  const cur = loadProgress();
  cur.lastSelectedGroupId = groupId;
  saveProgress(cur);
}
