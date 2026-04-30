let preferredEnVoice: SpeechSynthesisVoice | null = null;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (!enVoices.length) return voices[0] ?? null;

  // Prefer network/cloud voices (higher quality) over local ones
  const network = enVoices.filter((v) => !v.localService);
  if (network.length) return network[0];

  return enVoices[0];
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

export function speakEnglish(text: string, slow = false): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const trimmed = text.trim();
  const rate = slow ? 0.32 : 0.78;

  const makeUtterance = () => {
    const u = new SpeechSynthesisUtterance(trimmed);
    u.lang = "en-US";
    u.rate = rate;
    u.pitch = 1.05;
    if (preferredEnVoice) u.voice = preferredEnVoice;
    return u;
  };

  const first = makeUtterance();

  if (!slow) {
    first.onend = () => {
      setTimeout(() => {
        speechSynthesis.speak(makeUtterance());
      }, 1000);
    };
  }

  speechSynthesis.speak(first);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();
}
