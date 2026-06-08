import type { EnglishPracticeMode, WordGroup } from "../types";

export const GRAMMAR_CHOICE_ITEMS_PER_RUN = 5;

export function exerciseTotalForMode(
  group: WordGroup,
  mode: EnglishPracticeMode
): number {
  if ((mode === "flashcard" || mode === "spelling") && "words" in group) {
    return group.words.length;
  }

  if (mode === "matching" && group.exerciseType === "matching") {
    return group.words.length;
  }

  if (mode === "grammarChoice" && group.exerciseType === "grammarChoice") {
    return Math.min(group.sentences.length, GRAMMAR_CHOICE_ITEMS_PER_RUN);
  }

  if (mode === "storyCloze" && group.exerciseType === "storyCloze") {
    return group.blanks.length;
  }

  return 0;
}
