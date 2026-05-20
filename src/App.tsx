import { useMemo, useState } from "react";
import type {
  AppView,
  GrammarChoiceGroup,
  MatchingGroup,
  WordGroup,
  WordListGroup,
} from "./types";
import wordGroupsData from "./data/wordGroups.json";
import FlashcardSession from "./components/FlashcardSession";
import GrammarChoiceSession from "./components/GrammarChoiceSession";
import MatchingSession from "./components/MatchingSession";
import SpellingSession from "./components/SpellingSession";
import { loadProgress, setLastSelectedGroupId } from "./lib/storage";

const data = wordGroupsData.groups as WordGroup[];

function ScoreBadge({ label, score, total }: { label: string; score: number; total: number }) {
  const pct = total > 0 ? score / total : 0;
  const level = pct >= 0.8 ? "great" : pct >= 0.5 ? "ok" : "weak";
  return (
    <span className={`score-badge score-badge--${level}`}>
      <span className="score-badge__label">{label}</span>
      <span className="score-badge__value">{score}/{total}</span>
    </span>
  );
}

function groupById(id: string): WordGroup | undefined {
  return data.find((g) => g.id === id);
}

function isMatchingGroup(group: WordGroup): group is MatchingGroup {
  return group.exerciseType === "matching";
}

function isGrammarChoiceGroup(group: WordGroup): group is GrammarChoiceGroup {
  return group.exerciseType === "grammarChoice";
}

function isWordListGroup(group: WordGroup): group is WordListGroup {
  return group.exerciseType === undefined || group.exerciseType === "standard";
}

function groupMeta(group: WordGroup): string {
  if (isGrammarChoiceGroup(group)) {
    return `${group.sentences.length} משפטים · דקדוק`;
  }

  return `${group.words.length} מילים${isMatchingGroup(group) ? " · חיבור תרגומים" : ""}`;
}

export default function App() {
  const [view, setView] = useState<AppView>({ name: "home" });
  const [sessionNonce, setSessionNonce] = useState(0);
  const progress = useMemo(() => loadProgress(), [view, sessionNonce]);

  const selectedGroup =
    view.name === "home" ? undefined : groupById(view.groupId);

  const pickGroup = (g: WordGroup) => {
    setLastSelectedGroupId(g.id);
    if (isMatchingGroup(g)) {
      setView({ name: "matching", groupId: g.id });
      return;
    }

    if (isGrammarChoiceGroup(g)) {
      setView({ name: "grammarChoice", groupId: g.id });
      return;
    }

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
        {view.name === "flashcard" && selectedGroup && isWordListGroup(selectedGroup) && (
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

        {view.name === "spelling" && selectedGroup && isWordListGroup(selectedGroup) && (
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

        {view.name === "matching" && selectedGroup && isMatchingGroup(selectedGroup) && (
          <MatchingSession
            key={`mt-${selectedGroup.id}-${sessionNonce}`}
            group={selectedGroup}
            onRepeatSame={() => setSessionNonce((n) => n + 1)}
            onChangeGroup={goHome}
            onHome={goHome}
          />
        )}

        {view.name === "grammarChoice" && selectedGroup && isGrammarChoiceGroup(selectedGroup) && (
          <GrammarChoiceSession
            key={`gc-${selectedGroup.id}-${sessionNonce}`}
            group={selectedGroup}
            onRepeatSame={() => setSessionNonce((n) => n + 1)}
            onChangeGroup={goHome}
            onHome={goHome}
          />
        )}

        {view.name === "pickMode" && selectedGroup && isWordListGroup(selectedGroup) && (
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
                  const mt = p?.matching;
                  const gc = p?.grammarChoice;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        className="group-card"
                        onClick={() => pickGroup(g)}
                      >
                        <span className="group-title">{g.title}</span>
                        <span className="group-meta">
                          {groupMeta(g)}
                        </span>
                        {(fc || sp || mt || gc) && (
                          <span className="group-scores">
                            {fc && (
                              <ScoreBadge
                                label="כרטיסיות"
                                score={fc.lastScoreNumerator}
                                total={fc.lastScoreDenominator}
                              />
                            )}
                            {sp && (
                              <ScoreBadge
                                label="איות"
                                score={sp.lastScoreNumerator}
                                total={sp.lastScoreDenominator}
                              />
                            )}
                            {mt && (
                              <ScoreBadge
                                label="חיבורים"
                                score={mt.lastScoreNumerator}
                                total={mt.lastScoreDenominator}
                              />
                            )}
                            {gc && (
                              <ScoreBadge
                                label="דקדוק"
                                score={gc.lastScoreNumerator}
                                total={gc.lastScoreDenominator}
                              />
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
