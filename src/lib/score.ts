import type { ModeStats, PracticeMode, ScoreSnapshot, WordGroup } from "../types";

export type ScoreBadgeTone = "empty" | "great" | "incomplete" | "weak";

export const GRAMMAR_CHOICE_ITEMS_PER_RUN = 5;

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;
}

export function makeScoreSnapshot({
  correctCount,
  completedCount,
  totalCount,
  errorCount,
}: ScoreSnapshot): ScoreSnapshot {
  const total = count(totalCount) ?? 0;
  const completed = Math.min(count(completedCount) ?? 0, total);
  const correct = Math.min(count(correctCount) ?? 0, total);
  const errors = count(errorCount) ?? Math.max(0, completed - correct);

  return {
    correctCount: correct,
    completedCount: completed,
    totalCount: total,
    errorCount: errors,
  };
}

export function scoreFromStats(
  stats: ModeStats | undefined,
  exerciseTotal: number
): ScoreSnapshot {
  if (!stats) {
    return makeScoreSnapshot({
      correctCount: 0,
      completedCount: 0,
      totalCount: exerciseTotal,
      errorCount: 0,
    });
  }

  const correct = count(stats.lastScoreNumerator) ?? 0;
  const errors = count(stats.lastErrorCount) ?? stats.lastWeakEn.length;
  const legacyCompleted = Math.min(
    count(stats.lastScoreDenominator) ?? exerciseTotal,
    correct + errors
  );

  return makeScoreSnapshot({
    correctCount: correct,
    completedCount: count(stats.lastCompletedCount) ?? legacyCompleted,
    totalCount: count(stats.lastTotalCount) ?? exerciseTotal,
    errorCount: errors,
  });
}

export function scoreBadgeTone(score: ScoreSnapshot): ScoreBadgeTone {
  const normalized = makeScoreSnapshot(score);

  if (normalized.errorCount > 0) return "weak";
  if (normalized.completedCount === 0) return "empty";
  if (normalized.completedCount < normalized.totalCount) return "incomplete";
  if (normalized.correctCount === normalized.totalCount) return "great";

  return "weak";
}

export function exerciseTotalForMode(group: WordGroup, mode: PracticeMode): number {
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
