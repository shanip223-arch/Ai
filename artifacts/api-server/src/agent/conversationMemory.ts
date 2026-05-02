/**
 * Conversation Memory System
 * Maintains persistent, session-scoped conversation state.
 * Each session remembers: task context, collected conditions,
 * full turn history, and generated outputs.
 * Memory never resets after code generation — the conversation
 * continues until the user explicitly starts a new one.
 */

import { logger } from "../lib/logger.js";

export type TaskState =
  | "idle"           // no task yet
  | "collecting"     // gathering requirements
  | "generating"     // currently running the agent
  | "awaiting_feedback" // delivered output, waiting for user response
  | "refining"       // user asked for changes
  | "complete";      // user said they're done

export interface ConversationTurn {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  // Agent-turn extras
  outputFile?: string | null;
  jobId?: string;
  validationScore?: number | null;
  confidenceScore?: number | null;
  regenerated?: boolean;
  followUpQuestions?: string[];
}

export interface CollectedConditions {
  pageType?: string;
  colorScheme?: "light" | "dark" | "auto";
  uiStyle?: string[];
  hasValidation?: boolean;
  hasNavbar?: boolean;
  hasFooter?: boolean;
  customNotes?: string[];
  mentionedFeatures?: string[];  // e.g. ["social login", "password strength meter"]
  lastUrl?: string | null;
}

export interface ConversationSession {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
  currentTask: string | null;           // e.g. "login page with dark theme"
  taskState: TaskState;
  collectedConditions: CollectedConditions;
  turns: ConversationTurn[];
  generatedOutputs: string[];           // filenames of outputs in this session
  followUpQuestions: string[];          // last set of follow-up questions sent
  turnCount: number;
  isExplicitlyNew: boolean;            // user explicitly started a new task
}

// ─── In-memory session store ──────────────────────────────────────────────────
// Sessions expire after 2 hours of inactivity
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const sessions = new Map<string, ConversationSession>();

function makeTurnId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - new Date(session.lastActivityAt).getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

export function createSession(): ConversationSession {
  pruneExpiredSessions();
  const sessionId = makeSessionId();
  const now = new Date().toISOString();
  const session: ConversationSession = {
    sessionId,
    startedAt: now,
    lastActivityAt: now,
    currentTask: null,
    taskState: "idle",
    collectedConditions: {},
    turns: [],
    generatedOutputs: [],
    followUpQuestions: [],
    turnCount: 0,
    isExplicitlyNew: true,
  };
  sessions.set(sessionId, session);
  logger.info({ sessionId }, "New conversation session created");
  return session;
}

export function getSession(sessionId: string): ConversationSession | null {
  return sessions.get(sessionId) ?? null;
}

export function getOrCreateSession(sessionId: string | null | undefined): ConversationSession {
  if (sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) return existing;
  }
  return createSession();
}

function touchSession(session: ConversationSession) {
  session.lastActivityAt = new Date().toISOString();
  session.turnCount++;
}

// ─── Intent change detection ──────────────────────────────────────────────────

const EXPLICIT_RESET_PHRASES = [
  "new page", "start fresh", "start over", "naya", "naye se", "different page",
  "forget it", "cancel", "reset", "alag page", "kuch aur banao", "new task",
  "change topic", "ab kuch aur", "nayi cheez",
];

const CONTINUATION_PHRASES = [
  "haan", "yes", "okay", "ok", "sure", "theek hai", "bilkul", "zaroor",
  "make changes", "thoda change", "modify", "update", "add", "remove",
  "aur kuch", "backend", "api", "dark", "light", "responsive", "animation",
  "isko", "isme", "ispe", "usse", "usmein",
];

