import { useState } from "react";
import type {
  AppView,
  GroupProgress,
  ModeStats,
  ModuleProgress,
  ModuleRoute,
  ScoreSnapshot,
} from "../../core/types";
import ChatGptStudyButton from "../../core/components/ChatGptStudyButton";
import type { ChatGptStudyPromptResult } from "../../core/aiStudyPrompt";
import { makeScoreSnapshot, scoreBadgeTone, scoreFromStats } from "../../core/score";
import { setLastSelectedGroupId } from "../../core/storage";
import SciencePracticeSession from "./components/SciencePracticeSession";
import topicsData from "./data/topics.json";
import { buildScienceFinalPrepPrompt } from "./lib/finalPrepPrompt";
import { exerciseTotalForMode } from "./lib/score";
import type {
  SciencePracticeMode,
  ScienceRoute,
  ScienceTopic,
} from "./types";

const MODULE_ID = "science";
const topics = topicsData.topics as ScienceTopic[];

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
  mode: SciencePracticeMode;
  label: string;
  total: number;
  stats?: ModeStats;
};

const modeLabels: Record<string, string> = {
  multipleChoice: "שאלות ידע",
  wordBank: "השלמת משפטים",
  definitionChoice: "מושגים והגדרות",
  sequenceOrder: "סידור תהליך",
  scenarioAnalysis: "ניתוח מצבים",
};

const practiceModes: SciencePracticeMode[] = [
  "multipleChoice",
  "wordBank",
  "definitionChoice",
  "sequenceOrder",
  "scenarioAnalysis",
];

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

function topicById(id: string): ScienceTopic | undefined {
  return topics.find((topic) => topic.id === id);
}

function isScienceRoute(route: ModuleRoute | undefined): route is ScienceRoute {
  if (!route || typeof route.name !== "string") return false;
  if (route.name !== "pickMode" && !practiceModes.includes(route.name as SciencePracticeMode)) {
    return false;
  }

  return typeof route.topicId === "string";
}

function navigateToScienceRoute(navigate: Navigate, route: ScienceRoute): void {
  navigate({ name: "moduleRoute", moduleId: MODULE_ID, route });
}

function topicMeta(topic: ScienceTopic): string {
  const exerciseCount = practiceModes.reduce(
    (total, mode) => total + exerciseTotalForMode(topic, mode),
    0
  );
  return `${exerciseCount} תרגילים · ${practiceModes.length} מצבי תרגול`;
}

function activityBadgesForTopic(
  topic: ScienceTopic,
  progress: GroupProgress | undefined
): ActivityBadge[] {
  return practiceModes.map((mode) => ({
    mode,
    label: modeLabels[mode],
    total: exerciseTotalForMode(topic, mode),
    stats: progress?.[mode],
  }));
}

function isFinalPrepUnlocked(topic: ScienceTopic, progress: GroupProgress | undefined): boolean {
  return activityBadgesForTopic(topic, progress).every((badge) => {
    const score = scoreFromStats(badge.stats, badge.total);
    return scoreBadgeTone(score) === "great";
  });
}

function finalPrepMessage(result: ChatGptStudyPromptResult): string {
  if (!result.copied) {
    return "לא הצלחנו להעתיק את ההנחיה. נסו שוב, או פתחו את ChatGPT ידנית.";
  }

  if (!result.opened) {
    return "ההנחיה הועתקה. פתחו את ChatGPT והדביקו אותה בצ׳אט כדי להתחיל.";
  }

  if (result.promptUrlTooLong) {
    return "ההנחיה הועתקה ונפתח ChatGPT. בגלל אורך הנושא, הדביקו את ההנחיה בצ׳אט.";
  }

  return "ההנחיה הועתקה ונפתח ChatGPT. אם היא לא הופיעה אוטומטית, הדביקו אותה בצ׳אט.";
}

