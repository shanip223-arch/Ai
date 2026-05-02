import { Router } from "express";
import path from "path";
import fs from "fs";
import { runFullExtract, getExtractJob, listExtractJobs, getExtractsOutputBase } from "../agent/fullExtract.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /api/agent/extract — start extraction (async, responds immediately then runs in background)
router.post("/extract", async (req, res) => {
  const { url, waitForNetworkIdle, executeJs } = req.body as {
    url?: string;
    waitForNetworkIdle?: boolean;
    executeJs?: boolean;
  };

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "A valid http/https URL is required", details: null });
    return;
  }

  // Run extraction in background and respond immediately with a running job placeholder
  const timestamp = new Date().toISOString();
  const jobId = `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const placeholder = {
    jobId,
    url,
    status: "running" as const,
    message: "Extraction started — this may take 15–45 seconds.",
    timestamp,
    previewPath: null,
    outputDir: null,
    assets: [],
    stats: { totalAssets: 0, downloaded: 0, failed: 0, htmlSize: 0 },
  };

  // Return the placeholder immediately
  res.json(placeholder);

  // Run extraction in the background
  runFullExtract(url, { waitForNetworkIdle, executeJs }).catch((err) => {
    logger.error({ err, jobId }, "Background extraction crashed");
  });
});

// GET /api/agent/extracts — list all extraction jobs
router.get("/extracts", (_req, res) => {
  res.json({ extractions: listExtractJobs() });
});

// GET /api/agent/extracts/:jobId — get single job
router.get("/extracts/:jobId", (req, res) => {
  const job = getExtractJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Extraction job not found", details: null });
    return;
  }
  res.json(job);
});

export default router;
