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
    view.name === "home" ? undefined : groupById(view.groupId);

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

  const goHome = () => setView({ name: "home" });

  const isHome = view.name === "home";

  return (
    <>
      {/* ===== Navbar ===== */}
      <nav className="navbar">
        <h1 className="navbar-title">תרגול אנגלית</h1>
        {!isHome && (
          <button type="button" className="btn-nav" onClick={goHome}>
            ← תפריט ראשי
          </button>
        )}
      </nav>

      {/* ===== Page content ===== */}
      <div className="page-wrap">
        {view.name === "flashcard" && selectedGroup && (
          <FlashcardSession
            key={`fc-${selectedGroup.id}-${sessionNonce}`}
            group={selectedGroup}
            onRepeatSame={() => setSessionNonce((n) => n + 1)}
            onChangeMode={() =>
              setView({ name: "pickMode", groupId: selectedGroup.id })
            }
            onHome={goHome}
          />
        )}

        {view.name === "spelling" && selectedGroup && (
          <SpellingSession
            key={`sp-${selectedGroup.id}-${sessionNonce}`}
            group={selectedGroup}
            onRepeatSame={() => setSessionNonce((n) => n + 1)}
            onChangeMode={() =>
              setView({ name: "pickMode", groupId: selectedGroup.id })
            }
            onHome={goHome}
          />
        )}

        {view.name === "pickMode" && selectedGroup && (
          <div className="app column">
            <header className="app-head">
              <h1 className="title">בחר מצב תרגול</h1>
              <p className="subtitle">{selectedGroup.title}</p>
            </header>
            <main className="grow main-pad column gap">
              <button
                type="button"
                className="btn mode-btn huge"
                onClick={startFlashcards}
              >
                כרטיסיות — משמעות בעברית
              </button>
              <button
                type="button"
                className="btn mode-btn huge"
                onClick={startSpelling}
              >
                איות — שמיעה והקלדה
              </button>
            </main>
          </div>
        )}

        {view.name === "home" && (
          <div className="app column">
            <header className="app-head">
              <h1 className="title">בחר קבוצת מילים</h1>
              <p className="subtitle">בחר קבוצה ותתחיל לתרגל</p>
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
                                כרטיסיות: {fc.lastScoreNumerator}/
                                {fc.lastScoreDenominator}
                              </span>
                            )}
                            {fc && sp ? " · " : ""}
                            {sp && (
                              <span>
                                איות: {sp.lastScoreNumerator}/
                                {sp.lastScoreDenominator}
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
        )}
      </div>
    </>
  );
}
