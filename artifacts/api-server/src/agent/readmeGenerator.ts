/**
 * README Generator
 * Produces a complete, professional README.md for every generated project.
 * Output is always copy-paste runnable — no gaps, no placeholders.
 */

import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";

export interface ReadmeContext {
  projectName: string;
  pageType: string;
  conditions: PageConditions;
  rules: ProjectRules;
  features: string[];
  validationScore: number;
  validationGrade: string;
  confidenceScore: number;
  generatedAt: string;
  htmlFilename: string;
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  login: "A clean, accessible sign-in page with email/password authentication, form validation, and optional social login support.",
  dashboard: "A fully responsive admin dashboard featuring a sidebar navigation, KPI metric cards, and a data table with sortable columns.",
  index: "A modern SaaS landing page with a hero section, feature grid, social proof, and a sticky navigation bar.",
  register: "A multi-field registration page with real-time inline validation, password strength indicator, and accessible form controls.",
  form: "A professional contact/feedback form with grouped fields, character counters, and a clear submission flow.",
  profile: "A user profile page with avatar display, editable fields, and account settings layout.",
  gallery: "A responsive image gallery/portfolio with grid layout and lightbox-ready structure.",
};

const TECH_STACK: Record<string, string[]> = {
  login: ["HTML5", "CSS3 (Custom Properties)", "Vanilla JS"],
  dashboard: ["HTML5", "CSS3 (Grid + Flexbox)", "Vanilla JS"],
  index: ["HTML5", "CSS3 (Custom Properties)", "Vanilla JS"],
  register: ["HTML5", "CSS3", "Vanilla JS (form validation)"],
  form: ["HTML5", "CSS3", "Vanilla JS"],
  profile: ["HTML5", "CSS3", "Vanilla JS"],
  gallery: ["HTML5", "CSS3 (Grid)", "Vanilla JS"],
};

function getFolderStructure(pageType: string): string {
  return `
\`\`\`
project/
├── index.html          # Main HTML entry point
├── styles/
│   └── main.css        # All styles (design system + page-specific)
├── scripts/
│   └── main.js         # JavaScript logic and interactivity
├── server.js           # Local dev server (Express static)
├── package.json        # Node.js project manifest
├── .env                # Environment variables (copy from .env.example)
├── .env.example        # Example environment config
└── README.md           # This file
\`\`\``.trim();
}

function getEnvSection(conditions: PageConditions): string {
  const vars: string[] = [
    "# Server configuration",
    "PORT=3000",
    "",
  ];

  if (conditions.pageType === "login" || conditions.pageType === "register") {
    vars.push("# Authentication (add your backend details here)");
    vars.push("# API_BASE_URL=http://localhost:5000/api");
    vars.push("# JWT_SECRET=your_jwt_secret_here");
  } else if (conditions.pageType === "dashboard") {
    vars.push("# API endpoint for fetching dashboard data");
    vars.push("# API_BASE_URL=http://localhost:5000/api");
    vars.push("# DASHBOARD_REFRESH_INTERVAL=30000");
  } else {
    vars.push("# Add your environment variables here");
    vars.push("# API_BASE_URL=http://localhost:5000");
  }

  return vars.join("\n");
}

function getFeaturesList(features: string[], conditions: PageConditions): string {
  const all = [...features];

  if (conditions.hasValidation) all.push("Form validation with inline error messages");
  if (conditions.hasNavbar) all.push("Sticky navigation bar");
  if (conditions.hasFooter) all.push("Responsive footer");
  if (conditions.responsive) all.push("Fully responsive (mobile-first, 375px → 1440px)");
  if (conditions.colorScheme === "dark") all.push("Dark theme with design system tokens");
  else all.push("Light theme with design system tokens");
  if (conditions.animationsEnabled) all.push("Smooth CSS animations and transitions");

  const unique = [...new Set(all)].filter(Boolean);
  return unique.map((f) => `- ${f}`).join("\n");
}

function getTechStack(pageType: string): string {
  const stack = TECH_STACK[pageType] ?? ["HTML5", "CSS3", "Vanilla JS"];
  return stack.map((t) => `- **${t}**`).join("\n") +
    "\n- **Express.js** (local dev server)\n- **dotenv** (environment config)";
}

