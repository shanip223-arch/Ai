/**
 * Project Intelligence Engine
 *
 * Acts like an experienced human developer: reads the request,
 * understands the intent, and decides — without user prompting —
 * what project type to build, which tech stack to use, how to
 * structure the files, and where each file belongs.
 *
 * Decision hierarchy:
 *   1. Detect project type (frontend UI / full-stack / pure backend)
 *   2. Select the minimal effective tech stack
 *   3. Plan the file structure (every file has a named role)
 *   4. Determine CSS and JS architecture (simple vs layered)
 *   5. Identify extras (validation, API layer, PWA, manifest)
 *   6. Produce human-readable reasoning for every decision
 */

import type { PageConditions } from "./conditionEngine.js";
import type { NormalizedCommand } from "./languageNormalizer.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProjectType =
  | "simple-component"   // 3 files: index.html + style.css + script.js
  | "frontend-standard"  // layered CSS + modular JS (current standard)
  | "frontend-extended"  // standard + extra pages (dashboard, landing)
  | "fullstack"          // HTML/CSS/JS frontend + Express backend
  | "backend-api";       // pure Node.js / Express REST API (no HTML)

export type CssMode =
  | "single"   // One style.css (variables + base + page merged)
  | "layered"; // variables.css + base.css + components.css + {page}.css

export type JsMode =
  | "single"    // One script.js (utils + logic merged)
  | "standard"  // utils.js + main.js
  | "with-api"; // utils.js + api.js + main.js

export interface TechStackChoice {
  languages: string[];      // e.g. ["HTML5", "CSS3", "JavaScript (ES6+)"]
  frameworks: string[];     // e.g. ["Express.js"] or [] for vanilla
  tools: string[];          // e.g. ["npm", "nodemon", "dotenv"]
  summary: string;          // One-line description for the user
  reasoning: string;        // Why this stack was chosen
}

export interface PlannedFile {
  path: string;             // e.g. "css/variables.css" or "routes/api.js"
  ext: string;              // "html" | "css" | "js" | "json" | "env" | "md"
  role: string;             // "Structure" | "Styling" | "Logic" | "Config" | "Documentation" | "Backend"
  purpose: string;          // Plain-English description of what this file does
  isCore: boolean;          // Core file vs optional/supplemental
  directory: string;        // Directory it belongs in (e.g. "css/", "routes/", root)
}

export interface FileDecisionPlan {
  projectType: ProjectType;
  complexity: "simple" | "standard" | "extended";
  cssMode: CssMode;
  jsMode: JsMode;
  techStack: TechStackChoice;
  includeValidation: boolean;
  includeApiLayer: boolean;   // js/api.js for frontend projects
  includeManifest: boolean;   // manifest.json for PWA
  includeExtraPages: string[];
  needsAssetsDir: boolean;
  isBackendProject: boolean;
  plannedFiles: PlannedFile[];
  reasoning: string[];
}

// ─── Signal dictionaries ───────────────────────────────────────────────────────

const BACKEND_SIGNALS = [
  "rest api", "restapi", "express", "node.js", "nodejs", "node js",
  "backend", "server", "api server", "api endpoint", "endpoints",
  "crud api", "crud app", "database", "mongodb", "mysql", "postgres",
  "postgresql", "sqlite", "controller", "middleware", "routes",
  "microservice", "webhook", "graphql",
  // Hinglish
  "backend banana", "server banana", "api banana", "database wala",
  "backend chahiye", "server chahiye",
];

const FULLSTACK_SIGNALS = [
  "full stack", "fullstack", "full-stack",
  "with backend", "with server", "with database", "with api",
  "login system", "authentication system", "user management",
  "todo app", "notes app", "blog system", "e-commerce", "ecommerce",
  "booking system", "cms", "admin system",
  // Hinglish
  "backend ke saath", "database ke saath", "puri website",
  "complete app", "complete website",
];

const PWA_SIGNALS = [
  "pwa", "progressive web app", "installable", "offline", "offline support",
  "app icon", "manifest", "service worker", "push notification",
  "mobile app like", "app-like",
];

const API_CLIENT_SIGNALS = [
  "fetch data", "load data", "api call", "fetch from", "api integration",
  "connect to api", "json data", "rest call", "http request",
  "live data", "real data", "dynamic data",
  // Hinglish
  "data fetch karo", "api se data", "real data chahiye",
];

