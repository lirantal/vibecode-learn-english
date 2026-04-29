export type Word = {
  en: string;
  he: string;
};

export type WordGroup = {
  id: string;
  title: string;
  words: Word[];
};

export type WordGroupsFile = {
  groups: WordGroup[];
};

export type PracticeMode = "flashcard" | "spelling";

export type ModeStats = {
  lastRunAt: string;
  lastScoreNumerator: number;
  lastScoreDenominator: number;
  lastWeakEn: string[];
};

export type GroupProgress = {
  flashcard?: ModeStats;
  spelling?: ModeStats;
};

export type StoredProgress = {
  version: 1;
  byGroup: Record<string, GroupProgress>;
  lastSelectedGroupId?: string;
};

export type AppView =
  | { name: "home" }
  | { name: "pickMode"; groupId: string }
  | { name: "flashcard"; groupId: string }
  | { name: "spelling"; groupId: string };
