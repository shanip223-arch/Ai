/**
 * Image Analyzer — Vision-based UI Layout Detection
 *
 * Sends an uploaded image to OpenAI Vision API (gpt-5.1) and extracts
 * structured layout information: page type, color scheme, UI elements, etc.
 * Falls back to heuristic analysis if vision is unavailable.
 */

import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageAnalysis {
  pageType: string;
  colorScheme: "dark" | "light";
  hasNavbar: boolean;
  hasSidebar: boolean;
  hasForms: boolean;
  hasCards: boolean;
  hasTable: boolean;
  hasHero: boolean;
  hasPricing: boolean;
  detectedElements: string[];
  title: string;
  description: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  quickReplies?: string[];
}

export interface AnalyzeImageOptions {
  imagePath: string;
  mimeType: string;
  userDescription?: string;
}

// ─── Vision prompt ────────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are an expert UI/UX analyzer specializing in web design. Your task is to analyze UI screenshots and design mockups.

Analyze the provided image and identify:
1. The page type (login, dashboard, landing/index, register, form/contact, admin, gallery, portfolio, profile)
2. Color scheme (dark or light dominant)  
3. UI elements present
4. Overall layout structure
5. Visible text/branding

Return ONLY a valid JSON object with no markdown, no explanation — just raw JSON.`;

const VISION_USER_PROMPT = `Analyze this web UI image and return structured information.

Return exactly this JSON shape (no markdown, no code blocks, raw JSON only):
{
  "pageType": "login|dashboard|index|register|form|admin|gallery|portfolio|profile",
  "colorScheme": "dark|light",
  "hasNavbar": true/false,
  "hasSidebar": true/false,
  "hasForms": true/false,
  "hasCards": true/false,
  "hasTable": true/false,
  "hasHero": true/false,
  "hasPricing": true/false,
  "detectedElements": ["navbar", "hero section", "login form", "..."],
  "title": "detected brand name or page title or generic descriptor",
  "description": "one sentence describing what this page does and its purpose",
  "confidence": 85
}

Rules:
- pageType MUST be one of: login, dashboard, index, register, form, admin, gallery, portfolio, profile
- colorScheme: "dark" if background is predominantly dark, "light" otherwise
- detectedElements: list every distinct UI component visible (navbar, sidebar, hero, cards, stats, charts, table, form, footer, CTA button, etc.)
- confidence: 0-100 based on image clarity and how certain you are
- If image is blurry or unclear, set confidence below 40`;

// ─── OpenAI Vision caller ─────────────────────────────────────────────────────

async function callOpenAIVision(
  base64Image: string,
  mimeType: string
): Promise<ImageAnalysis | null> {
  const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

  if (!baseUrl || !apiKey) return null;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        max_tokens: 1000,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high",
                },
              },
              { type: "text", text: VISION_USER_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Strip any accidental markdown code fences
    const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<ImageAnalysis>;

    return normalizeAnalysis(parsed);
  } catch {
    return null;
  }
}

// ─── Normalize & validate API response ───────────────────────────────────────

const VALID_PAGE_TYPES = [
  "login", "dashboard", "index", "register", "form",
  "admin", "gallery", "portfolio", "profile",
];

function normalizeAnalysis(raw: Partial<ImageAnalysis>): ImageAnalysis {
  const pageType = VALID_PAGE_TYPES.includes(raw.pageType ?? "")
    ? (raw.pageType as string)
    : "index";

  const confidence = typeof raw.confidence === "number"
    ? Math.min(100, Math.max(0, raw.confidence))
    : 70;

  const needsClarification = confidence < 45;

  let clarificationQuestion: string | undefined;
  let quickReplies: string[] | undefined;

  if (needsClarification) {
    clarificationQuestion =
      "Image thodi unclear hai. Ye page kya hai? (Image is a bit unclear — can you tell me what kind of page this is?)";
    quickReplies = ["Login page", "Dashboard", "Landing page", "Register page", "Admin panel", "Contact form"];
  }

  return {
    pageType,
    colorScheme: raw.colorScheme === "dark" ? "dark" : "light",
    hasNavbar: raw.hasNavbar ?? false,
    hasSidebar: raw.hasSidebar ?? false,
    hasForms: raw.hasForms ?? false,
    hasCards: raw.hasCards ?? false,
    hasTable: raw.hasTable ?? false,
    hasHero: raw.hasHero ?? false,
    hasPricing: raw.hasPricing ?? false,
    detectedElements: Array.isArray(raw.detectedElements) ? raw.detectedElements : [],
    title: raw.title ?? "Untitled Page",
    description: raw.description ?? "A web page",
    confidence,
    needsClarification,
    clarificationQuestion,
    quickReplies,
  };
}

// ─── Heuristic fallback (filename + description based) ───────────────────────

function heuristicAnalysis(
  filename: string,
  userDescription: string
): ImageAnalysis {
  const text = `${filename} ${userDescription}`.toLowerCase();

  let pageType = "index";
  if (/login|signin|sign.in/.test(text)) pageType = "login";
  else if (/dashboard|admin panel|analytics|stats/.test(text)) pageType = "dashboard";
  else if (/register|signup|sign.up/.test(text)) pageType = "register";
  else if (/contact|form|inquiry/.test(text)) pageType = "form";
  else if (/admin/.test(text)) pageType = "admin";
  else if (/gallery|portfolio|showcase/.test(text)) pageType = "gallery";
  else if (/profile|account|user/.test(text)) pageType = "profile";
  else if (/landing|home|index|hero/.test(text)) pageType = "index";

  const colorScheme: "dark" | "light" = /dark|night|black/.test(text) ? "dark" : "light";

  return {
    pageType,
    colorScheme,
    hasNavbar: true,
    hasSidebar: pageType === "dashboard" || pageType === "admin",
    hasForms: pageType === "login" || pageType === "register" || pageType === "form",
    hasCards: pageType === "dashboard" || pageType === "index",
    hasTable: pageType === "dashboard" || pageType === "admin",
    hasHero: pageType === "index",
    hasPricing: false,
    detectedElements: ["inferred from filename/description"],
    title: "Detected Page",
    description: `A ${pageType} page generated from image upload`,
    confidence: 40,
    needsClarification: true,
    clarificationQuestion:
      "Vision analysis unavailable. Kaunsa page type hai? (Which page type should I generate?)",
    quickReplies: ["Login page", "Dashboard", "Landing page", "Register page", "Admin panel", "Contact form"],
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeImage(options: AnalyzeImageOptions): Promise<ImageAnalysis> {
  const { imagePath, mimeType, userDescription = "" } = options;

  // Read image as base64
  let base64Image: string;
  try {
    const buffer = fs.readFileSync(imagePath);
    base64Image = buffer.toString("base64");
  } catch {
    return heuristicAnalysis(path.basename(imagePath), userDescription);
  }

  // Try vision API
  const visionResult = await callOpenAIVision(base64Image, mimeType);
  if (visionResult) {
    // If user provided extra context, it can override low-confidence page type
    if (userDescription && visionResult.confidence < 60) {
      const heuristic = heuristicAnalysis("", userDescription);
      if (heuristic.pageType !== "index") {
        visionResult.pageType = heuristic.pageType;
      }
    }
    return visionResult;
  }

  // Fallback to heuristic
  return heuristicAnalysis(path.basename(imagePath), userDescription);
}
