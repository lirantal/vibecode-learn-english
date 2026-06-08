import type { SciencePracticeMode, ScienceTopic } from "../types";

export function itemsForMode(topic: ScienceTopic, mode: SciencePracticeMode) {
  return topic[mode];
}

export function exerciseTotalForMode(
  topic: ScienceTopic,
  mode: SciencePracticeMode
): number {
  return itemsForMode(topic, mode).length;
}
