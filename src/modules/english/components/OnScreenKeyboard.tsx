const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type Props = {
  onLetter: (ch: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  enterDisabled?: boolean;
};

export default function OnScreenKeyboard({
  onLetter,
  onBackspace,
  onEnter,
  enterDisabled,
}: Props) {
  return (
    <div className="osk" aria-label="On-screen keyboard">
      {ROWS.map((row) => (
        <div key={row} className="osk-row">
          {row.split("").map((ch) => (
            <button
              key={ch}
              type="button"
              className="osk-key"
              onClick={() => onLetter(ch.toLowerCase())}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="osk-row osk-row-wide">
        <button type="button" className="osk-key osk-wide" onClick={onBackspace}>
          ⌫
        </button>
        <button
          type="button"
          className="osk-key osk-enter"
          disabled={enterDisabled}
          onClick={onEnter}
        >
          בדיקה
        </button>
      </div>
    </div>
  );
}
