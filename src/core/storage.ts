import type {
  ActivityLogEntry,
  GroupProgress,
  ModeStats,
  ModuleProgress,
  ScoreSnapshot,
  StoredProgress,
} from "./types";
import { makeScoreSnapshot } from "./score";

const KEY = "vibecode-learn:v2";
const LEGACY_ENGLISH_KEY = "vibecode-learn-english:v1";
const ENGLISH_MODULE_ID = "english";
const STORAGE_TEST_KEY = `${KEY}:storage-test`;
const STORAGE_AREAS = ["localStorage", "sessionStorage"] as const;
const MAX_ACTIVITY_LOG_ENTRIES = 500;

type LegacyActivityLogEntry = Omit<ActivityLogEntry, "moduleId">;

type LegacyStoredProgress = {
  version: 1;
  byGroup: Record<string, GroupProgress>;
  activityLog?: LegacyActivityLogEntry[];
  lastSelectedGroupId?: string;
};

let memoryStore: StoredProgress | undefined;
let persistenceRequested = false;

function emptyStore(): StoredProgress {
  return { version: 2, byModule: {}, activityLog: [] };
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
    typeof (value as ActivityLogEntry).moduleId === "string" &&
    typeof (value as ActivityLogEntry).groupId === "string" &&
    typeof (value as ActivityLogEntry).groupTitle === "string" &&
    typeof (value as ActivityLogEntry).mode === "string" &&
    Number.isFinite((value as ActivityLogEntry).itemCount) &&
    (value as ActivityLogEntry).itemCount > 0 &&
    (
      (value as ActivityLogEntry).score === undefined ||
      isScoreSnapshot((value as ActivityLogEntry).score)
    )
  );
}

function isLegacyActivityLogEntry(value: unknown): value is LegacyActivityLogEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LegacyActivityLogEntry).id === "string" &&
    typeof (value as LegacyActivityLogEntry).runAt === "string" &&
    typeof (value as LegacyActivityLogEntry).groupId === "string" &&
    typeof (value as LegacyActivityLogEntry).groupTitle === "string" &&
    typeof (value as LegacyActivityLogEntry).mode === "string" &&
    Number.isFinite((value as LegacyActivityLogEntry).itemCount) &&
    (value as LegacyActivityLogEntry).itemCount > 0 &&
    (
      (value as LegacyActivityLogEntry).score === undefined ||
      isScoreSnapshot((value as LegacyActivityLogEntry).score)
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
  const stats = value as ModeStats & { lastWeakEn?: unknown };
  if (typeof stats.lastRunAt !== "string") return undefined;

  const weak = asWeakList(stats.lastWeakItems ?? stats.lastWeakEn);
  const correct = asCount(stats.lastScoreNumerator) ?? 0;
  const denominator = asCount(stats.lastScoreDenominator) ?? 0;
  const errors = asCount(stats.lastErrorCount) ?? weak.length;

  return {
    lastRunAt: stats.lastRunAt,
    lastScoreNumerator: correct,
    lastScoreDenominator: denominator,
    lastWeakItems: weak,
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
    (value as StoredProgress).version === 2 &&
    typeof (value as StoredProgress).byModule === "object" &&
    (value as StoredProgress).byModule !== null
  );
}

function isLegacyStoredProgress(value: unknown): value is LegacyStoredProgress {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as LegacyStoredProgress).version === 1 &&
    typeof (value as LegacyStoredProgress).byGroup === "object" &&
    (value as LegacyStoredProgress).byGroup !== null
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

