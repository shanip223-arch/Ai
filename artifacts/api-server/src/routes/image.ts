/**
 * Image-to-Page Route
 * POST /agent/image-to-page — accepts multipart/form-data image upload,
 * analyzes it with OpenAI Vision, and generates a full multi-file project.
 */

import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { analyzeImage } from "../agent/imageAnalyzer.js";
import { generateStructuredProject } from "../agent/projectTemplateEngine.js";
import { packageProject } from "../agent/projectPackager.js";
import { saveProjectMeta, getProjectDir } from "../agent/outputSystem.js";
import { getOrCreateSession, recordUserTurn, recordAgentTurn } from "../agent/conversationMemory.js";
import { buildConditions } from "../agent/conditionEngine.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ─── Multer config — store images in output/uploads/ ─────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), "output", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `upload-${ts}${ext}`);
  },
});

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, WebP, and GIF images are supported."));
    }
  },
});

// ─── POST /agent/image-to-page ────────────────────────────────────────────────

router.post("/image-to-page", upload.single("image"), async (req, res) => {
  const file = req.file;
  const description: string = (req.body as Record<string, string>)["description"] ?? "";
  const sessionId: string | undefined = (req.body as Record<string, string>)["sessionId"] ?? undefined;
  const overridePageType: string | undefined = (req.body as Record<string, string>)["pageType"] ?? undefined;

  if (!file) {
    res.status(400).json({ error: "No image uploaded. Please attach an image file.", details: null });
    return;
  }

  // ── Session setup ─────────────────────────────────────────────────────────
  const session = getOrCreateSession(sessionId ?? null);
  recordUserTurn(session, `[Image upload] ${file.originalname}${description ? ` — ${description}` : ""}`);

  try {
    // ── Step 1: Analyze image with Vision API ───────────────────────────────
    logger.info({ file: file.filename }, "Analyzing uploaded image");

    const analysis = await analyzeImage({
      imagePath: file.path,
      mimeType: file.mimetype,
      userDescription: description,
    });

    // Override page type if user already answered a clarification
    if (overridePageType) {
      analysis.pageType = overridePageType;
      analysis.needsClarification = false;
    }

    // ── Step 2: If unclear, ask clarifying question ─────────────────────────
    if (analysis.needsClarification) {
      logger.info({ confidence: analysis.confidence }, "Image unclear — sending clarification");

      res.json({
        responseMode: "clarify",
        clarificationQuestion: analysis.clarificationQuestion,
        quickReplies: analysis.quickReplies,
        agentMessage: analysis.clarificationQuestion,
        sessionId: session.id,
        imageUploadId: path.basename(file.path),
        detectedElements: analysis.detectedElements,
        confidence: analysis.confidence,
      });
      return;
    }

    // ── Step 3: Build conditions from analysis ──────────────────────────────
    const syntheticCommand = buildSyntheticCommand(analysis, description);
    const conditions = buildConditions({
      pageType: analysis.pageType,
      uiStyle: analysis.colorScheme === "dark" ? ["dark"] : ["light"],
      features: buildFeatureList(analysis),
      colorScheme: analysis.colorScheme,
    } as Parameters<typeof buildConditions>[0]);

    // ── Step 4: Generate multi-file project ─────────────────────────────────
    logger.info({ pageType: analysis.pageType, colorScheme: analysis.colorScheme }, "Generating page from image");

    const generatedFiles = generateStructuredProject(conditions);
    const slug = `${analysis.pageType}-from-image-${Date.now()}`;
    const projectDir = getProjectDir(slug);

    // ── Step 5: Package project ─────────────────────────────────────────────
    const { zipPath, zipFilename } = await packageProject(generatedFiles, slug, projectDir);

    // ── Step 6: Save metadata ───────────────────────────────────────────────
    await saveProjectMeta(slug, {
      slug,
      pageType: analysis.pageType,
      command: syntheticCommand,
      generatedFiles: generatedFiles.map((f) => f.path),
      zipFile: zipFilename,
      source: "image-upload",
      originalImage: file.originalname,
      detectedElements: analysis.detectedElements,
      colorScheme: analysis.colorScheme,
      confidence: analysis.confidence,
    });

    // ── Step 7: Cleanup temp file ───────────────────────────────────────────
    try { fs.unlinkSync(file.path); } catch { /* best effort */ }

    // ── Step 8: Build response ──────────────────────────────────────────────
    const downloadUrl = `/api/agent/download/${zipFilename}`;
    const agentMessage = buildCompletionMessage(analysis, generatedFiles.length);

    recordAgentTurn(session, agentMessage);

    res.json({
      responseMode: "generate",
      agentMessage,
      sessionId: session.id,
      projectSlug: slug,
      downloadUrl,
      pageType: analysis.pageType,
      colorScheme: analysis.colorScheme,
      confidence: analysis.confidence,
      detectedElements: analysis.detectedElements,
      description: analysis.description,
      title: analysis.title,
      fileCount: generatedFiles.length,
      files: generatedFiles.map((f) => f.path),
      quickReplies: [
        "Make it darker",
        "Add animations",
        "Add backend API",
        "Build matching page",
      ],
    });
  } catch (err) {
    logger.error({ err }, "Image-to-page generation failed");

    // Cleanup on error
    try { if (file) fs.unlinkSync(file.path); } catch { /* ignore */ }

    res.status(500).json({
      error: "Image analysis or generation failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSyntheticCommand(
  analysis: Awaited<ReturnType<typeof analyzeImage>>,
  description: string
): string {
  const parts = [
    `${analysis.colorScheme} ${analysis.pageType} page`,
    analysis.hasNavbar ? "with navbar" : "",
    analysis.hasSidebar ? "with sidebar" : "",
    analysis.hasForms ? "with form" : "",
    analysis.hasCards ? "with cards" : "",
    analysis.hasTable ? "with data table" : "",
    description ? `— ${description}` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function buildFeatureList(analysis: Awaited<ReturnType<typeof analyzeImage>>): string[] {
  const features: string[] = [];
  if (analysis.hasForms) features.push("form validation");
  if (analysis.hasCards) features.push("cards");
  if (analysis.hasTable) features.push("data table");
  if (analysis.hasHero) features.push("hero section");
  if (analysis.hasPricing) features.push("pricing");
  if (analysis.hasNavbar) features.push("navbar");
  if (analysis.hasSidebar) features.push("sidebar");
  return features;
}

function buildCompletionMessage(
  analysis: Awaited<ReturnType<typeof analyzeImage>>,
  fileCount: number
): string {
  const emoji = analysis.confidence >= 80 ? "🎯" : analysis.confidence >= 60 ? "✅" : "🔍";
  const lines = [
    `${emoji} Done! Converted your image into a **${analysis.colorScheme} ${analysis.pageType} page**.`,
    `Detected: ${analysis.detectedElements.slice(0, 4).join(", ")}${analysis.detectedElements.length > 4 ? `, +${analysis.detectedElements.length - 4} more` : ""}.`,
    `Generated ${fileCount} files — HTML, CSS layers, JS modules, and assets. Download the ZIP to get started!`,
  ];
  if (analysis.confidence < 70) {
    lines.push("💡 Vision confidence was moderate — review the output and let me know if you need adjustments.");
  }
  return lines.join("\n");
}

export default router;