export function detectConversationIntent(
  rawInput: string,
  session: ConversationSession
): "continue" | "new_task" | "explicit_reset" | "follow_up" {
  const lower = rawInput.toLowerCase().trim();

  // Check explicit reset phrases
  if (EXPLICIT_RESET_PHRASES.some((p) => lower.includes(p))) {
    return "explicit_reset";
  }

  // If session has no current task, it's always a new task
  if (!session.currentTask || session.taskState === "idle") {
    return "new_task";
  }

  // If user is responding to follow-up questions
  if (session.taskState === "awaiting_feedback" || session.taskState === "refining") {
    // Short responses or continuation phrases = follow_up
    if (lower.length < 60 || CONTINUATION_PHRASES.some((p) => lower.includes(p))) {
      return "follow_up";
    }
  }

  // Check if the current task's page type appears in the input
  const currentPageType = session.collectedConditions.pageType ?? "";
  if (currentPageType && lower.includes(currentPageType)) {
    return "continue";
  }

  // Long new commands that don't reference existing context = new task
  if (lower.length > 80 && !CONTINUATION_PHRASES.some((p) => lower.includes(p))) {
    return "new_task";
  }

  return "continue";
}

// ─── Condition merging ────────────────────────────────────────────────────────

export function mergeConditionsFromInput(
  session: ConversationSession,
  rawInput: string,
  normalizedPageType: string,
  detectedUrl: string | null
): void {
  const lower = rawInput.toLowerCase();
  const cond = session.collectedConditions;

  // Page type: only update if this is a new task or the type is mentioned
  if (!cond.pageType || session.taskState === "idle") {
    cond.pageType = normalizedPageType;
  }

  // Color scheme
  if (lower.includes("dark")) cond.colorScheme = "dark";
  else if (lower.includes("light")) cond.colorScheme = "light";

  // UI style features
  if (!cond.uiStyle) cond.uiStyle = [];
  if (lower.includes("modern")) cond.uiStyle = [...new Set([...cond.uiStyle, "modern"])];
  if (lower.includes("minimal")) cond.uiStyle = [...new Set([...cond.uiStyle, "minimal"])];
  if (lower.includes("glassmorphism") || lower.includes("glass")) {
    cond.uiStyle = [...new Set([...cond.uiStyle, "glassmorphism"])];
  }
  if (lower.includes("gradient")) cond.uiStyle = [...new Set([...cond.uiStyle, "gradient"])];
  if (lower.includes("animation") || lower.includes("animated")) {
    cond.uiStyle = [...new Set([...cond.uiStyle, "animated"])];
  }

  // Structural features
  if (lower.includes("validation") || lower.includes("validate")) cond.hasValidation = true;
  if (lower.includes("navbar") || lower.includes("nav") || lower.includes("header")) cond.hasNavbar = true;
  if (lower.includes("footer")) cond.hasFooter = true;

  // URL
  if (detectedUrl) cond.lastUrl = detectedUrl;

  // Named features mentioned
  const featurePatterns: [RegExp, string][] = [
    [/social login|google login|oauth/i, "social login"],
    [/password strength|password meter/i, "password strength meter"],
    [/dark mode toggle|theme switcher/i, "dark mode toggle"],
    [/chart|graph|analytics/i, "charts"],
    [/table|data grid/i, "data table"],
    [/sidebar|side nav/i, "sidebar"],
    [/modal|popup|dialog/i, "modal"],
    [/notification|toast/i, "notifications"],
    [/search|filter/i, "search"],
    [/export|download/i, "export"],
    [/backend|api|endpoint/i, "backend API"],
    [/auth|authentication/i, "authentication"],
  ];

  if (!cond.mentionedFeatures) cond.mentionedFeatures = [];
  for (const [pattern, feature] of featurePatterns) {
    if (pattern.test(rawInput) && !cond.mentionedFeatures.includes(feature)) {
      cond.mentionedFeatures.push(feature);
    }
  }

  // Custom notes: accumulate free-form additions
  if (!cond.customNotes) cond.customNotes = [];
  if (session.taskState === "awaiting_feedback" || session.taskState === "refining") {
    // In follow-up mode, the raw input IS the refinement note
    if (!cond.customNotes.includes(rawInput.trim())) {
      cond.customNotes.push(rawInput.trim());
    }
  }
}

// ─── Follow-up question generation ───────────────────────────────────────────

