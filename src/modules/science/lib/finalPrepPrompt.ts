import type {
  ScienceChoiceItem,
  ScienceDefinitionItem,
  SciencePracticeMode,
  ScienceScenarioItem,
  ScienceSequenceItem,
  ScienceTopic,
  ScienceWordBankItem,
} from "../types";

const practiceModes: SciencePracticeMode[] = [
  "multipleChoice",
  "wordBank",
  "definitionChoice",
  "sequenceOrder",
  "scenarioAnalysis",
];

function lineList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function explanationLine(item: { explanation?: string }): string {
  return item.explanation ? `\n  הסבר: ${item.explanation}` : "";
}

function formatChoiceItem(item: ScienceChoiceItem): string {
  return `- שאלה: ${item.prompt}\n  תשובה נכונה: ${item.correctChoice}${explanationLine(item)}`;
}

function formatWordBankItem(item: ScienceWordBankItem): string {
  const sentence = `${item.prefix}${item.correctChoice}${item.suffix}`;
  const hint = item.hint ? `\n  רמז: ${item.hint}` : "";
  return `- משפט: ${item.prefix}___${item.suffix}\n  תשובה נכונה: ${item.correctChoice}\n  המשפט המלא: ${sentence}${hint}`;
}

function formatDefinitionItem(item: ScienceDefinitionItem): string {
  return `- מושג: ${item.term}\n  שאלה: ${item.prompt}\n  תשובה נכונה: ${item.correctChoice}${explanationLine(item)}`;
}

function formatSequenceItem(item: ScienceSequenceItem): string {
  return `- משימה: ${item.prompt}\n  הסדר הנכון:\n${numberedList(item.steps)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}${explanationLine(item)}`;
}

function formatScenarioItem(item: ScienceScenarioItem): string {
  return `- מצב: ${item.scenario}\n  שאלה: ${item.prompt}\n  תשובה נכונה: ${item.correctChoice}${explanationLine(item)}`;
}

function formatModeItems(topic: ScienceTopic, mode: SciencePracticeMode): string {
  if (mode === "multipleChoice") {
    return topic.multipleChoice.map(formatChoiceItem).join("\n");
  }

  if (mode === "wordBank") {
    return topic.wordBank.map(formatWordBankItem).join("\n");
  }

  if (mode === "definitionChoice") {
    return topic.definitionChoice.map(formatDefinitionItem).join("\n");
  }

  if (mode === "sequenceOrder") {
    return topic.sequenceOrder.map(formatSequenceItem).join("\n");
  }

  return topic.scenarioAnalysis.map(formatScenarioItem).join("\n");
}

function keyConcepts(topic: ScienceTopic): string {
  return lineList(
    topic.definitionChoice.map(
      (item) => `${item.term}: ${item.correctChoice}`
    )
  );
}

export function buildScienceFinalPrepPrompt(topic: ScienceTopic): string {
  const modeSections = practiceModes
    .map((mode) => {
      const modeTitle = topic.modes[mode].title;
      return `## ${modeTitle}\n${formatModeItems(topic, mode)}`;
    })
    .join("\n\n");

  return `אתה מורה פרטי בעברית לתלמיד/ה שלמד/ה את הנושא הבא במדעים.

נושא: ${topic.title}
תיאור הנושא: ${topic.description}

המטרה: הכנה מסכמת בסגנון ראיון לקראת בדיקה אחרונה של הבנה.

הנחיות לניהול הראיון:
- שאל/י 10 עד 15 שאלות בסך הכל.
- שאל/י שאלה אחת בלבד בכל פעם, וחכה/י לתשובת התלמיד/ה.
- השתמש/י בחומר ובתשובות הנכונות שבהמשך כמפתח בדיקה, אבל אל תציג/י לתלמיד/ה את כל התשובות מראש.
- ערבב/י בין שאלות ידע, מושגים, השלמת תהליכים ויישום במצבים מהחיים.
- אם התלמיד/ה מתקשה או עונה חלקית, הסבר/י בקצרה את הפער ואז שאל/י שאלת המשך קצרה.
- אם התשובה נכונה, אשר/י בקצרה והמשך/י לשאלה הבאה.
- בסוף הראיון תן/י סיכום מוכנות: מה מובן היטב, מה צריך חיזוק, ומה כדאי לחזור עליו.

## מושגי מפתח
${keyConcepts(topic)}

## חומר הלימוד ומפתח תשובות
${modeSections}

התחל/י עכשיו בשאלה הראשונה בלבד.`;
}