function readJsonFromStorage(storage: Storage | undefined, key: string): unknown {
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function readFromStorage(storage: Storage | undefined): StoredProgress | undefined {
  const parsed = readJsonFromStorage(storage, KEY);
  return isStoredProgress(parsed) ? parsed : undefined;
}

function readLegacyFromStorage(storage: Storage | undefined): StoredProgress | undefined {
  const parsed = readJsonFromStorage(storage, LEGACY_ENGLISH_KEY);
  return isLegacyStoredProgress(parsed) ? migrateLegacyProgress(parsed) : undefined;
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
  const modes = new Set([
    ...Object.keys(current ?? {}),
    ...Object.keys(next ?? {}),
  ]);
  const merged: GroupProgress = {};

  for (const mode of modes) {
    merged[mode] = newestStats(
      normalizeStats(current?.[mode]),
      normalizeStats(next?.[mode])
    );
  }

  return merged;
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

function mergeModuleProgress(
  current: ModuleProgress | undefined,
  next: ModuleProgress | undefined
): ModuleProgress {
  const merged: ModuleProgress = {
    byGroup: { ...(current?.byGroup ?? {}) },
    lastSelectedGroupId: current?.lastSelectedGroupId ?? next?.lastSelectedGroupId,
  };

  for (const [groupId, progress] of Object.entries(next?.byGroup ?? {})) {
    merged.byGroup[groupId] = pruneEmptyModes(
      mergeGroupProgress(merged.byGroup[groupId], progress)
    );
  }

  return merged;
}

function mergeProgressStores(stores: StoredProgress[]): StoredProgress {
  const merged = emptyStore();

  for (const store of stores) {
    for (const [moduleId, progress] of Object.entries(store.byModule)) {
      merged.byModule[moduleId] = mergeModuleProgress(
        merged.byModule[moduleId],
        progress
      );
    }
  }

  merged.activityLog = mergeActivityLogs(stores);

  return merged;
}

function migrateLegacyActivityLogEntry(
  entry: LegacyActivityLogEntry
): ActivityLogEntry {
  return {
    ...entry,
    moduleId: ENGLISH_MODULE_ID,
    itemCount: asCount(entry.itemCount) ?? 0,
    score: entry.score ? makeScoreSnapshot(entry.score) : undefined,
  };
}

function migrateLegacyProgress(legacy: LegacyStoredProgress): StoredProgress {
  const moduleProgress: ModuleProgress = {
    byGroup: {},
    lastSelectedGroupId: legacy.lastSelectedGroupId,
  };

  for (const [groupId, progress] of Object.entries(legacy.byGroup)) {
    moduleProgress.byGroup[groupId] = pruneEmptyModes(
      mergeGroupProgress(undefined, progress)
    );
  }

  return {
    version: 2,
    byModule: {
      [ENGLISH_MODULE_ID]: moduleProgress,
    },
    activityLog: (legacy.activityLog ?? [])
      .filter(isLegacyActivityLogEntry)
      .map(migrateLegacyActivityLogEntry),
  };
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
  const storageAreas = availableStorageAreas();
  const stores = [
    ...storageAreas.map(readFromStorage),
    ...storageAreas.map(readLegacyFromStorage),
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
  moduleId: string,
  groupId: string,
  mode: string,
  stats: ModeStats,
  lastSelected?: string
): void {
  const cur = loadProgress();
  const moduleProgress = cur.byModule[moduleId] ?? { byGroup: {} };
  const prev: GroupProgress = moduleProgress.byGroup[groupId] ?? {};
  moduleProgress.byGroup[groupId] = {
    ...prev,
    [mode]: stats,
  };
  if (lastSelected !== undefined) {
    moduleProgress.lastSelectedGroupId = lastSelected;
  }
  cur.byModule[moduleId] = moduleProgress;
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
    id: `${runAt}-${entry.moduleId}-${entry.groupId}-${entry.mode}-${Math.random().toString(36).slice(2, 10)}`,
  };

  cur.activityLog = [activity, ...(cur.activityLog ?? [])].slice(
    0,
    MAX_ACTIVITY_LOG_ENTRIES
  );
  saveProgress(cur);
}

export function setLastSelectedGroupId(moduleId: string, groupId: string): void {
  const cur = loadProgress();
  const moduleProgress = cur.byModule[moduleId] ?? { byGroup: {} };
  moduleProgress.lastSelectedGroupId = groupId;
  cur.byModule[moduleId] = moduleProgress;
  saveProgress(cur);
}
