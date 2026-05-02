/**
 * Project Packager
 * Takes the structured GeneratedFile[] from projectTemplateEngine and:
 *   1. Writes every file to output/projects/{slug}/
 *   2. Adds server.js, package.json, .env.example, .gitignore, README.md
 *   3. Creates a downloadable ZIP
 */

import fs from "fs";
import path from "path";
import archiver from "archiver";
import { generateReadme } from "./readmeGenerator.js";
import { logger } from "../lib/logger.js";
import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";
import type { GeneratedFile } from "./projectTemplateEngine.js";

const OUTPUT_DIR   = path.resolve(process.cwd(), "output");
const PROJECTS_DIR = path.join(OUTPUT_DIR, "projects");

export interface PackagedProject {
  projectSlug: string;
  projectDir: string;
  zipPath: string;
  downloadUrl: string;
  files: string[];
}

export function ensureProjectsDir(): void {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// ─── Static file generators ───────────────────────────────────────────────────

function makeServerJs(): string {
  return `'use strict';
const express = require('express');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve all static project files
app.use(express.static(path.join(__dirname)));

// SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () =>
  console.log(\`\\n  🚀  Running at http://localhost:\${PORT}\\n\`)
);
`;
}

function makePackageJson(projectName: string, description: string): string {
  return JSON.stringify({
    name: projectName,
    version: "1.0.0",
    description,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev:   "nodemon server.js",
    },
    dependencies: {
      express: "^4.18.2",
      dotenv:  "^16.4.5",
    },
    devDependencies: {
      nodemon: "^3.1.0",
    },
    engines: { node: ">=18.0.0" },
    license: "MIT",
  }, null, 2);
}

function makeEnvExample(conditions: PageConditions): string {
  const lines = [
    "# Environment Configuration",
    "# Copy this file to .env and fill in your values",
    "",
    "PORT=3000",
    "",
  ];
  if (conditions.pageType === "login" || conditions.pageType === "register") {
    lines.push("# API_BASE_URL=http://localhost:5000/api");
    lines.push("# JWT_SECRET=your_jwt_secret_here");
  } else if (conditions.pageType === "dashboard") {
    lines.push("# API_BASE_URL=http://localhost:5000/api");
    lines.push("# REFRESH_INTERVAL=30000");
  } else {
    lines.push("# API_BASE_URL=http://localhost:5000/api");
  }
  return lines.join("\n");
}

function makeGitignore(): string {
  return `node_modules/
.env
*.log
.DS_Store
dist/
.cache/
`;
}

// ─── ZIP builder ──────────────────────────────────────────────────────────────

function createZip(sourceDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

// ─── Main packager ────────────────────────────────────────────────────────────

export async function packageProject(
  _combinedHtml: string,          // kept for API compat, not used for file content
  pageType: string,
  conditions: PageConditions,
  rules: ProjectRules,
  validationScore: number,
  validationGrade: string,
  confidenceScore: number,
  htmlFilename: string,
  structuredFiles: GeneratedFile[] = []
): Promise<PackagedProject> {
  ensureProjectsDir();

  const ts         = Date.now();
  const projectSlug = `${pageType}-project-${ts}`;
  const projectDir  = path.join(PROJECTS_DIR, projectSlug);

  // Write all structured files from the template engine
  const writtenFiles: string[] = [];

  for (const file of structuredFiles) {
    const fullPath = path.join(projectDir, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, "utf-8");
    writtenFiles.push(file.path);
  }

  // If no structured files provided, project dir still needs to exist
  if (structuredFiles.length === 0) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Add server-side scaffold files
  const projectName = `${pageType}-page`;
  const description = `Generated ${pageType} page — built with AgentOS`;
  const features    = conditions.hasValidation ? ["form validation"] : [];

  const readme = generateReadme({
    projectName,
    pageType,
    conditions,
    rules,
    features,
    validationScore,
    validationGrade,
    confidenceScore,
    generatedAt: new Date().toISOString(),
    htmlFilename,
  });

  const scaffold: [string, string][] = [
    ["server.js",     makeServerJs()],
    ["package.json",  makePackageJson(projectName, description)],
    [".env.example",  makeEnvExample(conditions)],
    [".gitignore",    makeGitignore()],
    ["README.md",     readme],
  ];

  for (const [relPath, content] of scaffold) {
    const fullPath = path.join(projectDir, relPath);
    fs.writeFileSync(fullPath, content, "utf-8");
    writtenFiles.push(relPath);
  }

  // Create ZIP
  const zipPath    = path.join(PROJECTS_DIR, `${projectSlug}.zip`);
  await createZip(projectDir, zipPath);

  const downloadUrl = `/api/agent/download/${projectSlug}.zip`;

  logger.info(
    { projectSlug, totalFiles: writtenFiles.length },
    "Project packaged"
  );

  return { projectSlug, projectDir, zipPath, downloadUrl, files: writtenFiles };
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getProjectZipPath(zipFilename: string): string | null {
  const safe = path.basename(zipFilename);
  if (!safe.endsWith(".zip")) return null;
  const p = path.join(PROJECTS_DIR, safe);
  return fs.existsSync(p) ? p : null;
}

export function listPackagedProjects(): {
  slug: string;
  createdAt: string;
  size: number;
  downloadUrl: string;
}[] {
  ensureProjectsDir();
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".zip"))
    .map((f) => {
      const stat = fs.statSync(path.join(PROJECTS_DIR, f));
      return {
        slug: f.replace(".zip", ""),
        createdAt: stat.mtime.toISOString(),
        size: stat.size,
        downloadUrl: `/api/agent/download/${f}`,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