function ScienceHome({ progress, navigate }: Pick<ModuleRenderProps, "progress" | "navigate">) {
  const [finalPrepMessages, setFinalPrepMessages] = useState<Record<string, string>>({});

  const pickTopic = (topic: ScienceTopic) => {
    setLastSelectedGroupId(MODULE_ID, topic.id);
    navigateToScienceRoute(navigate, { name: "pickMode", topicId: topic.id });
  };

  const setFinalPrepMessage = (
    topicId: string,
    result: ChatGptStudyPromptResult
  ) => {
    setFinalPrepMessages((current) => ({
      ...current,
      [topicId]: finalPrepMessage(result),
    }));
  };

  return (
    <div className="app column">
      <header className="app-head">
        <h1 className="title">תרגול מדעים</h1>
        <p className="subtitle">בחר נושא ותתחיל לתרגל</p>
      </header>
      <main className="grow main-pad">
        <ul className="group-list">
          {topics.map((topic) => {
            const topicProgress = progress?.byGroup[topic.id];
            const activityBadges = activityBadgesForTopic(topic, topicProgress);
            const isUnlocked = isFinalPrepUnlocked(topic, topicProgress);
            const finalPrepStatus = finalPrepMessages[topic.id];

            return (
              <li key={topic.id} className="group-list-item">
                <button
                  type="button"
                  className="group-card"
                  onClick={() => pickTopic(topic)}
                >
                  <span className="group-title">{topic.title}</span>
                  <span className="group-meta">{topic.description}</span>
                  <span className="group-meta">{topicMeta(topic)}</span>
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
                {isUnlocked && (
                  <div className="final-prep-action">
                    <ChatGptStudyButton
                      prompt={buildScienceFinalPrepPrompt(topic)}
                      onResult={(result) => setFinalPrepMessage(topic.id, result)}
                    />
                    {finalPrepStatus && (
                      <p className="final-prep-status" role="status">
                        {finalPrepStatus}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function renderHome({ progress, navigate }: ModuleRenderProps) {
  return <ScienceHome progress={progress} navigate={navigate} />;
}

function renderModePicker(topic: ScienceTopic, navigate: Navigate) {
  return (
    <div className="app column">
      <header className="app-head">
        <h1 className="title">בחר מצב תרגול</h1>
        <p className="subtitle">{topic.title}</p>
      </header>
      <main className="grow main-pad column gap">
        {practiceModes.map((mode) => (
          <button
            key={mode}
            type="button"
            className="btn mode-btn huge science-mode-btn"
            onClick={() =>
              navigateToScienceRoute(navigate, {
                name: mode,
                topicId: topic.id,
              })
            }
          >
            <span>{topic.modes[mode].title}</span>
            <span>{topic.modes[mode].description}</span>
          </button>
        ))}
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
  if (!isScienceRoute(route)) {
    return renderHome({ sessionNonce, onRepeatSame, navigate, goHome });
  }

  const selectedTopic = topicById(route.topicId);
  const goModuleHome = () => navigate({ name: "moduleHome", moduleId: MODULE_ID });

  if (!selectedTopic) {
    return renderHome({ sessionNonce, onRepeatSame, navigate, goHome });
  }

  if (route.name === "pickMode") {
    return renderModePicker(selectedTopic, navigate);
  }

  return (
    <SciencePracticeSession
      key={`science-${selectedTopic.id}-${route.name}-${sessionNonce}`}
      topic={selectedTopic}
      mode={route.name}
      modeLabel={modeLabels[route.name]}
      onRepeatSame={onRepeatSame}
      onChangeTopic={goModuleHome}
      onHome={goModuleHome}
    />
  );
}

export const scienceModule = {
  id: MODULE_ID,
  title: "מדעים",
  description: "מערכת העצבים, חושים, תקשורת ותגובות.",
  groupCount: topics.length,
  modeLabels,
  renderHome,
  renderRoute,
};

export default scienceModule;
