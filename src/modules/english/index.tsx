import type {
  AppView,
  GroupProgress,
  ModeStats,
  ModuleProgress,
  ModuleRoute,
  ScoreSnapshot,
} from "../../core/types";
import { makeScoreSnapshot, scoreBadgeTone, scoreFromStats } from "../../core/score";
import { setLastSelectedGroupId } from "../../core/storage";
import wordGroupsData from "./data/wordGroups.json";
import FlashcardSession from "./components/FlashcardSession";
import GrammarChoiceSession from "./components/GrammarChoiceSession";
import MatchingSession from "./components/MatchingSession";
import PronounWritingSession from "./components/PronounWritingSession";
import SpellingSession from "./components/SpellingSession";
import StoryClozeSession from "./components/StoryClozeSession";
import { exerciseTotalForMode } from "./lib/score";
import type {
  EnglishPracticeMode,
  EnglishRoute,
  GrammarChoiceGroup,
  MatchingGroup,
  PronounWritingGroup,
  StoryClozeGroup,
  WordGroup,
  WordListGroup,
} from "./types";

const MODULE_ID = "english";
const groups = wordGroupsData.groups as WordGroup[];

type Navigate = (view: AppView) => void;

type ModuleRenderProps = {
  progress?: ModuleProgress;
  route?: ModuleRoute;
  sessionNonce: number;
  onRepeatSame: () => void;
  navigate: Navigate;
  goHome: () => void;
};

type ActivityBadge = {
  mode: EnglishPracticeMode;
  label: string;
  total: number;
  stats?: ModeStats;
};

const modeLabels: Record<string, string> = {
  flashcard: "כרטיסיות",
  spelling: "איות",
  matching: "חיבור תרגומים",
  grammarChoice: "דקדוק",
  pronounWriting: "כינויי גוף",
  storyCloze: "סיפור והשלמה",
};

function ScoreBadge({ label, score }: { label: string; score: ScoreSnapshot }) {
  const normalized = makeScoreSnapshot(score);
  const level = scoreBadgeTone(normalized);
  return (
    <span className={`score-badge score-badge--${level}`}>
      <span className="score-badge__label">{label}</span>
      <span className="score-badge__value">
        {normalized.correctCount}/{normalized.totalCount}
      </span>
    </span>
  );
}

function groupById(id: string): WordGroup | undefined {
  return groups.find((group) => group.id === id);
}

function isMatchingGroup(group: WordGroup): group is MatchingGroup {
  return group.exerciseType === "matching";
}

function isGrammarChoiceGroup(group: WordGroup): group is GrammarChoiceGroup {
  return group.exerciseType === "grammarChoice";
}

function isPronounWritingGroup(group: WordGroup): group is PronounWritingGroup {
  return group.exerciseType === "pronounWriting";
}

function isStoryClozeGroup(group: WordGroup): group is StoryClozeGroup {
  return group.exerciseType === "storyCloze";
}

function isWordListGroup(group: WordGroup): group is WordListGroup {
  return group.exerciseType === undefined || group.exerciseType === "standard";
}

function isEnglishRoute(route: ModuleRoute | undefined): route is EnglishRoute {
  if (!route || typeof route.name !== "string") return false;
  if (
    route.name !== "pickMode" &&
    route.name !== "flashcard" &&
    route.name !== "spelling" &&
    route.name !== "matching" &&
    route.name !== "grammarChoice" &&
    route.name !== "pronounWriting" &&
    route.name !== "storyCloze"
  ) {
    return false;
  }

  return typeof route.groupId === "string";
}

function navigateToEnglishRoute(navigate: Navigate, route: EnglishRoute): void {
  navigate({ name: "moduleRoute", moduleId: MODULE_ID, route });
}

function groupMeta(group: WordGroup): string {
  if (isGrammarChoiceGroup(group)) {
    return `${exerciseTotalForMode(group, "grammarChoice")} משפטים · דקדוק`;
  }

  if (isPronounWritingGroup(group)) {
    return `${exerciseTotalForMode(group, "pronounWriting")} משפטים · כינויי גוף`;
  }

  if (isStoryClozeGroup(group)) {
    return `${group.blanks.length} השלמות · סיפור + דקדוק`;
  }

  return `${group.words.length} מילים${isMatchingGroup(group) ? " · חיבור תרגומים" : ""}`;
}

function activityBadgesForGroup(
  group: WordGroup,
  progress: GroupProgress | undefined
): ActivityBadge[] {
  if (isWordListGroup(group)) {
    return [
      {
        mode: "flashcard",
        label: "כרטיסיות",
        total: exerciseTotalForMode(group, "flashcard"),
        stats: progress?.flashcard,
      },
      {
        mode: "spelling",
        label: "איות",
        total: exerciseTotalForMode(group, "spelling"),
        stats: progress?.spelling,
      },
    ];
  }

  if (isMatchingGroup(group)) {
    return [
      {
        mode: "matching",
        label: "חיבורים",
        total: exerciseTotalForMode(group, "matching"),
        stats: progress?.matching,
      },
    ];
  }

  if (isGrammarChoiceGroup(group)) {
    return [
      {
        mode: "grammarChoice",
        label: "דקדוק",
        total: exerciseTotalForMode(group, "grammarChoice"),
        stats: progress?.grammarChoice,
      },
    ];
  }

  if (isPronounWritingGroup(group)) {
    return [
      {
        mode: "pronounWriting",
        label: "כינויי גוף",
        total: exerciseTotalForMode(group, "pronounWriting"),
        stats: progress?.pronounWriting,
      },
    ];
  }

  return [
    {
      mode: "storyCloze",
      label: "סיפור",
      total: exerciseTotalForMode(group, "storyCloze"),
      stats: progress?.storyCloze,
    },
  ];
}