const COMPONENT_SIGNALS = [
  "button", "card", "badge", "chip", "tooltip", "avatar", "tag",
  "pricing card", "feature card", "stat card", "hero section",
  "navbar", "footer", "sidebar", "modal", "dropdown", "accordion",
  "component", "widget", "snippet", "element",
];

const SIMPLE_SIGNALS = [
  "simple", "basic", "minimal", "just a", "only a", "just one",
  "quick", "small", "single", "plain",
  // Hinglish
  "sada", "chhota", "simple sa", "basic sa", "seedha",
];

// ─── Project type detector ─────────────────────────────────────────────────────

function detectProjectType(
  rawCommand: string,
  conditions: PageConditions
): ProjectType {
  const lower = rawCommand.toLowerCase();

  // Backend API (pure) — no HTML frontend
  if (BACKEND_SIGNALS.some((s) => lower.includes(s))) {
    // Check if it's clearly a backend-only request
    const hasFrontendIntent = [
      "page", "ui", "form", "dashboard", "login page", "frontend",
    ].some((s) => lower.includes(s));

    if (!hasFrontendIntent) return "backend-api";
  }

  // Full-stack — frontend + backend together
  if (FULLSTACK_SIGNALS.some((s) => lower.includes(s))) {
    return "fullstack";
  }

  // Backend with frontend hint → fullstack
  if (
    BACKEND_SIGNALS.some((s) => lower.includes(s)) &&
    ["login", "dashboard", "register", "form"].includes(conditions.pageType)
  ) {
    return "fullstack";
  }

  // Simple component — small focused piece
  const wordCount = rawCommand.trim().split(/\s+/).length;
  const isComponentRequest = COMPONENT_SIGNALS.some((s) => lower.includes(s)) &&
    !["full", "complete", "dashboard", "app"].some((s) => lower.includes(s));
  const isSimpleSignal = SIMPLE_SIGNALS.some((s) => lower.includes(s));
  const isShortCommand = wordCount <= 6;

  if (
    (isComponentRequest && !["dashboard", "admin"].includes(conditions.pageType)) ||
    (isSimpleSignal && isShortCommand && !["dashboard", "index"].includes(conditions.pageType))
  ) {
    return "simple-component";
  }

  // Extended frontend — complex multi-page projects
  if (
    conditions.pageType === "dashboard" ||
    conditions.pageType === "index" ||
    lower.includes("multi-page") || lower.includes("multiple pages") ||
    lower.includes("full website")
  ) {
    return "frontend-extended";
  }

  // Default: standard frontend
  return "frontend-standard";
}

// ─── CSS mode selector ─────────────────────────────────────────────────────────

function selectCssMode(projectType: ProjectType, rawCommand: string): CssMode {
  if (projectType === "simple-component") return "single";
  if (projectType === "backend-api") return "single"; // minimal frontend if any
  // Everything else benefits from the layered approach
  return "layered";
}

// ─── JS mode selector ─────────────────────────────────────────────────────────

function selectJsMode(
  projectType: ProjectType,
  rawCommand: string,
  hasApiSignals: boolean
): JsMode {
  if (projectType === "simple-component") return "single";
  if (projectType === "backend-api") return "single";
  if (hasApiSignals || projectType === "fullstack") return "with-api";
  return "standard";
}

// ─── Tech stack selector ───────────────────────────────────────────────────────

