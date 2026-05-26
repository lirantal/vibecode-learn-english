export type Word = {
  en: string;
  he: string;
};

export type GrammarChoiceSentence = {
  prefix: string;
  choices: [string, string];
  suffix: string;
  correctChoice: string;
};

export type StoryClozeBlank = {
  prefix: string;
  suffix: string;
  choices: string[];
  correctChoice: string;
  hintHe?: string;
};

export type WordListGroup = {
  id: string;
  title: string;
  exerciseType?: "standard";
  words: Word[];
};

export type MatchingGroup = {
  id: string;
  title: string;
  exerciseType: "matching";
  words: Word[];
};

export type GrammarChoiceGroup = {
  id: string;
  title: string;
  exerciseType: "grammarChoice";
  sentences: GrammarChoiceSentence[];
};

export type StoryClozeGroup = {
  id: string;
  title: string;
  exerciseType: "storyCloze";
  storyTitle: string;
  story: string;
  targetWords: string[];
  blanks: StoryClozeBlank[];
};

export type WordGroup = WordListGroup | MatchingGroup | GrammarChoiceGroup | StoryClozeGroup;

export type WordGroupsFile = {
  groups: WordGroup[];
};

export type PracticeMode = "flashcard" | "spelling" | "matching" | "grammarChoice" | "storyCloze";

export type ActivityLogEntry = {
  id: string;
  runAt: string;
  groupId: string;
  groupTitle: string;
  mode: PracticeMode;
  itemCount: number;
};

export type ModeStats = {
  lastRunAt: string;
  lastScoreNumerator: number;
  lastScoreDenominator: number;
  lastWeakEn: string[];
};

export type GroupProgress = {
  flashcard?: ModeStats;
  spelling?: ModeStats;
  matching?: ModeStats;
  grammarChoice?: ModeStats;
  storyCloze?: ModeStats;
};

export type StoredProgress = {
  version: 1;
  byGroup: Record<string, GroupProgress>;
  activityLog?: ActivityLogEntry[];
  lastSelectedGroupId?: string;
};

export type AppView =
  | { name: "home" }
  | { name: "activity" }
  | { name: "pickMode"; groupId: string }
  | { name: "flashcard"; groupId: string }
  | { name: "spelling"; groupId: string }
  | { name: "matching"; groupId: string }
  | { name: "grammarChoice"; groupId: string }
  | { name: "storyCloze"; groupId: string };
