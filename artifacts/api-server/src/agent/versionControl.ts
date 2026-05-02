/**
 * Version Control System
 * Tracks every generated project as a numbered version (v1, v2, v3...).
 * Supports rollback, diff summary, and version history per session.
 */

import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const OUTPUT_DIR  = path.resolve(process.cwd(), "output");
const VERSIONS_DIR = path.join(OUTPUT_DIR, "versions");

export interface VersionedFile {
  path: string;
  content: string;
  sizeBytes: number;
  checksum: string; // simple hash for change detection
}

export interface ProjectVersion {
  versionId: string;        // "v1", "v2", "v3"
  versionNumber: number;
  projectSlug: string;
  sessionId: string;
  command: string;          // the user command that produced this version
  htmlContent: string;      // flat HTML snapshot for preview
  files: VersionedFile[];
  validationScore: number;
  confidenceScore: number;
  securityScore: number;
  performanceScore: number;
  changesSummary: string;   // human-readable diff summary
  linesAdded: number;
  linesRemoved: number;
  createdAt: string;
  parentVersionId: string | null;
}

export interface VersionRegistry {
  projectBaseName: string;
  sessionId: string;
  currentVersion: number;
  currentVersionId: string;
  totalVersions: number;
  versions: ProjectVersion[];
  lastUpdated: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureVersionsDir(sessionId: string): string {
  const dir = path.join(VERSIONS_DIR, sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function simpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function registryPath(sessionId: string, projectBaseName: string): string {
  const dir = ensureVersionsDir(sessionId);
  return path.join(dir, `${projectBaseName}.versions.json`);
}

function loadRegistry(sessionId: string, projectBaseName: string): VersionRegistry | null {
  const p = registryPath(sessionId, projectBaseName);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as VersionRegistry;
  } catch {
    return null;
  }
}

function saveRegistry(registry: VersionRegistry): void {
  const p = registryPath(registry.sessionId, registry.projectBaseName);
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(registry, null, 2), "utf-8");
}

// ── Diff summary ──────────────────────────────────────────────────────────────

function diffSummary(
  prevHtml: string | null,
  newHtml: string
): { summary: string; linesAdded: number; linesRemoved: number } {
  if (!prevHtml) {
    const lines = newHtml.split("\n").length;
    return {
      summary: `Initial version — ${lines} lines generated`,
      linesAdded: lines,
      linesRemoved: 0,
    };
  }
  const prevLines = new Set(prevHtml.split("\n"));
  const newLines  = new Set(newHtml.split("\n"));

  let added = 0;
  let removed = 0;

  for (const line of newHtml.split("\n")) {
    if (!prevLines.has(line)) added++;
  }
  for (const line of prevHtml.split("\n")) {
    if (!newLines.has(line)) removed++;
  }

  const changes: string[] = [];
  if (added > 0)   changes.push(`+${added} lines`);
  if (removed > 0) changes.push(`-${removed} lines`);

  // Detect what sections changed
  const sections: string[] = [];
  if (
    prevHtml.replace(/<style[\s\S]*?<\/style>/gi, "") !==
    newHtml.replace(/<style[\s\S]*?<\/style>/gi, "")
  ) sections.push("HTML structure");
  if (
    (prevHtml.match(/<style[\s\S]*?<\/style>/gi) ?? []).join("") !==
    (newHtml.match(/<style[\s\S]*?<\/style>/gi) ?? []).join("")
  ) sections.push("styles");
  if (
    (prevHtml.match(/<script[\s\S]*?<\/script>/gi) ?? []).join("") !==
    (newHtml.match(/<script[\s\S]*?<\/script>/gi) ?? []).join("")
  ) sections.push("scripts");

  const sectionText = sections.length > 0 ? ` — changed: ${sections.join(", ")}` : "";
  const changeText  = changes.length > 0 ? ` (${changes.join(", ")})` : "";

  return {
    summary: `Updated${sectionText}${changeText}`,
    linesAdded: added,
    linesRemoved: removed,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function recordVersion(opts: {
  sessionId: string;
  projectBaseName: string;   // e.g. "login-page"
  projectSlug: string;       // e.g. "login-page-1748000000"
  command: string;
  htmlContent: string;
  files: { path: string; content: string }[];
  validationScore: number;
  confidenceScore: number;
  securityScore?: number;
  performanceScore?: number;
}): ProjectVersion {
  ensureVersionsDir(opts.sessionId);

  const existing = loadRegistry(opts.sessionId, opts.projectBaseName);
  const versionNumber = (existing?.currentVersion ?? 0) + 1;
  const versionId     = `v${versionNumber}`;
  const parentId      = existing?.currentVersionId ?? null;
  const prevHtml      = existing?.versions.at(-1)?.htmlContent ?? null;

  const { summary, linesAdded, linesRemoved } = diffSummary(prevHtml, opts.htmlContent);

  const version: ProjectVersion = {
    versionId,
    versionNumber,
    projectSlug: opts.projectSlug,
    sessionId: opts.sessionId,
    command: opts.command,
    htmlContent: opts.htmlContent,
    files: opts.files.map((f) => ({
      path: f.path,
      content: f.content,
      sizeBytes: Buffer.byteLength(f.content, "utf-8"),
      checksum: simpleChecksum(f.content),
    })),
    validationScore: opts.validationScore,
    confidenceScore: opts.confidenceScore,
    securityScore: opts.securityScore ?? 100,
    performanceScore: opts.performanceScore ?? 80,
    changesSummary: summary,
    linesAdded,
    linesRemoved,
    createdAt: new Date().toISOString(),
    parentVersionId: parentId,
  };

  const registry: VersionRegistry = {
    projectBaseName: opts.projectBaseName,
    sessionId: opts.sessionId,
    currentVersion: versionNumber,
    currentVersionId: versionId,
    totalVersions: versionNumber,
    versions: [...(existing?.versions ?? []), version],
    lastUpdated: new Date().toISOString(),
  };

  saveRegistry(registry);
  logger.info({ sessionId: opts.sessionId, versionId, projectBaseName: opts.projectBaseName }, "Version recorded");

  return version;
}

export function getVersionHistory(
  sessionId: string,
  projectBaseName: string
): VersionRegistry | null {
  return loadRegistry(sessionId, projectBaseName);
}

export function getVersion(
  sessionId: string,
  projectBaseName: string,
  versionId: string
): ProjectVersion | null {
  const registry = loadRegistry(sessionId, projectBaseName);
  if (!registry) return null;
  return registry.versions.find((v) => v.versionId === versionId) ?? null;
}

export function rollbackToVersion(
  sessionId: string,
  projectBaseName: string,
  versionId: string
): { success: boolean; version: ProjectVersion | null; message: string } {
  const registry = loadRegistry(sessionId, projectBaseName);
  if (!registry) {
    return { success: false, version: null, message: "No version history found" };
  }

  const target = registry.versions.find((v) => v.versionId === versionId);
  if (!target) {
    return { success: false, version: null, message: `Version ${versionId} not found` };
  }

  // Mark current version as rolled back by updating registry pointer
  registry.currentVersion = target.versionNumber;
  registry.currentVersionId = target.versionId;
  saveRegistry(registry);

  logger.info({ sessionId, projectBaseName, rolledBackTo: versionId }, "Rolled back version");
  return { success: true, version: target, message: `Rolled back to ${versionId}` };
}

export function listSessionProjects(sessionId: string): string[] {
  try {
    const dir = path.join(VERSIONS_DIR, sessionId);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".versions.json"))
      .map((f) => f.replace(".versions.json", ""));
  } catch {
    return [];
  }
}

export function getVersionSummaryForResponse(version: ProjectVersion): {
  versionId: string;
  versionNumber: number;
  changesSummary: string;
  linesAdded: number;
  linesRemoved: number;
  scores: { validation: number; confidence: number; security: number; performance: number };
} {
  return {
    versionId: version.versionId,
    versionNumber: version.versionNumber,
    changesSummary: version.changesSummary,
    linesAdded: version.linesAdded,
    linesRemoved: version.linesRemoved,
    scores: {
      validation: version.validationScore,
      confidence: version.confidenceScore,
      security: version.securityScore,
      performance: version.performanceScore,
    },
  };
}
