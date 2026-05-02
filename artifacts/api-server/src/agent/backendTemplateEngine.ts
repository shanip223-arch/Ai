/**
 * Backend Template Engine
 *
 * Generates complete, production-ready Node.js / Express backend projects.
 * Each file has a clear responsibility and is self-documenting.
 *
 * Supports:
 *   - Pure REST API  (backend-api project type)
 *   - Express server for fullstack projects (serving static frontend + API)
 */

import type { PageConditions } from "./conditionEngine.js";
import type { FileDecisionPlan } from "./projectIntelligenceEngine.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BackendProject {
  files: Array<{ path: string; content: string; description: string }>;
  entryPoint: string;
  projectSlug: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

function buildConfigIndex(conditions: PageConditions): string {
  const hasAuth = ["login", "register", "dashboard"].includes(conditions.pageType);
  return `/**
 * config/index.js
 * Application configuration — reads from environment variables.
 * Never hard-code secrets here; use .env for that.
 */
'use strict';

require('dotenv').config();

module.exports = {
  port:    process.env.PORT        || 3000,
  nodeEnv: process.env.NODE_ENV    || 'development',
  apiUrl:  process.env.API_BASE_URL || '',
${hasAuth ? `
  jwt: {
    secret:    process.env.JWT_SECRET    || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
` : ""}
};
`.trim();
}

// ─── Middleware ────────────────────────────────────────────────────────────────

function buildErrorHandler(): string {
  return `/**
 * middleware/errorHandler.js
 * Centralised error handling — catches all errors thrown in routes.
 * Always the LAST middleware registered in server.js.
 */
'use strict';

/**
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function errorHandler(err, req, res, _next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Don't leak stack traces in production
  const body = {
    error:   message,
    status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.status(status).json(body);
};
`.trim();
}

function buildNotFoundHandler(): string {
  return `/**
 * middleware/notFound.js
 * 404 handler — catches requests to undefined routes.
 */
'use strict';

module.exports = function notFound(req, res) {
  res.status(404).json({
    error:  'Not Found',
    path:   req.originalUrl,
    method: req.method,
  });
};
`.trim();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function buildApiRoutes(conditions: PageConditions): string {
  const { pageType } = conditions;
  const resource = pageType === "dashboard" || pageType === "admin" ? "items" :
                   pageType === "index"   ? "posts" :
                   pageType === "login"   ? "users" : pageType + "s";

  return `/**
 * routes/api.js
 * All /api/* route definitions.
 * Routes are thin — they validate input and delegate to controllers.
 */
'use strict';

const express    = require('express');
const controller = require('../controllers/index');

const router = express.Router();

// ── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── ${resource.toUpperCase()} resource ──────────────────────────────────────────────────────
/**
 * GET /api/${resource}
 * Returns a list of ${resource}.
 * Query params: ?page=1&limit=20&sort=createdAt
 */
router.get('/${resource}', controller.getAll);

/**
 * GET /api/${resource}/:id
 * Returns a single ${resource.slice(0, -1)} by ID.
 */
router.get('/${resource}/:id', controller.getById);

/**
 * POST /api/${resource}
 * Creates a new ${resource.slice(0, -1)}.
 * Body: JSON object with required fields.
 */
router.post('/${resource}', controller.create);

/**
 * PUT /api/${resource}/:id
 * Updates an existing ${resource.slice(0, -1)} by ID.
 */
router.put('/${resource}/:id', controller.update);

/**
 * DELETE /api/${resource}/:id
 * Deletes a ${resource.slice(0, -1)} by ID.
 */
router.delete('/${resource}/:id', controller.remove);

module.exports = router;
`.trim();
}

// ─── Controllers ──────────────────────────────────────────────────────────────

function buildController(conditions: PageConditions): string {
  const { pageType } = conditions;
  const resource = pageType === "dashboard" ? "items" :
                   pageType === "index"     ? "posts" :
                   pageType === "login"     ? "users" : pageType + "s";

  return `/**
 * controllers/index.js
 * Business logic for the ${resource} resource.
 *
 * In a real project you would replace the in-memory store
 * with database calls (e.g. using Mongoose, Prisma, or pg).
 */
'use strict';

// ── In-memory data store (replace with your DB) ───────────────────────────────
let data = [
  { id: 1, name: 'Sample ${resource.slice(0, -1)} 1', createdAt: new Date().toISOString() },
  { id: 2, name: 'Sample ${resource.slice(0, -1)} 2', createdAt: new Date().toISOString() },
];
let nextId = 3;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginate(arr, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return {
    data:  arr.slice(start, start + limit),
    total: arr.length,
    page:  Number(page),
    pages: Math.ceil(arr.length / limit),
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

exports.getAll = (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  res.json(paginate(data, Number(page), Number(limit)));
};

exports.getById = (req, res, next) => {
  const item = data.find((d) => d.id === Number(req.params.id));
  if (!item) {
    const err = new Error('Not found'); err.status = 404;
    return next(err);
  }
  res.json(item);
};

exports.create = (req, res) => {
  const item = { id: nextId++, ...req.body, createdAt: new Date().toISOString() };
  data.push(item);
  res.status(201).json(item);
};

exports.update = (req, res, next) => {
  const idx = data.findIndex((d) => d.id === Number(req.params.id));
  if (idx === -1) {
    const err = new Error('Not found'); err.status = 404;
    return next(err);
  }
  data[idx] = { ...data[idx], ...req.body, id: data[idx].id };
  res.json(data[idx]);
};

exports.remove = (req, res, next) => {
  const idx = data.findIndex((d) => d.id === Number(req.params.id));
  if (idx === -1) {
    const err = new Error('Not found'); err.status = 404;
    return next(err);
  }
  data.splice(idx, 1);
  res.status(204).send();
};
`.trim();
}

// ─── Server.js ────────────────────────────────────────────────────────────────

function buildServerJs(isFullstack: boolean, conditions: PageConditions): string {
  const staticSection = isFullstack ? `
// ── Static frontend ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
` : "";

  const fallbackSection = isFullstack ? `
// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
` : "";

  return `/**
 * server.js — Application Entry Point
 *
 * Responsibilities:
 *   1. Load environment variables
 *   2. Configure Express middleware
 *   3. Mount routes
 *   4. Start the HTTP server
 *
 * Run:  node server.js
 * Dev:  nodemon server.js
 */
'use strict';

const express    = require('express');
const path       = require('path');
const config     = require('./config');
const apiRoutes  = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const notFound   = require('./middleware/notFound');

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(express.json());                            // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies

// ── Security headers (minimal, no extra deps) ─────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
${staticSection}
// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);
${fallbackSection}
// ── 404 + Error handlers (must be last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(\`\\n  ✅  Server running in \${config.nodeEnv} mode\`);
  console.log(\`  🚀  http://localhost:\${config.port}\\n\`);
  console.log(\`  API: http://localhost:\${config.port}/api/health\\n\`);
});

module.exports = app; // for testing
`.trim();
}

// ─── Package.json ─────────────────────────────────────────────────────────────

function buildPackageJson(name: string, description: string, isFullstack: boolean): string {
  return JSON.stringify(
    {
      name:        name.toLowerCase().replace(/\s+/g, "-"),
      version:     "1.0.0",
      description,
      main:        "server.js",
      scripts: {
        start:  "node server.js",
        dev:    "nodemon server.js",
        test:   "echo 'No tests yet' && exit 0",
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
    },
    null,
    2
  );
}

// ─── .env.example ────────────────────────────────────────────────────────────

function buildEnvExample(conditions: PageConditions): string {
  const hasAuth = ["login", "register", "dashboard"].includes(conditions.pageType);
  return [
    "# Environment Configuration",
    "# Copy this file:  cp .env.example .env",
    "# Fill in real values — NEVER commit .env to git",
    "",
    "# Server",
    "PORT=3000",
    "NODE_ENV=development",
    "",
    "# API",
    "API_BASE_URL=http://localhost:3000/api",
    "",
    ...(hasAuth ? [
      "# Authentication (generate a strong random secret for production)",
      "JWT_SECRET=change-me-to-a-long-random-string",
      "JWT_EXPIRES_IN=7d",
      "",
    ] : []),
    "# Database (uncomment and fill in when you add a database)",
    "# DB_HOST=localhost",
    "# DB_PORT=5432",
    "# DB_NAME=myapp",
    "# DB_USER=postgres",
    "# DB_PASSWORD=your_password",
  ].join("\n");
}

// ─── .gitignore ───────────────────────────────────────────────────────────────

function buildGitignore(): string {
  return `# Dependencies
node_modules/

# Environment variables (contains secrets — never commit)
.env

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db

# Build / cache
dist/
.cache/
`;
}

// ─── README.md ────────────────────────────────────────────────────────────────

function buildBackendReadme(
  name: string,
  description: string,
  conditions: PageConditions,
  plan: FileDecisionPlan
): string {
  const resource = conditions.pageType === "dashboard" ? "items" :
                   conditions.pageType === "login"     ? "users" : conditions.pageType + "s";

  return `# ${name}

${description}

## Tech Stack

${plan.techStack.languages.map((l) => `- **${l}**`).join("\n")}
${plan.techStack.frameworks.map((f) => `- **${f}**`).join("\n")}

> ${plan.techStack.reasoning}

## Project Structure

\`\`\`
${plan.plannedFiles.map((f) => `${f.path.padEnd(30)} ← ${f.role}: ${f.purpose.slice(0, 50)}`).join("\n")}
\`\`\`

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start the server
npm run dev     # development (auto-restart)
npm start       # production
\`\`\`

## API Reference

| Method | Endpoint           | Description            |
|--------|--------------------|------------------------|
| GET    | /api/health        | Health check           |
| GET    | /api/${resource}         | List all ${resource}         |
| GET    | /api/${resource}/:id     | Get single ${resource.slice(0, -1)}       |
| POST   | /api/${resource}         | Create new ${resource.slice(0, -1)}       |
| PUT    | /api/${resource}/:id     | Update ${resource.slice(0, -1)}           |
| DELETE | /api/${resource}/:id     | Delete ${resource.slice(0, -1)}           |

## Architecture Decisions

${plan.reasoning.map((r) => `- ${r}`).join("\n")}

## Generated by AGENT_OS

- **Generated**: ${new Date().toLocaleDateString()}
- **Project type**: ${plan.projectType}
- **Stack**: ${plan.techStack.summary}
`;
}

// ─── Fullstack frontend (public/index.html) ───────────────────────────────────

function buildFullstackFrontend(title: string, conditions: PageConditions): {
  html: string; css: string; js: string;
} {
  const isDark = conditions.colorScheme === "dark";
  const bg     = isDark ? "#0f172a" : "#f8fafc";
  const fg     = isDark ? "#f1f5f9" : "#1e293b";
  const accent = "#6366f1";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title}">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-inner">
      <span class="brand">${title}</span>
      <span class="api-status" id="apiStatus">Checking API…</span>
    </div>
  </nav>

  <main class="container">
    <section class="hero">
      <h1>${title}</h1>
      <p class="subtitle">Full-stack application — Express backend + HTML/CSS/JS frontend</p>
    </section>

    <section class="card-grid">
      <div class="card">
        <div class="card-icon">🚀</div>
        <h3>API Health</h3>
        <p id="healthResult" class="muted">Loading…</p>
      </div>

      <div class="card">
        <div class="card-icon">📦</div>
        <h3>Sample Data</h3>
        <p id="dataResult" class="muted">Loading…</p>
      </div>

      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>Tech Stack</h3>
        <p class="muted">Express.js · Vanilla JS · CSS Custom Properties</p>
      </div>
    </section>
  </main>

  <script src="js/app.js"></script>
</body>
</html>`;

  const css = `/* style.css — All frontend styles */
:root {
  --bg:       ${bg};
  --surface:  ${isDark ? "#1e293b" : "#ffffff"};
  --border:   ${isDark ? "#334155" : "#e2e8f0"};
  --fg:       ${fg};
  --muted:    ${isDark ? "#94a3b8" : "#64748b"};
  --accent:   ${accent};
  --radius:   12px;
  --font:     'Inter', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--bg); color: var(--fg); min-height: 100vh; }

/* Navbar */
.navbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 24px; height: 60px; }
.nav-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 100%; }
.brand { font-weight: 700; font-size: 1.1rem; color: var(--accent); }
.api-status { font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; background: var(--border); color: var(--muted); }
.api-status.ok { background: #22c55e20; color: #22c55e; }
.api-status.error { background: #ef444420; color: #ef4444; }

/* Layout */
.container { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
.hero { text-align: center; margin-bottom: 48px; }
.hero h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
.subtitle { color: var(--muted); font-size: 1rem; }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; }
.card-icon { font-size: 2rem; margin-bottom: 12px; }
.card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 8px; }
.muted { color: var(--muted); font-size: 0.875rem; line-height: 1.5; }
`;

  const js = `// app.js — Frontend application logic
'use strict';

const API_BASE = '/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function apiFetch(endpoint) {
  const res = await fetch(\`\${API_BASE}\${endpoint}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── API health check ───────────────────────────────────────────────────────────

async function checkHealth() {
  const statusEl = document.getElementById('apiStatus');
  try {
    const data = await apiFetch('/health');
    setText('healthResult', \`✅ API online — \${data.timestamp}\`);
    if (statusEl) { statusEl.textContent = 'API ✓'; statusEl.classList.add('ok'); }
  } catch (err) {
    setText('healthResult', \`❌ API offline: \${err.message}\`);
    if (statusEl) { statusEl.textContent = 'API offline'; statusEl.classList.add('error'); }
  }
}

// ── Load sample data ───────────────────────────────────────────────────────────

async function loadData() {
  try {
    const result = await apiFetch('/items');
    const items = result.data || result;
    setText('dataResult', \`\${Array.isArray(items) ? items.length : '?'} items loaded from /api/items\`);
  } catch (err) {
    setText('dataResult', \`Error: \${err.message} — make sure server is running\`);
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  loadData();
});
`;

  return { html, css, js };
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateBackendProject(
  conditions: PageConditions,
  plan: FileDecisionPlan,
  rawCommand: string
): BackendProject {
  const isFullstack = plan.projectType === "fullstack";
  const isBackendOnly = plan.projectType === "backend-api";

  const title = conditions.pageType.charAt(0).toUpperCase() + conditions.pageType.slice(1) + " App";
  const description = `Generated ${plan.projectType} project — ${plan.techStack.summary}`;
  const projectSlug = `${conditions.pageType}-${plan.projectType}-${Date.now()}`;

  const files: Array<{ path: string; content: string; description: string }> = [];

  // ── Backend files ─────────────────────────────────────────────────────────
  files.push(
    { path: "server.js",                  content: buildServerJs(isFullstack, conditions),               description: "Express application entry point" },
    { path: "routes/api.js",              content: buildApiRoutes(conditions),                           description: "API route definitions" },
    { path: "controllers/index.js",       content: buildController(conditions),                          description: "Business logic controllers" },
    { path: "middleware/errorHandler.js", content: buildErrorHandler(),                                  description: "Centralised error handling" },
    { path: "middleware/notFound.js",     content: buildNotFoundHandler(),                               description: "404 handler" },
    { path: "config/index.js",            content: buildConfigIndex(conditions),                         description: "Application configuration" },
    { path: "package.json",               content: buildPackageJson(title, description, isFullstack),    description: "Node.js project manifest" },
    { path: ".env.example",               content: buildEnvExample(conditions),                          description: "Environment variable template" },
    { path: ".gitignore",                 content: buildGitignore(),                                     description: "Git ignore rules" },
    { path: "README.md",                  content: buildBackendReadme(title, description, conditions, plan), description: "Setup and API documentation" }
  );

  // ── Fullstack: add frontend in public/ ────────────────────────────────────
  if (isFullstack) {
    const frontend = buildFullstackFrontend(title, conditions);
    files.push(
      { path: "public/index.html",  content: frontend.html, description: "Frontend HTML entry point" },
      { path: "public/css/style.css", content: frontend.css, description: "Frontend styles" },
      { path: "public/js/app.js",   content: frontend.js,  description: "Frontend JavaScript" }
    );
  }

  return { files, entryPoint: isFullstack ? "public/index.html" : "server.js", projectSlug };
}
