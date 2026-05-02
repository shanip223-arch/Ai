import { Router } from "express";
import { orchestrate, getCommandHistory, getCommandsProcessed } from "../agent/taskOrchestrator.js";
import { listOutputFiles, readOutputFile, ensureOutputDir } from "../agent/outputSystem.js";
import { checkPuppeteer } from "../agent/urlAnalyzer.js";

const router = Router();

ensureOutputDir();

let researchModeEnabled = false;
let puppeteerReady: boolean | null = null;

(async () => {
  puppeteerReady = await checkPuppeteer();
})();

router.post("/command", async (req, res) => {
  const { command, researchMode } = req.body as { command?: string; researchMode?: boolean };

  if (!command || typeof command !== "string" || command.trim().length === 0) {
    res.status(400).json({ error: "command is required", details: null });
    return;
  }

  const useResearch = researchMode ?? researchModeEnabled;

  try {
    const result = await orchestrate(command.trim(), useResearch);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Command processing failed");
    res.status(500).json({
      error: "Internal agent error",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get("/outputs", (_req, res) => {
  const outputs = listOutputFiles();
  res.json({ outputs });
});

router.get("/preview/:filename", (req, res) => {
  const { filename } = req.params;
  const file = readOutputFile(filename);
  if (!file) {
    res.status(404).json({ error: "File not found", details: null });
    return;
  }
  res.json({ filename, content: file.content, pageType: file.pageType });
});

router.get("/status", (_req, res) => {
  res.json({
    ready: true,
    researchMode: researchModeEnabled,
    puppeteerAvailable: puppeteerReady ?? false,
    totalOutputs: listOutputFiles().length,
    totalCommandsProcessed: getCommandsProcessed(),
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
    },
  });
});

router.get("/history", (_req, res) => {
  const history = getCommandHistory();
  res.json({ history });
});

router.get("/templates", (_req, res) => {
  res.json({
    templates: [
      { id: "login", name: "Login Page", description: "Clean sign-in form with validation support, social login, and password recovery link.", pageType: "login", preview: "/api/agent/preview-template/login" },
      { id: "dashboard", name: "Admin Dashboard", description: "Full admin layout with sidebar navigation, KPI stats, and data table.", pageType: "dashboard", preview: "/api/agent/preview-template/dashboard" },
      { id: "index", name: "Landing Page", description: "Hero section, feature grid, and footer. Ideal for SaaS products and startups.", pageType: "index", preview: "/api/agent/preview-template/index" },
      { id: "register", name: "Registration Page", description: "Account creation form with validation and two-column field layout.", pageType: "register", preview: "/api/agent/preview-template/register" },
      { id: "form", name: "Contact Form", description: "Professional contact / feedback form with two-column grid layout.", pageType: "form", preview: "/api/agent/preview-template/form" },
    ],
  });
});

export default router;
