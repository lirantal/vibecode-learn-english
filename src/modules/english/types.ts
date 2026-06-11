import type { ModeStats } from "../../core/types";

export type Word = {
  en: string;
  he: string;
};

export type GrammarChoiceSentence = {
  prefix: string;
  choices: string[];
  suffix: string;
  correctChoice: string;
};

export type PronounWritingSentence = {
  prefix: string;
  target: string;
  suffix: string;
  correctPronoun: string;
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
  itemsPerRun?: number;
  sentences: GrammarChoiceSentence[];
};

export type PronounWritingGroup = {
  id: string;
  title: string;
  exerciseType: "pronounWriting";
  itemsPerRun?: number;
  sentences: PronounWritingSentence[];
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

export type WordGroup =
  | WordListGroup
  | MatchingGroup
  | GrammarChoiceGroup
  | PronounWritingGroup
  | StoryClozeGroup;

export type WordGroupsFile = {
  groups: WordGroup[];
};

export type EnglishPracticeMode =
  | "flashcard"
  | "spelling"
  | "matching"
  | "grammarChoice"
  | "pronounWriting"
  | "storyCloze";

export type EnglishGroupProgress = Partial<Record<EnglishPracticeMode, ModeStats>>;

export type EnglishRoute =
  | { name: "pickMode"; groupId: string }
  | { name: "flashcard"; groupId: string }
  | { name: "spelling"; groupId: string }
  | { name: "matching"; groupId: string }
  | { name: "grammarChoice"; groupId: string }
  | { name: "pronounWriting"; groupId: string }
  | { name: "storyCloze"; groupId: string };
