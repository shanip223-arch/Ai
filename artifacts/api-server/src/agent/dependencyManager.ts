/**
 * Dependency Manager
 * Scans generated HTML for library usage, generates correct package.json,
 * setup instructions, and ensures the project runs locally out of the box.
 */

export interface DetectedLibrary {
  name: string;
  version: string;
  cdnUrl: string;
  npmPackage: string;
  type: "ui" | "animation" | "utility" | "charting" | "icons" | "font";
  detected: boolean;
}

export interface DependencyManifest {
  detectedLibraries: DetectedLibrary[];
  suggestedLibraries: DetectedLibrary[];
  generatedPackageJson: string;
  generatedSetupMd: string;
  generatedGitignore: string;
  generatedNvmRc: string;
  npmInstallCommand: string;
  devStartCommand: string;
  requiredNodeVersion: string;
  isVanillaJs: boolean;
}

// ── Known library detection patterns ─────────────────────────────────────────

const KNOWN_LIBS: Array<{
  name: string;
  patterns: RegExp[];
  version: string;
  cdnUrl: string;
  npmPackage: string;
  type: DetectedLibrary["type"];
  runtimeDep: boolean;
}> = [
  {
    name: "Bootstrap",
    patterns: [/bootstrap\.min\.(css|js)/i, /class=["'][^"']*(?:btn-primary|container-fluid|row|col-md)/i],
    version: "^5.3.3",
    cdnUrl: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    npmPackage: "bootstrap",
    type: "ui",
    runtimeDep: true,
  },
  {
    name: "Tailwind CSS",
    patterns: [/tailwindcss/i, /class=["'][^"']*(?:flex|grid|bg-\w|text-\w|p-\d|m-\d|rounded|shadow)/i],
    version: "^3.4.1",
    cdnUrl: "https://cdn.tailwindcss.com",
    npmPackage: "tailwindcss",
    type: "ui",
    runtimeDep: false,
  },
  {
    name: "Alpine.js",
    patterns: [/alpinejs/i, /x-data|x-bind|x-on:|x-show|x-if|x-for/i],
    version: "^3.13.5",
    cdnUrl: "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js",
    npmPackage: "alpinejs",
    type: "utility",
    runtimeDep: true,
  },
  {
    name: "GSAP",
    patterns: [/gsap\.min\.js/i, /\bgsap\b.*(?:to|from|timeline|ScrollTrigger)/i],
    version: "^3.12.5",
    cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
    npmPackage: "gsap",
    type: "animation",
    runtimeDep: true,
  },
  {
    name: "Chart.js",
    patterns: [/chart\.js/i, /new\s+Chart\s*\(/i],
    version: "^4.4.2",
    cdnUrl: "https://cdn.jsdelivr.net/npm/chart.js",
    npmPackage: "chart.js",
    type: "charting",
    runtimeDep: true,
  },
  {
    name: "Lucide Icons",
    patterns: [/lucide/i, /lucide\.createIcons/i],
    version: "^0.363.0",
    cdnUrl: "https://unpkg.com/lucide@latest",
    npmPackage: "lucide",
    type: "icons",
    runtimeDep: false,
  },
  {
    name: "Animate.css",
    patterns: [/animate\.css/i, /class=["'][^"']*(?:animate__animated|animate__)/i],
    version: "^4.1.1",
    cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
    npmPackage: "animate.css",
    type: "animation",
    runtimeDep: false,
  },
  {
    name: "Font Awesome",
    patterns: [/font-awesome|fontawesome/i, /class=["'][^"']*fa[bsr]?\s+fa-/i],
    version: "^6.5.1",
    cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
    npmPackage: "@fortawesome/fontawesome-free",
    type: "icons",
    runtimeDep: false,
  },
];

// ── Scanner ───────────────────────────────────────────────────────────────────

export function scanDependencies(html: string): DetectedLibrary[] {
  return KNOWN_LIBS
    .filter((lib) => lib.patterns.some((p) => p.test(html)))
    .map((lib) => ({
      name: lib.name,
      version: lib.version,
      cdnUrl: lib.cdnUrl,
      npmPackage: lib.npmPackage,
      type: lib.type,
      detected: true,
    }));
}

// ── Package.json generator ────────────────────────────────────────────────────

function buildPackageJson(opts: {
  projectName: string;
  description: string;
  pageType: string;
  detectedLibs: DetectedLibrary[];
  hasBackend: boolean;
}): string {
  const runtimeDeps: Record<string, string> = {
    express: "^4.21.2",
    dotenv:  "^16.4.5",
  };

  // Add detected runtime libs
  for (const lib of opts.detectedLibs) {
    if (KNOWN_LIBS.find((l) => l.name === lib.name)?.runtimeDep) {
      runtimeDeps[lib.npmPackage] = lib.version;
    }
  }

  const devDeps: Record<string, string> = {
    nodemon:           "^3.1.0",
    "@types/node":     "^20.14.0",
    "@types/express":  "^4.17.21",
  };

  const pkg = {
    name: opts.projectName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
    version: "1.0.0",
    description: opts.description,
    main: "server.js",
    scripts: {
      start:      "node server.js",
      dev:        "nodemon server.js --watch '*.js' --watch '*.html' --watch '*.css'",
      "dev:open": "node -e \"require('child_process').exec('open http://localhost:3000')\" && npm run dev",
      preview:    "node -e \"require('http').createServer((req,res)=>require('fs').createReadStream('index.html').pipe(res)).listen(3001,()=>console.log('Preview: http://localhost:3001'))\"",
      lint:       "npx eslint *.js --fix",
    },
    dependencies: runtimeDeps,
    devDependencies: devDeps,
    engines: {
      node: ">=18.0.0",
      npm:  ">=9.0.0",
    },
    browserslist: ["> 1%", "last 2 versions", "not dead"],
    license: "MIT",
    private: true,
    keywords: ["web", opts.pageType, "generated", "agentos"],
  };

  return JSON.stringify(pkg, null, 2);
}

// ── Setup instructions ────────────────────────────────────────────────────────

function buildSetupMd(opts: {
  projectName: string;
  pageType: string;
  detectedLibs: DetectedLibrary[];
  hasBackend: boolean;
}): string {
  const libList = opts.detectedLibs.length > 0
    ? opts.detectedLibs.map((l) => `- **${l.name}** (${l.type})`).join("\n")
    : "- No external libraries detected — pure vanilla JS/CSS";

  return `# ${opts.projectName} — Setup Guide

## Prerequisites
- **Node.js** >= 18.0.0 — [Download](https://nodejs.org)
- **npm** >= 9.0.0 (comes with Node.js)

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Start development server
npm run dev

# App running at: http://localhost:3000
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm start\` | Start production server |
| \`npm run dev\` | Start with hot-reload via nodemon |
| \`npm run preview\` | Quick static preview (no Node.js needed) |

## Project Structure

\`\`\`
${opts.projectName}/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Page styles (auto-generated)
├── js/
│   └── main.js         # Interactive logic (auto-generated)
├── server.js           # Express static server
├── package.json        # Dependencies
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
└── README.md           # This file
\`\`\`

## Detected Libraries

${libList}

## Environment Variables

Copy \`.env.example\` to \`.env\` and fill in your values:

\`\`\`bash
cp .env.example .env
\`\`\`

## Production Deployment

### Render / Railway / Fly.io
\`\`\`bash
# Set environment variables in your dashboard, then:
npm start
\`\`\`

### Vercel / Netlify (static)
\`\`\`bash
# Just deploy the folder — it's static HTML/CSS/JS
\`\`\`

### Docker
\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## Generated by
**AGENT_OS** — AI Developer Assistant  
Questions? Type your follow-up in the chat.
`;
}

// ── .gitignore generator ──────────────────────────────────────────────────────

function buildGitignore(): string {
  return `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
logs/

# Build output
dist/
build/
.cache/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Editor directories
.idea/
.vscode/
*.swp
*.swo

# Runtime
pids/
*.pid
*.seed
`;
}

// ── .nvmrc ────────────────────────────────────────────────────────────────────

function buildNvmRc(): string {
  return "20\n";
}

// ── Main entry ────────────────────────────────────────────────────────────────

export function generateDependencyManifest(opts: {
  html: string;
  projectName: string;
  description: string;
  pageType: string;
}): DependencyManifest {
  const detectedLibs = scanDependencies(opts.html);
  const isVanillaJs  = detectedLibs.length === 0;

  const manifest: DependencyManifest = {
    detectedLibraries: detectedLibs,
    suggestedLibraries: [],
    generatedPackageJson: buildPackageJson({
      projectName: opts.projectName,
      description: opts.description,
      pageType: opts.pageType,
      detectedLibs,
      hasBackend: false,
    }),
    generatedSetupMd: buildSetupMd({
      projectName: opts.projectName,
      pageType: opts.pageType,
      detectedLibs,
      hasBackend: false,
    }),
    generatedGitignore: buildGitignore(),
    generatedNvmRc: buildNvmRc(),
    npmInstallCommand: "npm install",
    devStartCommand: "npm run dev",
    requiredNodeVersion: ">=18.0.0",
    isVanillaJs,
  };

  return manifest;
}
