export type ScoreSnapshot = {
  correctCount: number;
  completedCount: number;
  totalCount: number;
  errorCount: number;
};

export type ActivityLogEntry = {
  id: string;
  runAt: string;
  moduleId: string;
  groupId: string;
  groupTitle: string;
  mode: string;
  itemCount: number;
  score?: ScoreSnapshot;
};

export type ModeStats = {
  lastRunAt: string;
  lastScoreNumerator: number;
  lastScoreDenominator: number;
  lastWeakItems: string[];
  lastCompletedCount?: number;
  lastTotalCount?: number;
  lastErrorCount?: number;
};

export type GroupProgress = Record<string, ModeStats | undefined>;

export type ModuleProgress = {
  byGroup: Record<string, GroupProgress>;
  lastSelectedGroupId?: string;
};

export type StoredProgress = {
  version: 2;
  byModule: Record<string, ModuleProgress>;
  activityLog?: ActivityLogEntry[];
};

export type ModuleRoute = {
  name: string;
  [key: string]: unknown;
};

export type AppView =
  | { name: "home" }
  | { name: "activity" }
  | { name: "moduleHome"; moduleId: string }
  | { name: "moduleRoute"; moduleId: string; route: ModuleRoute };
