let preferredEnVoice: SpeechSynthesisVoice | null = null;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  return pool[0] ?? null;
}

export function ensureVoicesLoaded(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (speechSynthesis.getVoices().length > 0) {
    preferredEnVoice = pickEnglishVoice();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const on = () => {
      preferredEnVoice = pickEnglishVoice();
      speechSynthesis.removeEventListener("voiceschanged", on);
      resolve();
    };
    speechSynthesis.addEventListener("voiceschanged", on);
    speechSynthesis.getVoices();
  });
}

export function speakEnglish(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = "en-US";
  if (preferredEnVoice) u.voice = preferredEnVoice;
  speechSynthesis.speak(u);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();
}
