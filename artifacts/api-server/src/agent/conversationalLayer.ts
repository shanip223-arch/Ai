/**
 * Conversational Behavior Layer
 * Makes the agent feel like a real human developer assistant.
 *
 * Responsibilities:
 *  1. Clarity assessment — decide whether to generate or ask one focused question
 *  2. One-at-a-time clarification — never overwhelm with multiple questions
 *  3. Natural Hinglish-friendly message rendering — warm, brief, developer-style
 *  4. Quick reply generation — contextual chips so users can respond with one tap
 *  5. Acknowledgment messages — greet follow-ups naturally before generating
 */

import type { ConversationSession } from "./conversationMemory.js";
import type { NormalizedCommand } from "./languageNormalizer.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClarityLevel = "high" | "medium" | "low";
export type ResponseMode = "generate" | "clarify" | "acknowledge";

export interface ClarityAssessment {
  level: ClarityLevel;
  responseMode: ResponseMode;
  missingInfo: string[];           // what's unclear
  clarificationQuestion: string | null;
  quickReplies: string[];
  acknowledgment: string | null;   // warm opener before generating
}

// ─── Openers & tone pools (randomly sampled for naturalness) ─────────────────

const OPENERS_POSITIVE = [
  "Got it!",
  "Bilkul!",
  "Sure thing!",
  "Perfect!",
  "Sahi hai!",
  "Alright!",
  "Samajh gaya!",
  "Okay, chal!",
];

const OPENERS_FOLLOWUP = [
  "Got it, let me update that.",
  "Bilkul, abhi karta hoon.",
  "Sure, applying your changes.",
  "Theek hai, tweak kar deta hoon.",
  "Sahi, let me refine it.",
  "Okay, updating now.",
];

