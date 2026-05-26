import type { ActivityLogEntry, PracticeMode } from "../types";

type Props = {
  entries: ActivityLogEntry[];
};

const modeLabels: Record<PracticeMode, string> = {
  flashcard: "כרטיסיות",
  spelling: "איות",
  matching: "חיבור תרגומים",
  grammarChoice: "דקדוק",
  storyCloze: "סיפור והשלמה",
};

function entryTime(entry: ActivityLogEntry): number {
  const time = Date.parse(entry.runAt);
  return Number.isFinite(time) ? time : 0;
}

function formatDate(runAt: string): string {
  const date = new Date(runAt);
  if (Number.isNaN(date.getTime())) return "תאריך לא ידוע";

  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(runAt: string): string {
  const date = new Date(runAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function localDateKey(runAt: string): string {
  const date = new Date(runAt);
  if (Number.isNaN(date.getTime())) return "unknown";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ActivityLogPage({ entries }: Props) {
  const sortedEntries = [...entries].sort((a, b) => entryTime(b) - entryTime(a));
  const days = sortedEntries.reduce<Array<{ key: string; entries: ActivityLogEntry[] }>>(
    (groups, entry) => {
      const key = localDateKey(entry.runAt);
      const current = groups[groups.length - 1];

      if (current?.key === key) {
        current.entries.push(entry);
      } else {
        groups.push({ key, entries: [entry] });
      }

      return groups;
    },
    []
  );

  return (
    <div className="app column">
      <header className="app-head">
        <h1 className="title">יומן פעילות</h1>
        <p className="subtitle">כל אימון נשמר לפי היום והשעה שבהם תרגלת.</p>
      </header>

      <main className="grow main-pad">
        {days.length === 0 ? (
          <section className="activity-empty card" aria-live="polite">
            <p className="activity-empty__title">עדיין אין פעילות ביומן.</p>
            <p className="activity-empty__text">
              אחרי תרגול ראשון, האימון יופיע כאן עם השעה ומספר הפריטים שבוצעו.
            </p>
          </section>
        ) : (
          <ol className="activity-days">
            {days.map((day) => (
              <li key={day.key} className="activity-day">
                <h2 className="activity-day__date">{formatDate(day.entries[0].runAt)}</h2>
                <ul className="activity-list">
                  {day.entries.map((entry) => (
                    <li key={entry.id} className="activity-card">
                      <time className="activity-card__time" dateTime={entry.runAt}>
                        {formatTime(entry.runAt)}
                      </time>
                      <span className="activity-card__body">
                        <span className="activity-card__title">
                          {modeLabels[entry.mode]}
                        </span>
                        <span className="activity-card__group">{entry.groupTitle}</span>
                      </span>
                      <span className="activity-card__count">
                        {entry.itemCount} בוצעו
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
