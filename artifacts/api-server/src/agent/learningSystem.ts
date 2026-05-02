/**
 * Learning System
 * Tracks user preferences per session and uses them to improve future generations.
 * Stored as lightweight JSON files — no external database required.
 */

import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const OUTPUT_DIR   = path.resolve(process.cwd(), "output");
const LEARNING_DIR = path.join(OUTPUT_DIR, "learning");

export interface UserPreferences {
  sessionId: string;
  // Design preferences
  colorScheme: "dark" | "light" | "auto";
  prefersDarkMode: boolean;
  preferredAccentColor: string | null;
  preferredStyles: string[];          // ["modern", "minimal", "glassmorphism", "corporate"]
  // Content preferences
  preferredPageTypes: Record<string, number>;   // { login: 3, dashboard: 1 }
  preferredNameStyle: "indian" | "western" | "neutral"; // affects placeholder names
  // Quality tracking
  avgValidationScore: number;
  avgConfidenceScore: number;
  avgSecurityScore: number;
  regenerationCount: number;          // times user asked to regenerate
  totalGenerations: number;
  // Feedback patterns (keywords extracted from edit requests)
  feedbackKeywords: string[];         // ["darker", "bigger", "more spacing", "add animation"]
  dislikedPatterns: string[];         // ["flat design", "too minimal"]
  // Feature usage
  usesValidation: boolean;
  usesResearchMode: boolean;
  downloadedProjects: number;
  // Session data
  lastGeneratedAt: string;
  firstSeenAt: string;
  updatedAt: string;
}