function routeForGroup(group: WordGroup): EnglishRoute {
  if (isMatchingGroup(group)) {
    return { name: "matching", groupId: group.id };
  }

  if (isGrammarChoiceGroup(group)) {
    return { name: "grammarChoice", groupId: group.id };
  }

  if (isPronounWritingGroup(group)) {
    return { name: "pronounWriting", groupId: group.id };
  }

  if (isStoryClozeGroup(group)) {
    return { name: "storyCloze", groupId: group.id };
  }

  return { name: "pickMode", groupId: group.id };
}

function renderHome({ progress, navigate }: ModuleRenderProps) {
  const pickGroup = (group: WordGroup) => {
    setLastSelectedGroupId(MODULE_ID, group.id);
    navigateToEnglishRoute(navigate, routeForGroup(group));
  };

  return (
    <div className="app column">
      <header className="app-head">
        <h1 className="title">תרגול אנגלית</h1>
        <p className="subtitle">בחר קבוצה ותתחיל לתרגל</p>
      </header>
      <main className="grow main-pad">
        <ul className="group-list">
          {groups.map((group) => {
            const groupProgress = progress?.byGroup[group.id];
            const activityBadges = activityBadgesForGroup(group, groupProgress);
            return (
              <li key={group.id}>
                <button
                  type="button"
                  className="group-card"
                  onClick={() => pickGroup(group)}
                >
                  <span className="group-title">{group.title}</span>
                  <span className="group-meta">{groupMeta(group)}</span>
                  <span className="group-scores">
                    {activityBadges.map((badge) => (
                      <ScoreBadge
                        key={badge.mode}
                        label={badge.label}
                        score={scoreFromStats(badge.stats, badge.total)}
                      />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function renderRoute({
  route,
  sessionNonce,
  onRepeatSame,
  navigate,
  goHome,
}: ModuleRenderProps) {
  if (!isEnglishRoute(route)) return renderHome({ sessionNonce, onRepeatSame, navigate, goHome });

  const selectedGroup = groupById(route.groupId);
  const goModuleHome = () => navigate({ name: "moduleHome", moduleId: MODULE_ID });
  const goPickMode = () =>
    navigateToEnglishRoute(navigate, { name: "pickMode", groupId: route.groupId });

  if (route.name === "flashcard" && selectedGroup && isWordListGroup(selectedGroup)) {
    return (
      <FlashcardSession
        key={`fc-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeMode={goPickMode}
        onHome={goModuleHome}
      />
    );
  }

  if (route.name === "spelling" && selectedGroup && isWordListGroup(selectedGroup)) {
    return (
      <SpellingSession
        key={`sp-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeMode={goPickMode}
        onHome={goModuleHome}
      />
    );
  }

  if (route.name === "matching" && selectedGroup && isMatchingGroup(selectedGroup)) {
    return (
      <MatchingSession
        key={`mt-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeGroup={goModuleHome}
        onHome={goModuleHome}
      />
    );
  }

  if (
    route.name === "grammarChoice" &&
    selectedGroup &&
    isGrammarChoiceGroup(selectedGroup)
  ) {
    return (
      <GrammarChoiceSession
        key={`gc-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeGroup={goModuleHome}
        onHome={goModuleHome}
      />
    );
  }

  if (
    route.name === "pronounWriting" &&
    selectedGroup &&
    isPronounWritingGroup(selectedGroup)
  ) {
    return (
      <PronounWritingSession
        key={`pw-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeGroup={goModuleHome}
        onHome={goModuleHome}
      />
    );
  }

  if (route.name === "storyCloze" && selectedGroup && isStoryClozeGroup(selectedGroup)) {
    return (
      <StoryClozeSession
        key={`sc-${selectedGroup.id}-${sessionNonce}`}
        group={selectedGroup}
        onRepeatSame={onRepeatSame}
        onChangeGroup={goModuleHome}
        onHome={goModuleHome}
      />
    );
  }

  if (route.name === "pickMode" && selectedGroup && isWordListGroup(selectedGroup)) {
    return (
      <div className="app column">
        <header className="app-head">
          <h1 className="title">בחר מצב תרגול</h1>
          <p className="subtitle">{selectedGroup.title}</p>
        </header>
        <main className="grow main-pad column gap">
          <button
            type="button"
            className="btn mode-btn huge"
            onClick={() =>
              navigateToEnglishRoute(navigate, {
                name: "flashcard",
                groupId: selectedGroup.id,
              })
            }
          >
            כרטיסיות — משמעות בעברית
          </button>
          <button
            type="button"
            className="btn mode-btn huge"
            onClick={() =>
              navigateToEnglishRoute(navigate, {
                name: "spelling",
                groupId: selectedGroup.id,
              })
            }
          >
            איות — שמיעה והקלדה
          </button>
        </main>
      </div>
    );
  }

  return renderHome({ sessionNonce, onRepeatSame, navigate, goHome });
}

export const englishModule = {
  id: MODULE_ID,
  title: "אנגלית",
  description: "אוצר מילים, איות, חיבור תרגומים ודקדוק באנגלית.",
  groupCount: groups.length,
  modeLabels,
  renderHome,
  renderRoute,
};

export default englishModule;