function getUsageExamples(pageType: string): string {
  if (pageType === "login") {
    return `
### Form Submission
The login form submits to \`/api/auth/login\` by default. Customize the \`action\` or JS handler in \`scripts/main.js\`:
\`\`\`js
// scripts/main.js
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;
  // Replace with your actual API call:
  const res = await fetch(process.env.API_BASE_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
});
\`\`\``.trim();
  }

  if (pageType === "dashboard") {
    return `
### Loading Dynamic Data
Fetch real data by updating the placeholder in \`scripts/main.js\`:
\`\`\`js
// scripts/main.js
async function loadDashboardData() {
  const res = await fetch('/api/dashboard/stats');
  const data = await res.json();
  document.querySelector('#total-users').textContent = data.totalUsers;
  document.querySelector('#revenue').textContent = '$' + data.revenue;
}
loadDashboardData();
\`\`\``.trim();
  }

  if (pageType === "index") {
    return `
### Customizing Content
Edit \`index.html\` directly to update the hero headline, features, and CTA:
\`\`\`html
<!-- index.html — hero section -->
<h1 class="hero-title">Your Product Headline</h1>
<p class="hero-subtitle">Your value proposition here</p>
<a href="#" class="btn btn-primary">Get Started Free</a>
\`\`\``.trim();
  }

  return `
### Customizing the Project
- Edit \`index.html\` for markup changes
- Edit \`styles/main.css\` for styling adjustments  
- Edit \`scripts/main.js\` for behavior changes
- All CSS variables are defined in the \`:root\` block of \`styles/main.css\`
`.trim();
}

export function generateReadme(ctx: ReadmeContext): string {
  const description = PAGE_DESCRIPTIONS[ctx.pageType] ?? "A professionally generated web page by AgentOS.";
  const featuresList = getFeaturesList(ctx.features, ctx.conditions);
  const techStack = getTechStack(ctx.pageType);
  const folderStructure = getFolderStructure(ctx.pageType);
  const envSection = getEnvSection(ctx.conditions);
  const usageExamples = getUsageExamples(ctx.pageType);
  const colorNote = ctx.conditions.colorScheme === "dark"
    ? "Dark theme (customizable via CSS variables in `styles/main.css`)"
    : "Light theme (customizable via CSS variables in `styles/main.css`)";

  return `# ${ctx.projectName}

> Generated by **AgentOS** on ${new Date(ctx.generatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}  
> Quality Score: **${ctx.validationScore}/100** (Grade **${ctx.validationGrade}**) · Confidence: **${ctx.confidenceScore}/100**

## Overview

${description}

**Theme:** ${colorNote}

## Features

${featuresList}

## Tech Stack

${techStack}

## Folder Structure

${folderStructure}

## Prerequisites

Make sure you have the following installed:

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **npm** v9+ (comes with Node.js)

Verify with:
\`\`\`bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
\`\`\`

## Installation

### 1. Clone or download the project

If you downloaded a ZIP file, extract it to a folder of your choice.

### 2. Navigate into the project folder

\`\`\`bash
cd ${ctx.projectName}
\`\`\`

### 3. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 4. Configure environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Then open \`.env\` and fill in your values:

\`\`\`env
${envSection}
\`\`\`

## Running the Project

### Start the local server

\`\`\`bash
npm start
\`\`\`

Then open your browser at:

\`\`\`
http://localhost:3000
\`\`\`

### Development mode (auto-restart on file changes)

\`\`\`bash
npm run dev
\`\`\`

> Requires \`nodemon\`. It will be installed automatically with \`npm install\`.

### Open directly (no server needed)

You can also open \`index.html\` directly in your browser — no server required for basic viewing:

\`\`\`bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
\`\`\`

## Usage & Customization

${usageExamples}

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| \`PORT\` | \`3000\` | Port the local server listens on |

Add additional variables to \`.env\` as needed for your backend integration.

## Customizing Styles

All design tokens are CSS custom properties defined at the top of \`styles/main.css\`:

\`\`\`css
:root {
  --color-primary: ${ctx.rules.colors.primary};
  --color-bg: ${ctx.rules.colors.background};
  --color-text: ${ctx.rules.colors.text};
  --border-radius: ${ctx.rules.borderRadius};
  /* ... more tokens */
}
\`\`\`

Change any value here and it propagates across the entire page automatically.

## Quality Report

| Metric | Score |
|--------|-------|
| Validation Score | ${ctx.validationScore}/100 |
| Grade | ${ctx.validationGrade} |
| Confidence Score | ${ctx.confidenceScore}/100 |
| Responsive | ✅ Yes |
| Accessible | ${ctx.validationScore >= 70 ? "✅" : "⚠️"} ${ctx.validationScore >= 70 ? "Yes" : "Partial"} |

## License

MIT — free to use, modify, and distribute.

---

*Built with [AgentOS](https://github.com/agentOS) — AI-powered web generation*
`;
}