function selectTechStack(
  projectType: ProjectType,
  conditions: PageConditions,
  hasValidation: boolean,
  hasApiSignals: boolean
): TechStackChoice {
  switch (projectType) {
    case "simple-component":
      return {
        languages: ["HTML5", "CSS3", "JavaScript (ES6+)"],
        frameworks: [],
        tools: [],
        summary: "Vanilla HTML + CSS + JS — no framework needed",
        reasoning:
          "A single UI component doesn't need a framework. Plain HTML, one CSS file, and one JS file keeps it simple, fast, and dependency-free.",
      };

    case "frontend-standard":
      return {
        languages: ["HTML5", "CSS Custom Properties", "JavaScript (ES6+)"],
        frameworks: [],
        tools: hasValidation ? ["HTML5 Constraint Validation API"] : [],
        summary: "Vanilla stack with layered CSS architecture",
        reasoning:
          "No framework overhead — CSS Custom Properties provide a robust design system, and Vanilla JS handles all interactivity. Keeps the project dependency-free and universally runnable.",
      };

    case "frontend-extended":
      return {
        languages: ["HTML5", "CSS Custom Properties", "JavaScript (ES6+)"],
        frameworks: [],
        tools: hasApiSignals ? ["Fetch API", "CSS Grid", "CSS Flexbox"] : ["CSS Grid", "CSS Flexbox"],
        summary: "Layered CSS architecture + modular JS",
        reasoning:
          "A multi-page project benefits from the layered CSS approach (design tokens → base → components → page) which allows consistent theming and maintainability across pages.",
      };

    case "fullstack":
      return {
        languages: ["HTML5", "CSS3", "JavaScript (ES6+)", "Node.js"],
        frameworks: ["Express.js"],
        tools: ["npm", "dotenv", "nodemon (dev)"],
        summary: "HTML/CSS/JS frontend + Express.js REST backend",
        reasoning:
          "The request needs both a UI and server-side logic. Express is the simplest Node.js framework — zero boilerplate for APIs, easy to extend, and the same JS language throughout the stack.",
      };

    case "backend-api":
      return {
        languages: ["Node.js", "JavaScript (ES6+)"],
        frameworks: ["Express.js"],
        tools: ["npm", "dotenv", "nodemon (dev)"],
        summary: "Express.js REST API",
        reasoning:
          "A pure API server doesn't need a frontend framework. Express on Node.js is minimal, fast, and production-proven — a real developer's go-to for REST APIs.",
      };

    default:
      return {
        languages: ["HTML5", "CSS3", "JavaScript"],
        frameworks: [],
        tools: [],
        summary: "Vanilla web stack",
        reasoning: "Default selection: no dependencies, universally compatible.",
      };
  }
}

// ─── Extra pages planner ───────────────────────────────────────────────────────

function planExtraPages(
  projectType: ProjectType,
  conditions: PageConditions,
  rawCommand: string
): string[] {
  const lower = rawCommand.toLowerCase();

  if (projectType === "simple-component" || projectType === "backend-api") {
    return [];
  }

  if (conditions.pageType === "dashboard") {
    // Dashboard always needs navigation targets
    return ["users", "analytics", "settings", "projects"];
  }

  if (conditions.pageType === "index") {
    // Landing page: about and contact are industry standard
    const pages: string[] = ["about", "contact"];
    if (lower.includes("login") || lower.includes("sign in")) pages.push("login");
    if (lower.includes("register") || lower.includes("sign up")) pages.push("register");
    return pages;
  }

  if (conditions.pageType === "login") {
    return ["register"]; // companion registration page
  }

  if (conditions.pageType === "register") {
    return ["login"]; // companion login page
  }

  // All other standard pages: no extra pages (keep it focused)
  return [];
}

// ─── File planner ─────────────────────────────────────────────────────────────

