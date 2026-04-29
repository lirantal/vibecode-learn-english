/** Lowercase + trim for English comparison. Preserves internal spaces. */
export function normalizeEn(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function answersMatch(a: string, b: string): boolean {
  return normalizeEn(a) === normalizeEn(b);
}

export type LetterFeedback = "correct" | "present" | "absent";

/**
 * Wordle-style per-position feedback for equal-length strings.
 * Space positions must match space to be "correct".
 */
export function wordleFeedback(
  answerRaw: string,
  guessRaw: string
): LetterFeedback[] {
  const answer = normalizeEn(answerRaw);
  const guess = normalizeEn(guessRaw);
  const n = answer.length;
  if (n !== guess.length) {
    return Array(Math.max(guess.length, 1))
      .fill(0)
      .map(() => "absent" as const);
  }
  const a = answer.split("");
  const g = guess.split("");
  const out: LetterFeedback[] = Array(n).fill("absent") as LetterFeedback[];

  for (let i = 0; i < n; i++) {
    if (a[i] === " ") {
      out[i] = g[i] === " " ? "correct" : "absent";
    }
  }

  for (let i = 0; i < n; i++) {
    if (a[i] === " ") continue;
    if (g[i] === a[i]) out[i] = "correct";
  }

  const remaining = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (a[i] === " ") continue;
    if (out[i] === "correct") continue;
    const c = a[i];
    remaining.set(c, (remaining.get(c) ?? 0) + 1);
  }

  for (let i = 0; i < n; i++) {
    if (a[i] === " ") continue;
    if (out[i] === "correct") continue;
    const ch = g[i];
    if (ch === " ") {
      out[i] = "absent";
      continue;
    }
    const left = remaining.get(ch) ?? 0;
    if (left > 0) {
      out[i] = "present";
      remaining.set(ch, left - 1);
    } else {
      out[i] = "absent";
    }
  }

  return out;
}
