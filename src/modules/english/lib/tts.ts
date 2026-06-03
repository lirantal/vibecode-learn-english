let preferredEnVoice: SpeechSynthesisVoice | null = null;

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang === "en-us") score += 50;
  else if (["en-gb", "en-au", "en-ca"].includes(lang)) score += 40;
  else if (lang.startsWith("en-")) score += 35;

  if (name.includes("microsoft aria")) score += 45;
  if (name.includes("microsoft jenny")) score += 45;
  if (name.includes("microsoft guy")) score += 40;
  if (name.includes("microsoft ava")) score += 40;
  if (name.includes("google us english")) score += 40;
  if (name.includes("google uk english")) score += 35;
  if (name.includes("samantha")) score += 35;
  if (name.includes("alex")) score += 30;
  if (name.includes("daniel")) score += 30;
  if (name.includes("karen")) score += 25;

  // Browser voice lists can include novelty voices before normal ones.
  if (
    [
      "albert",
      "bad news",
      "bahh",
      "bells",
      "boing",
      "bubbles",
      "cellos",
      "jester",
      "organ",
      "superstar",
      "trinoids",
      "whisper",
      "wobble",
      "zarvox",
    ].some((noveltyName) => name.includes(noveltyName))
  ) {
    score -= 50;
  }

  if (voice.localService) score += 5;

  return score;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (!enVoices.length) return voices[0] ?? null;

  return [...enVoices].sort((a, b) => scoreEnglishVoice(b) - scoreEnglishVoice(a))[0];
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
    u.lang = preferredEnVoice?.lang || "en-US";
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
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
