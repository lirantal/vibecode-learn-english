import type { ModeStats } from "../../core/types";

export type SciencePracticeMode =
  | "multipleChoice"
  | "wordBank"
  | "definitionChoice"
  | "sequenceOrder"
  | "scenarioAnalysis";

export type ScienceModeContent = {
  title: string;
  description: string;
};

export type ScienceChoiceItem = {
  id: string;
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation?: string;
};

export type ScienceWordBankItem = {
  id: string;
  prefix: string;
  suffix: string;
  choices: string[];
  correctChoice: string;
  hint?: string;
};

export type ScienceDefinitionItem = {
  id: string;
  term: string;
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation?: string;
};

export type ScienceSequenceItem = {
  id: string;
  prompt: string;
  steps: string[];
  explanation?: string;
};

export type ScienceScenarioItem = {
  id: string;
  scenario: string;
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation?: string;
};

export type ScienceTopic = {
  id: string;
  title: string;
  description: string;
  modes: Record<SciencePracticeMode, ScienceModeContent>;
  multipleChoice: ScienceChoiceItem[];
  wordBank: ScienceWordBankItem[];
  definitionChoice: ScienceDefinitionItem[];
  sequenceOrder: ScienceSequenceItem[];
  scenarioAnalysis: ScienceScenarioItem[];
};

export type ScienceTopicsFile = {
  topics: ScienceTopic[];
};

export type ScienceTopicProgress = Partial<Record<SciencePracticeMode, ModeStats>>;

export type ScienceRoute =
  | { name: "pickMode"; topicId: string }
  | { name: SciencePracticeMode; topicId: string };
