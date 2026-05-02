import type { NormalizedCommand } from "./languageNormalizer.js";

export type AgentMode = "analyze" | "research" | "direct";

const researchKeywords = [
  "research", "search", "internet", "online", "web", "google",
  "dhundo", "find", "web search", "internet pe",
];

export function detectMode(cmd: NormalizedCommand, researchEnabled: boolean): AgentMode {
  if (cmd.url) return "analyze";

  const lower = cmd.original.toLowerCase();
  if (researchEnabled && researchKeywords.some((kw) => lower.includes(kw))) {
    return "research";
  }

  return "direct";
}
