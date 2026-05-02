import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "output");

export function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

export function saveOutput(filename: string, content: string): string {
  ensureOutputDir();
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  logger.info({ filename }, "Output saved");
  return filePath;
}

export function listOutputFiles(): { filename: string; pageType: string; createdAt: string; size: number }[] {
  ensureOutputDir();
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".html"));
  return files.map((f) => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    const pageType = f.split("-")[0] || "page";
    return {
      filename: f,
      pageType,
      createdAt: stat.mtime.toISOString(),
      size: stat.size,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function readOutputFile(filename: string): { content: string; pageType: string } | null {
  ensureOutputDir();
  const safe = path.basename(filename);
  if (!safe.endsWith(".html")) return null;
  const filePath = path.join(OUTPUT_DIR, safe);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  const pageType = safe.split("-")[0] || "page";
  return { content, pageType };
}

export function generateFilename(pageType: string): string {
  const ts = Date.now();
  return `${pageType}-${ts}.html`;
}