const OPENERS_CONFIRM = [
  "Generating your",
  "Building your",
  "Creating your",
  "Making your",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Clarity detection ────────────────────────────────────────────────────────

const VAGUE_TRIGGERS = [
  "kuch", "koi", "ek", "page", "website", "site", "cheez",
  "help", "bana", "banao", "create", "make", "build",
];

const DEFINITIVE_PAGE_TYPES = [
  "login", "dashboard", "landing", "index", "register", "signup",
  "profile", "form", "contact", "gallery", "portfolio", "admin",
  "home", "homepage", "auth",
];

const AFFIRMATIVE_RESPONSES = [
  "haan", "han", "yes", "yeah", "yep", "sure", "ok", "okay", "theek",
  "bilkul", "zaroor", "ji", "ha", "correct", "right", "perfect",
  "good", "great", "nice", "go ahead", "do it", "karo", "kar do",
];

const NEGATIVE_RESPONSES = [
  "nahi", "no", "nope", "not", "mat", "raho", "skip", "ignore",
  "don't", "dont", "nahin",
];

function isVagueInput(input: string, normalized: NormalizedCommand): boolean {
  const lower = input.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  // Very short with no page type
  if (wordCount <= 2 && !normalized.pageType) return true;

  // Only vague trigger words, nothing specific
  const nonVagueWords = lower.split(/\s+/).filter(
    (w) => w.length > 3 && !VAGUE_TRIGGERS.includes(w)
  );
  if (nonVagueWords.length === 0 && !normalized.pageType) return true;

  return false;
}

function isAffirmativeOrFollowUp(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return AFFIRMATIVE_RESPONSES.some((r) => lower.includes(r)) ||
    lower.length < 30;
}

function hasEnoughContextInSession(session: ConversationSession): boolean {
  const cond = session.collectedConditions;
  return !!(cond.pageType); // at minimum we need a page type
}

// ─── Clarification question generator (one at a time) ─────────────────────────

interface ClarificationConfig {
  question: string;
  quickReplies: string[];
}

function getNextClarifyingQuestion(
  normalized: NormalizedCommand,
  session: ConversationSession
): ClarificationConfig | null {
  const cond = session.collectedConditions;

  // Priority 1 — Page type (most critical)
  if (!normalized.pageType && !cond.pageType) {
    return {
      question: "Kaun sa page banana hai? (Which page should I build?)",
      quickReplies: ["Login page", "Dashboard", "Landing page", "Register page", "Contact form", "Admin panel"],
    };
  }

  // Priority 2 — Theme (only ask if not mentioned and session has no preference yet)
  if (!cond.colorScheme && !normalized.uiStyle.includes("dark") && !normalized.uiStyle.includes("light")) {
    const pageType = normalized.pageType ?? cond.pageType ?? "page";
    return {
      question: `Theek hai! ${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page ke liye — dark theme chahiye ya light?`,
      quickReplies: ["Dark theme", "Light theme", "Don't mind, default"],
    };
  }

  // No more questions needed — we have enough to generate
  return null;
}

// ─── Message renderer — natural Hinglish developer tone ──────────────────────

export function renderClarificationMessage(config: ClarificationConfig): string {
  return config.question;
}

export function renderAcknowledgment(
  normalized: NormalizedCommand,
  session: ConversationSession,
  isFollowUp: boolean
): string {
  if (isFollowUp) {
    return pick(OPENERS_FOLLOWUP);
  }

  const pageType = normalized.pageType ?? session.collectedConditions.pageType ?? "page";
  const styleParts: string[] = [];

  const scheme = session.collectedConditions.colorScheme ?? (normalized.uiStyle.includes("dark") ? "dark" : null);
  if (scheme) styleParts.push(scheme);

  const styles = [...(session.collectedConditions.uiStyle ?? []), ...normalized.uiStyle]
    .filter((s, i, a) => a.indexOf(s) === i && s !== "clean" && s !== "modern");
  if (styles.length > 0) styleParts.push(styles[0]);

  const styleStr = styleParts.length > 0 ? ` ${styleParts.join(", ")}` : "";
  return `${pick(OPENERS_CONFIRM)}${styleStr} ${pageType} page...`;
}

export function renderCompletionMessage(
  pageType: string,
  filename: string,
  validationScore: number,
  confidenceScore: number,
  regenerated: boolean,
  followUpQuestions: string[]
): string {
  const grade =
    validationScore >= 90 ? "A" : validationScore >= 75 ? "B" : validationScore >= 60 ? "C" : "D";

  const lines: string[] = [];

  lines.push(`✅ Done! **${filename}** ready.`);

  if (validationScore >= 75) {
    lines.push(`Quality: ${validationScore}/100 (Grade ${grade}) ✨`);
  } else {
    lines.push(`Quality: ${validationScore}/100 (Grade ${grade})`);
  }

  if (regenerated) {
    lines.push("🔁 Auto-improved once to meet quality threshold.");
  }

  if (followUpQuestions.length > 0) {
    lines.push(`\n${followUpQuestions[0]}`);
  }

  return lines.join("\n");
}

export function renderErrorMessage(errMsg: string): string {
  const starters = [
    "Arre, kuch toh gadbad ho gayi.",
    "Oops! Something went wrong.",
    "Yaar, ek error aa gaya.",
  ];
  return `${pick(starters)} ${errMsg}. Dobara try karte hain?`;
}

// ─── Post-generation quick replies ────────────────────────────────────────────

export function getPostGenerationReplies(
  pageType: string,
  session: ConversationSession
): string[] {
  const features = session.collectedConditions.mentionedFeatures ?? [];
  const isDark = session.collectedConditions.colorScheme === "dark";
  const replies: string[] = [];

  replies.push("Make changes");

  if (!isDark) replies.push("Dark mode version");
  else replies.push("Light mode version");

  if (pageType === "login" || pageType === "register") {
    if (!features.includes("social login")) replies.push("Add Google login");
    replies.push("Create matching dashboard");
  } else if (pageType === "dashboard") {
    if (!features.includes("charts")) replies.push("Add charts");
    replies.push("Add more stats");
  } else if (pageType === "index") {
    replies.push("Add pricing section");
    replies.push("Create About page");
  }

  if (!features.includes("backend API")) replies.push("Add backend API");

  replies.push("New page");

  return replies.slice(0, 4);
}

// ─── Theme question helper ────────────────────────────────────────────────────

function getThemeQuestion(pageType: string, pageLabel: string): ClarificationConfig {
  const pageContext: Record<string, { q: string; replies: string[] }> = {
    login: {
      q: `Nice! Login page ke liye — dark theme chahiye ya light? (Aur koi preference, jaise minimal ya glassmorphism?)`,
      replies: ["Dark theme", "Light theme", "Dark + minimal", "Glassmorphism style"],
    },
    dashboard: {
      q: `Dashboard ke liye — dark sidebar chahiye ya light? Any specific color scheme?`,
      replies: ["Dark theme", "Light theme", "Dark blue", "Dark purple"],
    },
    index: {
      q: `Landing page ke liye — dark background ya light? Aur koi brand color?`,
      replies: ["Dark background", "Light background", "Dark + purple", "Clean white"],
    },
    register: {
      q: `Register page ke liye — dark theme ya light? Koi specific style?`,
      replies: ["Dark theme", "Light theme", "Minimal dark", "Clean white"],
    },
    form: {
      q: `Contact form ke liye — dark style chahiye ya light/clean?`,
      replies: ["Dark theme", "Light theme", "Clean minimal", "Don't mind"],
    },
  };

  const config = pageContext[pageType] ?? {
    q: `${pageLabel} page ke liye — dark theme chahiye ya light?`,
    replies: ["Dark theme", "Light theme", "Don't mind, use default"],
  };

  return { question: config.q, quickReplies: config.replies };
}

// ─── Main assessment function ─────────────────────────────────────────────────

export function assessAndPlan(
  rawInput: string,
  normalized: NormalizedCommand,
  session: ConversationSession,
  conversationIntent: "continue" | "new_task" | "explicit_reset" | "follow_up"
): ClarityAssessment {

  // ── Explicit reset: always generate (user is starting fresh clearly) ──────
  if (conversationIntent === "explicit_reset") {
    const pageType = normalized.pageType ?? "page";
    return {
      level: "high",
      responseMode: "generate",
      missingInfo: [],
      clarificationQuestion: null,
      quickReplies: [],
      acknowledgment: `Starting fresh! ${pick(OPENERS_CONFIRM)} ${pageType} page...`,
    };
  }

  // ── Follow-up turn: user is responding to our output ─────────────────────
  if (conversationIntent === "follow_up") {
    const lower = rawInput.toLowerCase().trim();

    // Negative response — user said no/skip
    if (NEGATIVE_RESPONSES.some((r) => lower.startsWith(r) || lower === r)) {
      return {
        level: "high",
        responseMode: "clarify",
        missingInfo: [],
        clarificationQuestion: "Okay! Kuch aur karna chahte ho? (Anything else you'd like to build?)",
        quickReplies: ["New page", "Make changes", "Add feature", "Done, thanks"],
        acknowledgment: null,
      };
    }

    // Affirmative or short — continue with context
    if (isAffirmativeOrFollowUp(rawInput) && hasEnoughContextInSession(session)) {
      return {
        level: "high",
        responseMode: "acknowledge",
        missingInfo: [],
        clarificationQuestion: null,
        quickReplies: [],
        acknowledgment: pick(OPENERS_FOLLOWUP),
      };
    }

    // User gave a specific modification — generate directly
    if (rawInput.trim().length > 5) {
      return {
        level: "high",
        responseMode: "acknowledge",
        missingInfo: [],
        clarificationQuestion: null,
        quickReplies: [],
        acknowledgment: pick(OPENERS_FOLLOWUP),
      };
    }
  }

  // ── Continue: user is adding to an existing task with session context ─────
  if (conversationIntent === "continue" && hasEnoughContextInSession(session)) {
    return {
      level: "high",
      responseMode: "generate",
      missingInfo: [],
      clarificationQuestion: null,
      quickReplies: [],
      acknowledgment: renderAcknowledgment(normalized, session, true),
    };
  }

  // ── New task: assess clarity of the new request ───────────────────────────

  // Low/medium clarity: vague input — ask for page type first
  if (isVagueInput(rawInput, normalized)) {
    const nextQ = getNextClarifyingQuestion(normalized, session);
    if (nextQ) {
      return {
        level: "low",
        responseMode: "clarify",
        missingInfo: ["page type"],
        clarificationQuestion: nextQ.question,
        quickReplies: nextQ.quickReplies,
        acknowledgment: null,
      };
    }
  }

  // Medium clarity: has some signal but missing page type
  if (!normalized.pageType && !session.collectedConditions.pageType) {
    const nextQ = getNextClarifyingQuestion(normalized, session);
    if (nextQ) {
      return {
        level: "medium",
        responseMode: "clarify",
        missingInfo: ["page type"],
        clarificationQuestion: nextQ.question,
        quickReplies: nextQ.quickReplies,
        acknowledgment: null,
      };
    }
  }

  // Has page type but no theme specified — ask ONE smart follow-up question.
  // This makes the agent feel like a real dev who always confirms style preference
  // before building. Only ask on first encounter (not if theme was already discussed).
  if (
    normalized.pageType &&
    !session.collectedConditions.colorScheme &&
    !normalized.uiStyle.includes("dark") &&
    !normalized.uiStyle.includes("light") &&
    session.turnCount <= 2  // only on fresh/early turns, not mid-conversation
  ) {
    const pageLabel = normalized.pageType.charAt(0).toUpperCase() + normalized.pageType.slice(1);
    const themeQ = getThemeQuestion(normalized.pageType, pageLabel);
    return {
      level: "medium",
      responseMode: "clarify",
      missingInfo: ["theme"],
      clarificationQuestion: themeQ.question,
      quickReplies: themeQ.quickReplies,
      acknowledgment: null,
    };
  }

  // Default: enough info to proceed — generate with acknowledgment
  return {
    level: "high",
    responseMode: "generate",
    missingInfo: [],
    clarificationQuestion: null,
    quickReplies: [],
    acknowledgment: renderAcknowledgment(normalized, session, false),
  };
}