function planFiles(
  projectType: ProjectType,
  cssMode: CssMode,
  jsMode: JsMode,
  conditions: PageConditions,
  extraPages: string[],
  includeValidation: boolean,
  includeManifest: boolean,
  includeApiLayer: boolean
): PlannedFile[] {
  const files: PlannedFile[] = [];

  // ── Backend API project ─────────────────────────────────────────────────
  if (projectType === "backend-api") {
    files.push(
      { path: "server.js",               ext: "js",  role: "Backend",   purpose: "Express application entry point — initialises middleware, loads routes, starts HTTP server", isCore: true,  directory: "/" },
      { path: "routes/api.js",           ext: "js",  role: "Backend",   purpose: "All API route definitions — maps HTTP methods to controller functions", isCore: true,  directory: "routes/" },
      { path: "controllers/index.js",    ext: "js",  role: "Backend",   purpose: "Business logic separated from routes — keeps route files thin", isCore: true,  directory: "controllers/" },
      { path: "middleware/errorHandler.js", ext: "js", role: "Backend", purpose: "Centralised error handling middleware", isCore: true,  directory: "middleware/" },
      { path: "config/index.js",         ext: "js",  role: "Config",    purpose: "App configuration — reads from .env and exports typed constants", isCore: true,  directory: "config/" },
      { path: "package.json",            ext: "json", role: "Config",   purpose: "Node.js project manifest — dependencies, scripts, engine requirements", isCore: true,  directory: "/" },
      { path: ".env.example",            ext: "env",  role: "Config",   purpose: "Environment variable template — copy to .env and fill in real values", isCore: true,  directory: "/" },
      { path: ".gitignore",              ext: "txt",  role: "Config",   purpose: "Prevents committing node_modules, .env, and build artefacts", isCore: true,  directory: "/" },
      { path: "README.md",               ext: "md",   role: "Documentation", purpose: "Setup instructions, API reference, and running guide", isCore: true, directory: "/" }
    );
    return files;
  }

  // ── Full-stack project ──────────────────────────────────────────────────
  if (projectType === "fullstack") {
    // Frontend
    files.push(
      { path: "public/index.html",       ext: "html", role: "Structure", purpose: "Main HTML entry — links to CSS and JS, provides semantic layout", isCore: true, directory: "public/" },
      { path: "public/css/style.css",    ext: "css",  role: "Styling",   purpose: "All frontend styles — design tokens, base, components, page-specific", isCore: true, directory: "public/css/" },
      { path: "public/js/app.js",        ext: "js",   role: "Logic",     purpose: "Frontend JavaScript — DOM manipulation, API calls, event handling", isCore: true, directory: "public/js/" },
    );
    if (includeValidation) {
      files.push({ path: "public/js/validation.js", ext: "js", role: "Logic", purpose: "Client-side form validation helpers", isCore: false, directory: "public/js/" });
    }
    // Backend
    files.push(
      { path: "server.js",               ext: "js",   role: "Backend",   purpose: "Express server — serves static frontend, mounts API routes", isCore: true, directory: "/" },
      { path: "routes/api.js",           ext: "js",   role: "Backend",   purpose: "REST API routes — /api/* endpoints consumed by the frontend", isCore: true, directory: "routes/" },
      { path: "config/index.js",         ext: "js",   role: "Config",    purpose: "Server configuration constants loaded from environment", isCore: true, directory: "config/" },
      { path: "package.json",            ext: "json", role: "Config",    purpose: "Node.js manifest — express, dotenv dependencies, npm scripts", isCore: true, directory: "/" },
      { path: ".env.example",            ext: "env",  role: "Config",    purpose: "Template environment file — PORT, DB_URL, JWT_SECRET placeholders", isCore: true, directory: "/" },
      { path: ".gitignore",              ext: "txt",  role: "Config",    purpose: "Ignore node_modules, .env, build outputs from version control", isCore: true, directory: "/" },
      { path: "README.md",               ext: "md",   role: "Documentation", purpose: "How to install, run, and use the project", isCore: true, directory: "/" }
    );
    return files;
  }

  // ── Frontend projects ───────────────────────────────────────────────────

  // HTML entry point
  files.push({
    path: "index.html",
    ext: "html",
    role: "Structure",
    purpose: `Semantic HTML layout for the ${conditions.pageType} page — defines structure, accessibility attributes, and links to all CSS and JS files`,
    isCore: true,
    directory: "/",
  });

  // CSS layer
  if (cssMode === "single") {
    files.push({
      path: "style.css",
      ext: "css",
      role: "Styling",
      purpose: "All styles in one file — design tokens (custom properties), base reset, and page-specific rules",
      isCore: true,
      directory: "/",
    });
  } else {
    files.push(
      { path: "css/variables.css",  ext: "css", role: "Styling", purpose: "Design tokens — all colors, spacing, typography, shadows as CSS Custom Properties. Edit here to retheme the entire project", isCore: true, directory: "css/" },
      { path: "css/base.css",       ext: "css", role: "Styling", purpose: "Normalisation and base element styles — box-sizing, typography defaults, animations, scrollbar", isCore: true, directory: "css/" },
      { path: "css/components.css", ext: "css", role: "Styling", purpose: "Reusable UI component library — buttons, cards, badges, forms, navbar, footer", isCore: true, directory: "css/" },
      { path: `css/${conditions.pageType}.css`, ext: "css", role: "Styling", purpose: `Page-specific layout and unique styles for the ${conditions.pageType} view`, isCore: true, directory: "css/" }
    );
  }

  // JS layer
  if (jsMode === "single") {
    files.push({
      path: "script.js",
      ext: "js",
      role: "Logic",
      purpose: "All JavaScript in one file — DOM helpers, form logic, validation, and event listeners",
      isCore: true,
      directory: "/",
    });
  } else {
    files.push({
      path: "js/utils.js",
      ext: "js",
      role: "Logic",
      purpose: "Shared DOM utility functions — element selection, toast notifications, fetch wrapper. Loaded before main.js",
      isCore: true,
      directory: "js/",
    });

    if (includeApiLayer) {
      files.push({
        path: "js/api.js",
        ext: "js",
        role: "Logic",
        purpose: "API client module — base URL config, typed GET/POST/PUT/DELETE helpers with error handling and loading state",
        isCore: false,
        directory: "js/",
      });
    }

    if (includeValidation) {
      files.push({
        path: "js/validation.js",
        ext: "js",
        role: "Logic",
        purpose: "Form validation helpers — field-level rules, inline error display, submit prevention, accessibility announcements",
        isCore: false,
        directory: "js/",
      });
    }

    files.push({
      path: "js/main.js",
      ext: "js",
      role: "Logic",
      purpose: `Page initialisation — sets up all event listeners, handles ${conditions.pageType} page interactions, runs on DOMContentLoaded`,
      isCore: true,
      directory: "js/",
    });
  }

  // Manifest
  if (includeManifest) {
    files.push({
      path: "manifest.json",
      ext: "json",
      role: "Config",
      purpose: "PWA web app manifest — name, icons, theme color, display mode. Required for installability",
      isCore: false,
      directory: "/",
    });
  }

  // Assets dir
  if (projectType !== "simple-component") {
    files.push({
      path: "assets/.gitkeep",
      ext: "txt",
      role: "Structure",
      purpose: "Placeholder to preserve the assets/ folder in git — place images, icons, and fonts here",
      isCore: false,
      directory: "assets/",
    });
  }

  // Extra pages
  for (const page of extraPages) {
    files.push({
      path: `pages/${page}.html`,
      ext: "html",
      role: "Structure",
      purpose: `${page.charAt(0).toUpperCase() + page.slice(1)} page — linked from main navigation`,
      isCore: false,
      directory: "pages/",
    });
  }

  return files;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function analyzeProjectRequirements(
  rawCommand: string,
  normalized: NormalizedCommand,
  conditions: PageConditions
): FileDecisionPlan {
  const lower = rawCommand.toLowerCase();

  // ── Detect signals ────────────────────────────────────────────────────────
  const hasApiSignals = API_CLIENT_SIGNALS.some((s) => lower.includes(s));
  const hasPwaSignals = PWA_SIGNALS.some((s) => lower.includes(s));
  const hasBackendSignals = BACKEND_SIGNALS.some((s) => lower.includes(s));
  const hasFullstackSignals = FULLSTACK_SIGNALS.some((s) => lower.includes(s));

  // ── Detect project type ───────────────────────────────────────────────────
  const projectType = detectProjectType(rawCommand, conditions);

  // ── CSS & JS modes ────────────────────────────────────────────────────────
  const cssMode = selectCssMode(projectType, rawCommand);
  const jsMode = selectJsMode(projectType, rawCommand, hasApiSignals);

  // ── Features ──────────────────────────────────────────────────────────────
  const includeValidation = normalized.hasValidation ||
    conditions.hasValidation ||
    ["login", "register", "form"].includes(conditions.pageType);

  const includeApiLayer = hasApiSignals &&
    projectType !== "backend-api" &&
    projectType !== "simple-component" &&
    jsMode === "with-api";

  const includeManifest = hasPwaSignals;

  const extraPages = planExtraPages(projectType, conditions, rawCommand);

  const needsAssetsDir = projectType !== "simple-component" && projectType !== "backend-api";

  // ── Complexity ────────────────────────────────────────────────────────────
  const complexity: FileDecisionPlan["complexity"] =
    projectType === "simple-component"  ? "simple" :
    projectType === "frontend-extended" || projectType === "fullstack" || projectType === "backend-api"
      ? "extended" : "standard";

  // ── Tech stack ────────────────────────────────────────────────────────────
  const techStack = selectTechStack(projectType, conditions, includeValidation, hasApiSignals);

  // ── File plan ─────────────────────────────────────────────────────────────
  const plannedFiles = planFiles(
    projectType, cssMode, jsMode, conditions,
    extraPages, includeValidation, includeManifest, includeApiLayer
  );

  // ── Reasoning (developer-style explanation) ───────────────────────────────
  const reasoning: string[] = [];

  reasoning.push(`Project type: "${projectType}" — ${getTypeRationale(projectType, rawCommand, hasBackendSignals, hasFullstackSignals)}`);

  if (cssMode === "single") {
    reasoning.push("CSS: Single file (style.css) — simple project doesn't need a CSS layer architecture");
  } else {
    reasoning.push("CSS: Layered architecture — variables → base → components → page (easier to maintain and theme)");
  }

  if (jsMode === "single") {
    reasoning.push("JS: Single file (script.js) — all logic fits without modular separation");
  } else if (jsMode === "with-api") {
    reasoning.push("JS: utils.js + api.js + main.js — separates API layer for clean data-flow");
  } else {
    reasoning.push("JS: utils.js + main.js — shared helpers separated from page-specific logic");
  }

  if (includeValidation) {
    reasoning.push("Validation: Form validation included — required for user input pages");
  }

  if (includeApiLayer) {
    reasoning.push("API layer: js/api.js added — project needs to fetch external data");
  }

  if (includeManifest) {
    reasoning.push("PWA: manifest.json added — project requests installability/offline support");
  }

  if (extraPages.length > 0) {
    reasoning.push(`Extra pages: ${extraPages.join(", ")} — ${getExtraPagesRationale(conditions.pageType)}`);
  }

  reasoning.push(`Tech stack: ${techStack.summary}`);
  reasoning.push(`Files planned: ${plannedFiles.filter((f) => f.isCore).length} core + ${plannedFiles.filter((f) => !f.isCore).length} optional = ${plannedFiles.length} total`);

  return {
    projectType,
    complexity,
    cssMode,
    jsMode,
    techStack,
    includeValidation,
    includeApiLayer,
    includeManifest,
    includeExtraPages: extraPages,
    needsAssetsDir,
    isBackendProject: projectType === "backend-api" || projectType === "fullstack",
    plannedFiles,
    reasoning,
  };
}

// ─── Rationale helpers ────────────────────────────────────────────────────────

function getTypeRationale(
  type: ProjectType,
  rawCommand: string,
  hasBackendSignals: boolean,
  hasFullstackSignals: boolean
): string {
  switch (type) {
    case "simple-component":
      return "request is focused on a single UI element — 3 files is sufficient";
    case "frontend-standard":
      return "standard UI page — layered CSS + modular JS without a backend";
    case "frontend-extended":
      return "multi-page or complex layout — needs full CSS architecture + linked pages";
    case "fullstack":
      return "needs both a UI and server-side logic (detected: " + (hasFullstackSignals ? "fullstack keyword" : "backend+frontend signals") + ")";
    case "backend-api":
      return "server-only project — no HTML frontend needed (detected: backend/API signals)";
    default:
      return "default frontend project";
  }
}

function getExtraPagesRationale(pageType: string): string {
  switch (pageType) {
    case "dashboard": return "dashboards need navigation targets for each section";
    case "index":     return "landing pages need About and Contact pages";
    case "login":     return "login page pairs with registration page";
    case "register":  return "registration page pairs with login page";
    default:          return "standard companion pages";
  }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatFileTree(plan: FileDecisionPlan): string {
  const lines: string[] = [];
  const dirs = new Map<string, PlannedFile[]>();

  for (const f of plan.plannedFiles) {
    const dir = f.directory || "/";
    if (!dirs.has(dir)) dirs.set(dir, []);
    dirs.get(dir)!.push(f);
  }

  // Root files first
  const root = dirs.get("/") ?? [];
  for (const f of root) {
    lines.push(`${f.path}  ← ${f.role}`);
  }

  // Then directories
  for (const [dir, files] of dirs.entries()) {
    if (dir === "/") continue;
    lines.push(`${dir}`);
    for (const f of files) {
      lines.push(`  ${f.path.split("/").pop()}  ← ${f.role}: ${f.purpose.slice(0, 55)}…`);
    }
  }

  return lines.join("\n");
}