const DEFAULT_PREFS = (sessionId: string): UserPreferences => ({
  sessionId,
  colorScheme: "auto",
  prefersDarkMode: false,
  preferredAccentColor: null,
  preferredStyles: [],
  preferredPageTypes: {},
  preferredNameStyle: "neutral",
  avgValidationScore: 0,
  avgConfidenceScore: 0,
  avgSecurityScore: 100,
  regenerationCount: 0,
  totalGenerations: 0,
  feedbackKeywords: [],
  dislikedPatterns: [],
  usesValidation: false,
  usesResearchMode: false,
  downloadedProjects: 0,
  lastGeneratedAt: new Date().toISOString(),
  firstSeenAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ── Storage ───────────────────────────────────────────────────────────────────

function ensureLearningDir(): void {
  if (!fs.existsSync(LEARNING_DIR)) fs.mkdirSync(LEARNING_DIR, { recursive: true });
}

function prefsPath(sessionId: string): string {
  ensureLearningDir();
  return path.join(LEARNING_DIR, `${sessionId}.prefs.json`);
}

export function loadPrefs(sessionId: string): UserPreferences {
  const p = prefsPath(sessionId);
  if (!fs.existsSync(p)) return DEFAULT_PREFS(sessionId);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as UserPreferences;
  } catch {
    return DEFAULT_PREFS(sessionId);
  }
}

function savePrefs(prefs: UserPreferences): void {
  prefs.updatedAt = new Date().toISOString();
  fs.writeFileSync(prefsPath(prefs.sessionId), JSON.stringify(prefs, null, 2), "utf-8");
}

// ── Keyword extractors ────────────────────────────────────────────────────────

const DARK_SIGNALS   = ["dark", "night", "black", "midnight", "deep", "andhera", "काला"];
const LIGHT_SIGNALS  = ["light", "white", "clean", "minimal", "bright", "ujala"];
const STYLE_KEYWORDS: Record<string, string[]> = {
  glassmorphism: ["glass", "frosted", "blur", "transparent"],
  modern:        ["modern", "trendy", "fresh", "contemporary", "aadhunik"],
  minimal:       ["minimal", "simple", "clean", "sada"],
  corporate:     ["corporate", "professional", "business", "formal"],
  "3d":          ["3d", "three dimensional", "depth"],
};
const FEEDBACK_SIGNALS = [
  "darker", "lighter", "bigger", "smaller", "larger", "bolder",
  "more spacing", "less spacing", "add animation", "remove animation",
  "more colorful", "less colorful", "simpler", "more complex",
  "thoda", "aur", "zyada", "kam",
];
const INDIAN_NAME_SIGNALS = [
  "rahul", "priya", "amit", "neha", "vikram", "pooja", "arjun", "kavya",
  "hinglish", "indian", "bharat", "desi",
];

function extractColorScheme(command: string): "dark" | "light" | null {
  const lower = command.toLowerCase();
  if (DARK_SIGNALS.some((s) => lower.includes(s)))  return "dark";
  if (LIGHT_SIGNALS.some((s) => lower.includes(s))) return "light";
  return null;
}

function extractStyles(command: string): string[] {
  const lower = command.toLowerCase();
  const matched: string[] = [];
  for (const [style, signals] of Object.entries(STYLE_KEYWORDS)) {
    if (signals.some((s) => lower.includes(s))) matched.push(style);
  }
  return matched;
}

function extractFeedbackKeywords(command: string): string[] {
  const lower = command.toLowerCase();
  return FEEDBACK_SIGNALS.filter((kw) => lower.includes(kw));
}

// ── Running average helper ────────────────────────────────────────────────────

function runningAvg(current: number, count: number, newValue: number): number {
  if (count === 0) return newValue;
  return Math.round(((current * count) + newValue) / (count + 1));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function recordGeneration(opts: {
  sessionId: string;
  command: string;
  pageType: string;
  colorScheme: "dark" | "light" | "auto";
  validationScore: number;
  confidenceScore: number;
  securityScore: number;
  researchMode: boolean;
  wasRegeneration?: boolean;
}): UserPreferences {
  const prefs = loadPrefs(opts.sessionId);

  // Update generation counts
  prefs.totalGenerations++;
  if (opts.wasRegeneration) prefs.regenerationCount++;

  // Update page type frequency
  prefs.preferredPageTypes[opts.pageType] =
    (prefs.preferredPageTypes[opts.pageType] ?? 0) + 1;

  // Update color scheme preference
  const detectedScheme = extractColorScheme(opts.command) ?? opts.colorScheme;
  if (detectedScheme !== "auto") {
    prefs.colorScheme = detectedScheme;
    prefs.prefersDarkMode = detectedScheme === "dark";
  }

  // Update style preferences
  const styles = extractStyles(opts.command);
  for (const style of styles) {
    if (!prefs.preferredStyles.includes(style)) {
      prefs.preferredStyles.push(style);
    }
  }
  // Keep max 8 style preferences
  prefs.preferredStyles = prefs.preferredStyles.slice(-8);

  // Update quality scores
  const n = prefs.totalGenerations - 1;
  prefs.avgValidationScore = runningAvg(prefs.avgValidationScore, n, opts.validationScore);
  prefs.avgConfidenceScore = runningAvg(prefs.avgConfidenceScore, n, opts.confidenceScore);
  prefs.avgSecurityScore   = runningAvg(prefs.avgSecurityScore,   n, opts.securityScore);

  // Feature usage
  if (opts.researchMode) prefs.usesResearchMode = true;

  // Name style detection
  const lowerCmd = opts.command.toLowerCase();
  if (INDIAN_NAME_SIGNALS.some((s) => lowerCmd.includes(s))) {
    prefs.preferredNameStyle = "indian";
  }

  prefs.lastGeneratedAt = new Date().toISOString();

  savePrefs(prefs);
  logger.info({ sessionId: opts.sessionId, totalGenerations: prefs.totalGenerations }, "Learning updated");
  return prefs;
}

export function recordFeedback(sessionId: string, feedbackCommand: string): void {
  const prefs = loadPrefs(sessionId);
  const keywords = extractFeedbackKeywords(feedbackCommand);
  for (const kw of keywords) {
    if (!prefs.feedbackKeywords.includes(kw)) {
      prefs.feedbackKeywords.push(kw);
    }
  }
  prefs.feedbackKeywords = prefs.feedbackKeywords.slice(-20);
  savePrefs(prefs);
}

export function recordDownload(sessionId: string): void {
  const prefs = loadPrefs(sessionId);
  prefs.downloadedProjects++;
  savePrefs(prefs);
}

/** Returns hints to improve next generation based on learned preferences */
export function getGenerationHints(sessionId: string): {
  suggestedColorScheme: "dark" | "light" | "auto";
  suggestedStyles: string[];
  nameStyle: "indian" | "western" | "neutral";
  qualitySummary: string;
  topPageType: string | null;
} {
  const prefs = loadPrefs(sessionId);

  const topPageType = Object.entries(prefs.preferredPageTypes)
    .sort(([, a], [, b]) => b - a)
    .at(0)?.[0] ?? null;

  const qualitySummary =
    prefs.totalGenerations === 0
      ? "No generations yet"
      : `${prefs.totalGenerations} projects generated, avg quality: ${prefs.avgValidationScore}/100`;

  return {
    suggestedColorScheme: prefs.colorScheme,
    suggestedStyles: prefs.preferredStyles.slice(0, 3),
    nameStyle: prefs.preferredNameStyle,
    qualitySummary,
    topPageType,
  };
}
