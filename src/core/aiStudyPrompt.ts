const CHATGPT_URL = "https://chatgpt.com/";
const CHATGPT_PROMPT_PARAM = "q";
const MAX_CHATGPT_PROMPT_URL_LENGTH = 12000;

export type ChatGptStudyPromptResult = {
  copied: boolean;
  opened: boolean;
  usedPromptUrl: boolean;
  promptUrlTooLong: boolean;
};

export function buildChatGptPromptUrl(prompt: string): string {
  const url = new URL(CHATGPT_URL);
  url.searchParams.set(CHATGPT_PROMPT_PARAM, prompt);
  return url.toString();
}

function promptUrlForLaunch(prompt: string): {
  url: string;
  usedPromptUrl: boolean;
  promptUrlTooLong: boolean;
} {
  const promptUrl = buildChatGptPromptUrl(prompt);
  const promptUrlTooLong = promptUrl.length > MAX_CHATGPT_PROMPT_URL_LENGTH;

  return {
    url: promptUrlTooLong ? CHATGPT_URL : promptUrl,
    usedPromptUrl: !promptUrlTooLong,
    promptUrlTooLong,
  };
}

function copyWithTextArea(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.insetBlockStart = "0";
  textarea.style.insetInlineStart = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (copyWithTextArea(text)) {
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function openChatGptStudyPrompt(
  prompt: string
): Promise<ChatGptStudyPromptResult> {
  const launch = promptUrlForLaunch(prompt);
  const copyPromise = copyTextToClipboard(prompt);
  const openedWindow =
    typeof window === "undefined"
      ? null
      : window.open(launch.url, "_blank", "noopener,noreferrer");

  const copied = await copyPromise;

  return {
    copied,
    opened: Boolean(openedWindow),
    usedPromptUrl: launch.usedPromptUrl,
    promptUrlTooLong: launch.promptUrlTooLong,
  };
}
