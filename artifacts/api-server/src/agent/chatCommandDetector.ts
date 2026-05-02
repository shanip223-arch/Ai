/**
 * Chat Command Detector
 *
 * Intercepts special chat management commands BEFORE they enter the
 * generation pipeline. This keeps the orchestrator clean and prevents
 * "reset chat" from accidentally triggering page generation.
 *
 * Supports English + Hinglish command patterns.
 */

export type ChatCommandType =
  | "reset_chat"      // Wipe conversation + context completely
  | "delete_last"     // Remove the last user+agent message pair from context
  | "delete_message"  // Remove a specific message by turn ID
  | "new_session"     // Start a completely independent new session
  | null;             // Not a chat management command

export interface DetectedChatCommand {
  type: ChatCommandType;
  messageId?: string;       // for delete_message — the turn_xxx ID
  originalText: string;
}

// ─── Pattern lists ────────────────────────────────────────────────────────────

const RESET_PATTERNS = [
  // English
  "reset chat", "chat reset", "clear chat", "clear conversation",
  "clear everything", "reset everything", "delete everything",
  "delete all messages", "clear all messages", "wipe chat",
  "start fresh", "start over", "forget everything", "clear all",
  "reset context", "clear context", "reset history",
  // Hinglish
  "sab delete karo", "chat saaf karo", "sab kuch delete karo",
  "shuru se shuru karo", "poora reset karo", "sab kuch bhul jao",
  "chat band karo", "conversation reset", "bilkul fresh start",
  "naye sir se", "fresh start chahiye",
];

const DELETE_LAST_PATTERNS = [
  // English
  "delete last message", "remove last message", "delete last",
  "remove last", "delete previous message", "remove previous message",
  "undo last message", "delete that last one",
  // Hinglish
  "last message delete karo", "last message hatao", "last wala hatao",
  "pichla message delete karo", "pichli baat delete", "last message bhul jao",
  "woh hatao", "woh delete karo",
];

const NEW_SESSION_PATTERNS = [
  // English
  "new session", "fresh session", "start new session", "create new session",
  "new independent chat", "new conversation", "fresh conversation",
  "open new session", "new chat session",
  // Hinglish
  "nayi session", "nayi session shuru karo", "naya session banao",
  "naya session chahiye", "fresh session chahiye",
];

// Matches "delete message turn_xxx..." or "delete turn_xxx"
const DELETE_BY_ID_PATTERNS = [
  /delete\s+message\s+(turn_[a-z0-9_]+)/i,
  /remove\s+message\s+(turn_[a-z0-9_]+)/i,
  /delete\s+(turn_[a-z0-9_]+)/i,
  /message\s+(turn_[a-z0-9_]+)\s+(?:delete|hatao|remove)/i,
];

// ─── Main detector ────────────────────────────────────────────────────────────

export function detectChatCommand(rawCommand: string): DetectedChatCommand {
  const lower = rawCommand.toLowerCase().trim();
  const original = rawCommand.trim();

  // ── Delete by specific message ID (check first — most specific) ───────────
  for (const pattern of DELETE_BY_ID_PATTERNS) {
    const match = rawCommand.match(pattern);
    if (match?.[1]) {
      return { type: "delete_message", messageId: match[1], originalText: original };
    }
  }

  // ── Reset entire chat ─────────────────────────────────────────────────────
  for (const phrase of RESET_PATTERNS) {
    if (lower === phrase || lower.startsWith(phrase + " ") || lower.endsWith(" " + phrase) || lower.includes(" " + phrase + " ")) {
      return { type: "reset_chat", originalText: original };
    }
  }

  // ── Delete last message ───────────────────────────────────────────────────
  for (const phrase of DELETE_LAST_PATTERNS) {
    if (lower === phrase || lower.includes(phrase)) {
      return { type: "delete_last", originalText: original };
    }
  }

  // ── New session ───────────────────────────────────────────────────────────
  for (const phrase of NEW_SESSION_PATTERNS) {
    if (lower === phrase || lower.includes(phrase)) {
      return { type: "new_session", originalText: original };
    }
  }

  return { type: null, originalText: original };
}

// ─── Response message builders ────────────────────────────────────────────────

const RESET_MESSAGES = [
  "Chat reset! 🧹 Sab kuch saaf ho gaya. Batao, kya banana hai?",
  "Done! Conversation cleared. Fresh start — what would you like to build?",
  "Reset complete! Context wiped clean. Ab naye sir se shuru karte hain.",
  "All clear! 🧹 Previous conversation deleted. What's next?",
];

const DELETE_LAST_MESSAGES = [
  "Done! Last message deleted from context. Conversation updated.",
  "Removed! Pichla message context se hata diya. 👍",
  "Last exchange deleted. I've forgotten that interaction — carry on!",
];

const NEW_SESSION_MESSAGES = [
  "New session started! 🚀 This is a completely independent conversation — previous chats are unaffected.",
  "Fresh session created! Purana conversation abhi bhi safe hai. Batao, kya banana hai?",
  "New session open. Starting completely fresh — no history from the old session.",
];

const NOT_FOUND_MESSAGES = [
  "Message not found in this session. It may have already been deleted.",
  "Couldn't find that message ID — it may not exist or may belong to a different session.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getChatCommandMessage(
  type: ChatCommandType,
  extras: { messageId?: string; deletedCount?: number; found?: boolean } = {}
): string {
  switch (type) {
    case "reset_chat":
      return pick(RESET_MESSAGES);
    case "delete_last":
      return (extras.deletedCount ?? 0) > 0
        ? pick(DELETE_LAST_MESSAGES)
        : "No messages to delete! This conversation is already empty.";
    case "delete_message":
      return extras.found
        ? `Message deleted! Context updated — turn ${extras.messageId} removed.`
        : pick(NOT_FOUND_MESSAGES);
    case "new_session":
      return pick(NEW_SESSION_MESSAGES);
    default:
      return "Done!";
  }
}

// ─── Quick replies after chat commands ────────────────────────────────────────

export function getChatCommandQuickReplies(type: ChatCommandType): string[] {
  switch (type) {
    case "reset_chat":
    case "new_session":
      return [
        "Login page banao",
        "Create a dashboard",
        "Build a landing page",
        "Make a contact form",
      ];
    case "delete_last":
      return ["Continue where we left off", "Start something new", "Reset chat"];
    default:
      return [];
  }
}
