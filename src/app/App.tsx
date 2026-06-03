import { useEffect, useMemo, useState } from "react";
import type { ActivityLogEntry } from "../core/types";
import ActivityLogPage from "../core/components/ActivityLogPage";
import { useAppNavigation } from "../core/navigation";
import { loadProgress } from "../core/storage";
import englishModule from "../modules/english";

const learningModules = [englishModule] as const;

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
}

type InstallNotice = {
  tone: "info" | "success";
  text: string;
};

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function moduleById(id: string) {
  return learningModules.find((learningModule) => learningModule.id === id);
}

function modeLabelForEntry(entry: ActivityLogEntry): string {
  const learningModule = moduleById(entry.moduleId);
  return learningModule?.modeLabels[entry.mode] ?? entry.mode;
}

export default function App() {
  const { view, navigate, goHome } = useAppNavigation();
  const [sessionNonce, setSessionNonce] = useState(0);
  const [progressRefreshNonce, setProgressRefreshNonce] = useState(0);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay);
  const [installNotice, setInstallNotice] = useState<InstallNotice | null>(null);
  const progress = useMemo(
    () => loadProgress(),
    [view, sessionNonce, progressRefreshNonce]
  );

  const isHome = view.name === "home";
  const isActivity = view.name === "activity";
  const showInstallButton = isHome && !isInstalled;
  const currentModule =
    view.name === "moduleHome" || view.name === "moduleRoute"
      ? moduleById(view.moduleId)
      : undefined;

  useEffect(() => {
    if (view.name === "activity") {
      setProgressRefreshNonce((nonce) => nonce + 1);
    }
  }, [view.name]);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const updateInstallState = () => {
      if (isStandaloneDisplay()) {
        setIsInstalled(true);
        setInstallPrompt(null);
        setInstallNotice(null);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setInstallNotice({
        tone: "success",
        text: "האפליקציה הותקנה בהצלחה במסך הבית.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayModeQuery.addEventListener("change", updateInstallState);
    updateInstallState();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayModeQuery.removeEventListener("change", updateInstallState);
    };
  }, []);

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setInstallNotice({
          tone: "success",
          text: "מעולה, האפליקציה תופיע במסך הבית לאחר סיום ההתקנה.",
        });
      }
      return;
    }

    setInstallNotice({
      tone: "info",
      text: isIosDevice()
        ? "ב-iPhone או iPad: לחצו על כפתור השיתוף בדפדפן ואז על \"הוסף למסך הבית\"."
        : "אם לא נפתח חלון התקנה, פתחו את תפריט הדפדפן ובחרו \"התקנת אפליקציה\" או \"הוספה למסך הבית\".",
    });
  };

  return (
    <>
      {/* ===== Navbar ===== */}
      <nav className="navbar">
        <h1 className="navbar-title">מרכז למידה</h1>
        {!isActivity && (
          <button
            type="button"
            className="btn-nav"
            onClick={() => navigate({ name: "activity" })}
          >
            יומן פעילות
          </button>
        )}
        {showInstallButton && (
          <button
            type="button"
            className="btn-nav btn-install"
            onClick={installApp}
          >
            התקן אפליקציה
          </button>
        )}
        {!isHome && (
          <button type="button" className="btn-nav" onClick={goHome}>
            ← תפריט ראשי
          </button>
        )}
      </nav>

      {/* ===== Page content ===== */}
      <div className="page-wrap">
        {view.name === "activity" && (
          <ActivityLogPage
            entries={progress.activityLog ?? []}
            getModeLabel={modeLabelForEntry}
          />
        )}

        {view.name === "moduleHome" &&
          currentModule?.renderHome({
            progress: progress.byModule[currentModule.id],
            sessionNonce,
            onRepeatSame: () => setSessionNonce((n) => n + 1),
            navigate,
            goHome,
          })}

        {view.name === "moduleRoute" &&
          currentModule?.renderRoute({
            progress: progress.byModule[currentModule.id],
            route: view.route,
            sessionNonce,
            onRepeatSame: () => setSessionNonce((n) => n + 1),
            navigate,
            goHome,
          })}

        {(view.name === "moduleHome" || view.name === "moduleRoute") &&
          !currentModule && (
            <div className="app column">
              <header className="app-head">
                <h1 className="title">המודול לא נמצא</h1>
                <p className="subtitle">חזרו לתפריט הראשי ובחרו נושא לימוד.</p>
              </header>
            </div>
        )}

        {view.name === "home" && (
          <div className="app column">
            <header className="app-head">
              <h1 className="title">בחר נושא לימוד</h1>
              <p className="subtitle">בחר מודול ותתחיל לתרגל</p>
            </header>
            {installNotice && (
              <aside
                className={`install-notice install-notice--${installNotice.tone}`}
                role="status"
              >
                <span>{installNotice.text}</span>
                <button
                  type="button"
                  className="install-notice__close"
                  aria-label="סגירת הודעת התקנה"
                  onClick={() => setInstallNotice(null)}
                >
                  ×
                </button>
              </aside>
            )}
            <main className="grow main-pad">
              <ul className="group-list">
                {learningModules.map((learningModule) => (
                  <li key={learningModule.id}>
                    <button
                      type="button"
                      className="group-card"
                      onClick={() =>
                        navigate({
                          name: "moduleHome",
                          moduleId: learningModule.id,
                        })
                      }
                    >
                      <span className="group-title">{learningModule.title}</span>
                      <span className="group-meta">
                        {learningModule.description}
                      </span>
                      <span className="group-meta">
                        {learningModule.groupCount} קבוצות תרגול
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </main>
          </div>
        )}
      </div>
    </>
  );
}
