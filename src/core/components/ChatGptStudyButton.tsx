import { useState } from "react";
import {
  openChatGptStudyPrompt,
  type ChatGptStudyPromptResult,
} from "../aiStudyPrompt";

type Props = {
  prompt: string;
  label?: string;
  onResult?: (result: ChatGptStudyPromptResult) => void;
};

function ChatGptIcon() {
  return (
    <svg
      className="final-prep-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 2.25a4.35 4.35 0 0 0-4.18 3.13 4.37 4.37 0 0 0-4.44 6.78 4.35 4.35 0 0 0 2.84 6.45 4.36 4.36 0 0 0 6.86 2.78 4.35 4.35 0 0 0 6.6-4.28 4.36 4.36 0 0 0 .5-7.2A4.35 4.35 0 0 0 12 2.25Zm0 1.8a2.55 2.55 0 0 1 2.5 2.07l-3.36 1.94a.9.9 0 0 0-.45.78v4.05l-1.62-.94V8.32l4.52-2.61a.9.9 0 0 0-.9-1.56L8.85 6.48A2.55 2.55 0 0 1 12 4.05Zm-5.1 3.08c.3 0 .6.05.89.16v3.93l-3.5 2.02a2.56 2.56 0 0 1 1.92-4.4.9.9 0 0 0 .69-1.71Zm9.18.1a2.56 2.56 0 0 1 2.04 4.18l-3.37-1.94a.9.9 0 0 0-.9 0l-3.51 2.03V9.63l3.14-1.81 3.05 1.76a.9.9 0 0 0 .9-1.56l-1.35-.79Zm-2.68 4.06 1.62.94v3.62l-3.15 1.82-3.03-1.75a.9.9 0 1 0-.9 1.56l1.32.76a2.56 2.56 0 0 1-4.14-2.01l3.36-1.94a.9.9 0 0 0 .45-.78V9.46l1.62.94v3.63a.9.9 0 0 0 1.8 0v-2.8l1.05.06Zm3.27.62 2.55 1.47a2.56 2.56 0 0 1-1.2 2.03.9.9 0 0 0-.4.83 2.55 2.55 0 0 1-3.28 2.72l1.36-.78a.9.9 0 0 0 .45-.78v-4.04l.52-1.45Zm-9.54 1.35v1.87l-2.54 1.47a2.55 2.55 0 0 1 .02-1.8l2.52-1.54Zm4.42 1.79 1.62.94-1.63.94-1.62-.94 1.63-.94Z"
      />
    </svg>
  );
}

export default function ChatGptStudyButton({
  prompt,
  label = "תרגול מסכם ב-ChatGPT",
  onResult,
}: Props) {
  const [isLaunching, setIsLaunching] = useState(false);

  const launch = async () => {
    if (isLaunching) return;

    setIsLaunching(true);
    const result = await openChatGptStudyPrompt(prompt);
    onResult?.(result);
    setIsLaunching(false);
  };

  return (
    <button
      type="button"
      className="final-prep-button"
      onClick={launch}
      disabled={isLaunching}
    >
      <ChatGptIcon />
      <span>{isLaunching ? "פותח את ChatGPT..." : label}</span>
    </button>
  );
}