function getFollowUpQuestions(session: ConversationSession): string[] {
  const cond = session.collectedConditions;
  const outputs = session.generatedOutputs;
  const pageType = cond.pageType ?? "page";
  const questions: string[] = [];

  // Primary follow-up based on output count
  if (outputs.length === 1) {
    questions.push("Koi changes chahiye? (Do you want any changes?)");
  } else if (outputs.length > 1) {
    questions.push("Is this version better? Should I refine it further?");
  }

  // Feature suggestions based on what's missing
  const features = cond.mentionedFeatures ?? [];
  const hasBackend = features.includes("backend API");
  const hasDark = cond.colorScheme === "dark";
  const hasAnimation = (cond.uiStyle ?? []).includes("animated");

  if (!hasBackend && (pageType === "login" || pageType === "register" || pageType === "form")) {
    questions.push("Should I add a backend API (Node.js/Express) for this form?");
  }

  if (!hasDark) {
    questions.push("Chahiye dark mode version? (Want a dark mode version?)");
  }

  if (pageType === "login" && !features.includes("social login")) {
    questions.push("Add Google / GitHub social login buttons?");
  }

  if (pageType === "dashboard" && !features.includes("charts")) {
    questions.push("Should I add charts/graphs to the dashboard?");
  }

  if (pageType === "index" && outputs.length >= 1) {
    questions.push("Should I create a separate About or Pricing page?");
  }

  if (!hasAnimation) {
    questions.push("Add smooth CSS animations and transitions?");
  }

  if (pageType === "login" || pageType === "register") {
    questions.push("Create a matching dashboard page after login?");
  }

  // Limit to 3 most relevant
  return questions.slice(0, 3);
}

// ─── Agent summary message builder ────────────────────────────────────────────

export function buildAgentSummary(
  session: ConversationSession,
  outputFile: string | null,
  validationScore: number | null,
  confidenceScore: number | null,
  regenerated: boolean,
  taskMessage: string
): { content: string; followUpQuestions: string[] } {
  const lines: string[] = [];

  if (outputFile) {
    lines.push(`✅ Generated **${outputFile}** successfully.`);
  }

  if (validationScore !== null) {
    const grade =
      validationScore >= 90 ? "A" : validationScore >= 75 ? "B" : validationScore >= 60 ? "C" : "D";
    lines.push(`📊 Validation score: **${validationScore}/100** (Grade ${grade})`);
  }

  if (confidenceScore !== null && confidenceScore < 75) {
    lines.push(`⚠️ Confidence: ${confidenceScore}/100 — output was cross-checked against 3 expert sources.`);
  }

  if (regenerated) {
    lines.push("🔁 Output was auto-regenerated once to meet quality threshold.");
  }

  // Summarize what conditions were applied
  const cond = session.collectedConditions;
  const appliedFeatures: string[] = [];
  if (cond.colorScheme) appliedFeatures.push(`${cond.colorScheme} theme`);
  if ((cond.uiStyle ?? []).length > 0) appliedFeatures.push((cond.uiStyle ?? []).join(", "));
  if (cond.hasValidation) appliedFeatures.push("form validation");
  if (cond.hasNavbar) appliedFeatures.push("navbar");
  if ((cond.mentionedFeatures ?? []).length > 0) {
    appliedFeatures.push(...(cond.mentionedFeatures ?? []));
  }

  if (appliedFeatures.length > 0) {
    lines.push(`\n🎨 Applied: ${appliedFeatures.join(", ")}`);
  }

  const followUpQuestions = getFollowUpQuestions(session);

  if (followUpQuestions.length > 0) {
    lines.push("\n---\n" + followUpQuestions[0]);
  }

  return {
    content: lines.join("\n"),
    followUpQuestions,
  };
}

// ─── Turn recording ───────────────────────────────────────────────────────────

