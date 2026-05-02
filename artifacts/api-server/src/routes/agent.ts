import fs from "fs";
import path from "path";
import { Router } from "express";
import express from "express";
import { orchestrate, getCommandHistory, getCommandsProcessed } from "../agent/taskOrchestrator.js";
import {
  listOutputFiles,
  readOutputFile,
  getProjectDir,
  ensureOutputDir,
} from "../agent/outputSystem.js";
import { getProjectZipPath } from "../agent/projectPackager.js";
import { checkPuppeteer } from "../agent/urlAnalyzer.js";
import {
  getSession,
  getOrCreateSession,
  createSession,
  resetSession,
  deleteLastTurn,
  deleteTurnById,
  serializeSession,
} from "../agent/conversationMemory.js";
import {
  listSessionProjects,
  getVersionHistory,
  rollbackToVersion,
} from "../agent/versionControl.js";
import { loadPrefs } from "../agent/learningSystem.js";

const router = Router();

ensureOutputDir();

let researchModeEnabled = false;
let puppeteerReady: boolean | null = null;
(async () => { puppeteerReady = await checkPuppeteer(); })();

// ── POST /agent/command ───────────────────────────────────────────────────────
router.post("/command", async (req, res) => {
  const { command, researchMode, sessionId } = req.body as {
    command?: string;
    researchMode?: boolean;
    sessionId?: string | null;
  };

  if (!command || typeof command !== "string" || command.trim().length === 0) {
    res.status(400).json({ error: "command is required", details: null });
    return;
  }

  try {
    const result = await orchestrate(command.trim(), researchMode ?? researchModeEnabled, sessionId);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Command processing failed");
    res.status(500).json({
      error: "Internal agent error",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── GET /agent/outputs ────────────────────────────────────────────────────────
router.get("/outputs", (_req, res) => {
  res.json({ outputs: listOutputFiles() });
});

// ── GET /agent/preview/:filename ──────────────────────────────────────────────
router.get("/preview/:filename", (req, res) => {
  const file = readOutputFile(req.params.filename);
  if (!file) {
    res.status(404).json({ error: "File not found", details: null });
    return;
  }
  res.json({ filename: req.params.filename, content: file.content, pageType: file.pageType });
});

// ── GET /agent/project/:slug  (serve project as static files for preview) ─────
// Uses dynamic express.static so all sub-paths (css/, js/, pages/) resolve.
// Express router.use strips the matched prefix, leaving req.url as the sub-path.
router.use("/project/:slug", (req, res, next) => {
  const dir = getProjectDir(req.params.slug);
  if (!dir) { res.status(404).json({ error: "Project not found", details: null }); return; }

  // Serve all files under the project directory
  const serveStatic = express.static(dir, { index: "index.html", fallthrough: false });
  serveStatic(req, res, (err) => {
    if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).send("File not found");
    } else if (err) {
      next(err);
    }
  });
});

// ── GET /agent/download/:zipFilename ─────────────────────────────────────────
router.get("/download/:zipFilename", (req, res) => {
  const zipPath = getProjectZipPath(req.params.zipFilename);
  if (!zipPath) {
    res.status(404).json({ error: "Project ZIP not found", details: null });
    return;
  }
  const slug = req.params.zipFilename.replace(".zip", "");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${slug}.zip"`);
  const stream = fs.createReadStream(zipPath);
  stream.on("error", (err) => {
    req.log.error({ err }, "ZIP stream error");
    if (!res.headersSent) res.status(500).json({ error: "Stream error", details: null });
  });
  stream.pipe(res);
});

// ── GET /agent/status ─────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  res.json({
    ready: true,
    researchMode: researchModeEnabled,
    puppeteerAvailable: puppeteerReady ?? false,
    totalOutputs: listOutputFiles().length,
    totalCommandsProcessed: getCommandsProcessed(),
    systemInfo: { platform: process.platform, nodeVersion: process.version },
  });
});

// ── GET /agent/history ────────────────────────────────────────────────────────
router.get("/history", (_req, res) => {
  res.json({ history: getCommandHistory() });
});

// ── GET /agent/templates ──────────────────────────────────────────────────────
router.get("/templates", (_req, res) => {
  res.json({
    templates: [
      { id: "login",     name: "Login Page",        description: "Clean sign-in form with validation, social login, and password recovery.",    pageType: "login" },
      { id: "dashboard", name: "Admin Dashboard",    description: "Full admin layout with sidebar, KPI stats, and data table.",                 pageType: "dashboard" },
      { id: "index",     name: "Landing Page",       description: "Hero section, feature grid, CTA, and footer. Ideal for SaaS products.",      pageType: "index" },
      { id: "register",  name: "Registration Page",  description: "Account creation form with validation and password strength meter.",         pageType: "register" },
      { id: "form",      name: "Contact Form",       description: "Professional contact form with two-column layout and character counter.",    pageType: "form" },
    ],
  });
});

// ── GET /agent/session/:sessionId ─────────────────────────────────────────────
router.get("/session/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) { res.status(404).json({ error: "Session not found", details: null }); return; }
  res.json(serializeSession(session));
});

// ── POST /agent/session/:sessionId/reset ─────────────────────────────────────
router.post("/session/:sessionId/reset", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.json(serializeSession(getOrCreateSession(null)));
    return;
  }
  const clearHistory = req.body?.clearHistory === true;
  resetSession(session, { clearHistory });
  res.json({ message: "Session reset", clearHistory, session: serializeSession(session) });
});

// ── POST /agent/session — create a fresh independent session ─────────────────
router.post("/session", (_req, res) => {
  const session = createSession();
  res.status(201).json({ message: "New session created", session: serializeSession(session) });
});

// ── POST /agent/reset ─────────────────────────────────────────────────────────
// Fully clears a session: task, conditions, turn history, outputs.
// Used by the frontend "New chat" button and "reset chat" command shortcuts.
router.post("/reset", (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required", details: null });
    return;
  }
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found", details: null });
    return;
  }
  resetSession(session, { clearHistory: true });
  res.json({
    success: true,
    message: "Session fully reset — all history and context cleared",
    session: serializeSession(session),
  });
});

// ── POST /agent/delete-last ───────────────────────────────────────────────────
// Removes the last user + agent turn pair from session memory.
// Used by the frontend "Delete last" button without going through the orchestrator.
router.post("/delete-last", (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required", details: null });
    return;
  }
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found", details: null });
    return;
  }
  const result = deleteLastTurn(session);
  res.json({
    success: true,
    message: result.message,
    deletedCount: result.deleted.length,
    session: serializeSession(session),
  });
});

// ── DELETE /agent/session/:sessionId/messages/last ───────────────────────────
router.delete("/session/:sessionId/messages/last", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const result = deleteLastTurn(session);
  res.json({ message: result.message, deletedCount: result.deleted.length, session: serializeSession(session) });
});

// ── DELETE /agent/session/:sessionId/messages/:turnId ────────────────────────
router.delete("/session/:sessionId/messages/:turnId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const result = deleteTurnById(session, req.params.turnId);
  if (!result.deleted) {
    res.status(404).json({ error: result.message });
    return;
  }
  res.json({ message: result.message, session: serializeSession(session) });
});

export default router;
