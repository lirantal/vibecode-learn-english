import { useMemo, useState } from "react";
import type { AppView, WordGroup } from "./types";
import wordGroupsData from "./data/wordGroups.json";
import FlashcardSession from "./components/FlashcardSession";
import SpellingSession from "./components/SpellingSession";
import { loadProgress, setLastSelectedGroupId } from "./lib/storage";

const data = wordGroupsData.groups;

function groupById(id: string): WordGroup | undefined {
  return data.find((g) => g.id === id);
}

export default function App() {
  const [view, setView] = useState<AppView>({ name: "home" });
  const [sessionNonce, setSessionNonce] = useState(0);
  const progress = useMemo(() => loadProgress(), [view, sessionNonce]);

  const selectedGroup =
    view.name === "home"
      ? undefined
      : groupById(view.groupId);

  const pickGroup = (g: WordGroup) => {
    setLastSelectedGroupId(g.id);
    setView({ name: "pickMode", groupId: g.id });
  };

  const startFlashcards = () => {
    if (view.name !== "pickMode") return;
    setView({ name: "flashcard", groupId: view.groupId });
  };

  const startSpelling = () => {
    if (view.name !== "pickMode") return;
    setView({ name: "spelling", groupId: view.groupId });
  };

  if (view.name === "flashcard" && selectedGroup) {
    return (
      <FlashcardSession
        key={`fc-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={() => setSessionNonce((n) => n + 1)}
        onChangeMode={() => setView({ name: "pickMode", groupId: selectedGroup.id })}
        onHome={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "spelling" && selectedGroup) {
    return (
      <SpellingSession
        key={`sp-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={() => setSessionNonce((n) => n + 1)}
        onChangeMode={() => setView({ name: "pickMode", groupId: selectedGroup.id })}
        onHome={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "pickMode" && selectedGroup) {
    return (
      <div className="app column">
        <header className="app-head">
          <button
            type="button"
            className="btn back"
            onClick={() => setView({ name: "home" })}
          >
            ← חזרה
          </button>
          <h1 className="title">בחר מצב</h1>
          <p className="subtitle">{selectedGroup.title}</p>
        </header>
        <main className="grow main-pad column gap">
          <button
            type="button"
            className="btn primary huge"
            onClick={startFlashcards}
          >
            כרטיסיות — משמעות בעברית
          </button>
          <button
            type="button"
            className="btn secondary huge"
            onClick={startSpelling}
          >
            איות — שמיעה והקלדה
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app column">
      <header className="app-head">
        <h1 className="title">תרגול אנגלית</h1>
        <p className="subtitle">בחר קבוצת מילים</p>
      </header>
      <main className="grow main-pad">
        <ul className="group-list">
          {data.map((g) => {
            const p = progress.byGroup[g.id];
            const fc = p?.flashcard;
            const sp = p?.spelling;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="group-card"
                  onClick={() => pickGroup(g)}
                >
                  <span className="group-title">{g.title}</span>
                  <span className="group-meta">{g.words.length} מילים</span>
                  {(fc || sp) && (
                    <span className="group-scores">
                      {fc && (
                        <span>
                          כרטיסיות: {fc.lastScoreNumerator}/{fc.lastScoreDenominator}
                        </span>
                      )}
                      {fc && sp ? " · " : ""}
                      {sp && (
                        <span>
                          איות: {sp.lastScoreNumerator}/{sp.lastScoreDenominator}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