export function recordUserTurn(session: ConversationSession, content: string): ConversationTurn {
  touchSession(session);
  const turn: ConversationTurn = {
    id: makeTurnId(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
  session.turns.push(turn);
  return turn;
}

export function recordAgentTurn(
  session: ConversationSession,
  content: string,
  extras: {
    outputFile?: string | null;
    jobId?: string;
    validationScore?: number | null;
    confidenceScore?: number | null;
    regenerated?: boolean;
    followUpQuestions?: string[];
  } = {}
): ConversationTurn {
  const turn: ConversationTurn = {
    id: makeTurnId(),
    role: "agent",
    content,
    timestamp: new Date().toISOString(),
    outputFile: extras.outputFile,
    jobId: extras.jobId,
    validationScore: extras.validationScore ?? null,
    confidenceScore: extras.confidenceScore ?? null,
    regenerated: extras.regenerated ?? false,
    followUpQuestions: extras.followUpQuestions ?? [],
  };
  session.turns.push(turn);

  if (extras.outputFile) {
    session.generatedOutputs.push(extras.outputFile);
  }

  if (extras.followUpQuestions) {
    session.followUpQuestions = extras.followUpQuestions;
  }

  return turn;
}

// ─── State transitions ────────────────────────────────────────────────────────

export function transitionState(session: ConversationSession, to: TaskState): void {
  const from = session.taskState;
  session.taskState = to;
  logger.debug({ sessionId: session.sessionId, from, to }, "Session state transition");
}

export function resetSession(
  session: ConversationSession,
  options: { clearHistory?: boolean } = {}
): void {
  session.currentTask = null;
  session.taskState = "idle";
  session.collectedConditions = {};
  session.generatedOutputs = [];
  session.followUpQuestions = [];
  session.isExplicitlyNew = true;

  if (options.clearHistory) {
    session.turns = [];
    session.turnCount = 0;
  }

  logger.info(
    { sessionId: session.sessionId, clearHistory: options.clearHistory ?? false },
    "Session reset by user"
  );
}

// ─── Message management ───────────────────────────────────────────────────────

/**
 * Delete the last user+agent turn pair from the session.
 * Updates context state if history becomes empty.
 */
export function deleteLastTurn(session: ConversationSession): {
  deleted: ConversationTurn[];
  message: string;
} {
  const deleted: ConversationTurn[] = [];

  // Pop last agent turn if present
  if (session.turns.length > 0 && session.turns[session.turns.length - 1].role === "agent") {
    deleted.push(session.turns.pop()!);
  }

  // Pop last user turn if present
  if (session.turns.length > 0 && session.turns[session.turns.length - 1].role === "user") {
    deleted.push(session.turns.pop()!);
  }

  // Decrease turn counter (one exchange = one turn)
  session.turnCount = Math.max(0, session.turnCount - 1);

  // Clean up any generated output files referenced by deleted turns
  for (const turn of deleted) {
    if (turn.outputFile) {
      session.generatedOutputs = session.generatedOutputs.filter((f) => f !== turn.outputFile);
    }
  }

  // If no history remains, reset to idle state
  if (session.turns.length === 0) {
    session.taskState = "idle";
    session.currentTask = null;
    session.collectedConditions = {};
  }

  logger.info(
    { sessionId: session.sessionId, deletedCount: deleted.length },
    "Last turn(s) deleted"
  );

  return {
    deleted,
    message: deleted.length > 0
      ? `Deleted ${deleted.length} message${deleted.length !== 1 ? "s" : ""}`
      : "No messages to delete",
  };
}

/**
 * Delete a specific turn from the session by its ID.
 * Works for both user and agent turns.
 */
export function deleteTurnById(
  session: ConversationSession,
  turnId: string
): { deleted: ConversationTurn | null; message: string } {
  const idx = session.turns.findIndex((t) => t.id === turnId);

  if (idx === -1) {
    return {
      deleted: null,
      message: `Message ${turnId} not found in this session`,
    };
  }

  const [deleted] = session.turns.splice(idx, 1);
  session.turnCount = Math.max(0, session.turnCount - 1);

  // Clean up generated output if this was an agent turn with a file
  if (deleted.outputFile) {
    session.generatedOutputs = session.generatedOutputs.filter((f) => f !== deleted.outputFile);
  }

  // If no history remains, reset to idle
  if (session.turns.length === 0) {
    session.taskState = "idle";
    session.currentTask = null;
    session.collectedConditions = {};
  }

  logger.info({ sessionId: session.sessionId, turnId }, "Turn deleted by ID");

  return { deleted, message: "Message deleted successfully" };
}

// ─── Serialization for API ────────────────────────────────────────────────────

export function serializeSession(session: ConversationSession) {
  return {
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    currentTask: session.currentTask,
    taskState: session.taskState,
    collectedConditions: session.collectedConditions,
    turnCount: session.turnCount,
    generatedOutputs: session.generatedOutputs,
    followUpQuestions: session.followUpQuestions,
    recentTurns: session.turns.slice(-20), // last 20 turns for the client
  };
}

export function getAllSessionIds(): string[] {
  return [...sessions.keys()];
}
