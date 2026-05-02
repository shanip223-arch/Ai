import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const OUTPUT_DIR  = path.resolve(process.cwd(), "output");
const PROJECTS_DIR = path.join(OUTPUT_DIR, "projects");

export function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR))   fs.mkdirSync(OUTPUT_DIR,   { recursive: true });
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// ── Flat-file HTML (used for validation pipeline + preview fallback) ──────────

export function saveOutput(filename: string, content: string): string {
  ensureOutputDir();
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  logger.info({ filename }, "Flat HTML saved");
  return filePath;
}

export function generateFilename(pageType: string): string {
  return `${pageType}-${Date.now()}.html`;
}

export function readOutputFile(filename: string): { content: string; pageType: string } | null {
  ensureOutputDir();
  const safe = path.basename(filename);
  if (!safe.endsWith(".html")) return null;
  const filePath = path.join(OUTPUT_DIR, safe);
  if (!fs.existsSync(filePath)) return null;
  return {
    content: fs.readFileSync(filePath, "utf-8"),
    pageType: safe.split("-")[0] || "page",
  };
}

// ── Project metadata ──────────────────────────────────────────────────────────

export interface ProjectMeta {
  filename: string;
  pageType: string;
  projectSlug: string;
  downloadUrl: string;
  fileCount: number;
  validationScore: number;
  confidenceScore: number;
  createdAt?: string;
}

export function saveProjectMeta(projectSlug: string, meta: Omit<ProjectMeta, "createdAt">): void {
  ensureOutputDir();
  const metaPath = path.join(PROJECTS_DIR, `${projectSlug}.meta.json`);
  const full: ProjectMeta = { ...meta, createdAt: new Date().toISOString() };
  fs.writeFileSync(metaPath, JSON.stringify(full, null, 2), "utf-8");
  logger.info({ projectSlug }, "Project meta saved");
}

// ── List all generated outputs (projects + flat HTML fallback) ────────────────

export function listOutputFiles(): {
  filename: string;
  pageType: string;
  createdAt: string;
  size: number;
  projectSlug: string | null;
  downloadUrl: string | null;
}[] {
  ensureOutputDir();

  // Build a map of flat HTML files → project meta
  const metaMap = new Map<string, ProjectMeta>();
  if (fs.existsSync(PROJECTS_DIR)) {
    fs.readdirSync(PROJECTS_DIR)
      .filter((f) => f.endsWith(".meta.json"))
      .forEach((f) => {
        try {
          const raw = fs.readFileSync(path.join(PROJECTS_DIR, f), "utf-8");
          const meta = JSON.parse(raw) as ProjectMeta;
          metaMap.set(meta.filename, meta);
        } catch { /* ignore corrupt meta */ }
      });
  }

  const htmlFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".html"));

  return htmlFiles
    .map((f) => {
      const stat = fs.statSync(path.join(OUTPUT_DIR, f));
      const meta = metaMap.get(f) ?? null;
      return {
        filename: f,
        pageType: f.split("-")[0] || "page",
        createdAt: stat.mtime.toISOString(),
        size: stat.size,
        projectSlug: meta?.projectSlug ?? null,
        downloadUrl: meta?.downloadUrl ?? null,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── Read a file from within a packaged project folder ────────────────────────

export function readProjectFile(projectSlug: string, relPath: string): string | null {
  ensureOutputDir();
  const safeSuffix = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(PROJECTS_DIR, projectSlug, safeSuffix);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  return fs.readFileSync(fullPath, "utf-8");
}

export function getProjectDir(projectSlug: string): string | null {
  const dir = path.join(PROJECTS_DIR, projectSlug);
  return fs.existsSync(dir) ? dir : null;
}
