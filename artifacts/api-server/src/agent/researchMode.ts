import { logger } from "../lib/logger.js";

export interface ResearchResult {
  query: string;
  findings: string[];
  bestPractices: string[];
  codeSnippets: string[];
}

const UI_BEST_PRACTICES: Record<string, string[]> = {
  login: [
    "Use clear labels, not placeholder text as labels",
    "Show password toggle (eye icon)",
    "Provide 'Forgot password?' link prominently",
    "Use email as the default identifier",
    "Indicate required fields clearly",
    "Show login button disabled until fields are filled",
    "Support social login options (Google, GitHub)",
    "Provide clear error messages (not just 'Invalid credentials')",
  ],
  dashboard: [
    "Show KPIs at the top with large, readable numbers",
    "Use a consistent left sidebar for navigation",
    "Include a search bar in the header",
    "Use charts for trends, not just tables",
    "Highlight anomalies and changes with color",
    "Provide quick action buttons for common tasks",
    "Add breadcrumbs for deep navigation",
    "Ensure dark mode support",
  ],
  index: [
    "Above-the-fold hero with clear value proposition",
    "One primary CTA, not multiple competing buttons",
    "Social proof near the fold (logos, testimonials, numbers)",
    "Feature grid in 3-column layout",
    "Sticky navigation with transparent-to-solid scroll effect",
    "Footer with sitemap and contact info",
    "Fast load time — no unnecessary animations above fold",
  ],
  register: [
    "Minimize fields — only ask what's absolutely needed",
    "Inline validation as user types",
    "Show password strength indicator",
    "Clear error messages next to the invalid field",
    "Progress indicator for multi-step forms",
    "Link to Terms of Service and Privacy Policy",
  ],
  form: [
    "Group related fields together",
    "Use single-column layout for better usability",
    "Show success state after submission",
    "Autofocus first field on load",
    "Support keyboard navigation (Tab order)",
    "Character limits with live counter for textareas",
  ],
};

function extractDomainBestPractices(pageType: string): string[] {
  return UI_BEST_PRACTICES[pageType] ?? UI_BEST_PRACTICES["index"];
}

function generateFindings(query: string, pageType: string): string[] {
  const base = [
    `Most professional ${pageType} pages use Inter or Geist as their primary font`,
    `8px spacing scale is the industry standard (8, 16, 24, 32, 48, 64px)`,
    `Border radius of 6-8px is considered modern and approachable`,
    `Primary CTA should have high contrast — minimum 4.5:1 ratio`,
    `Mobile-first approach: design for 375px, scale up`,
    `Loading states and skeleton screens improve perceived performance`,
    `Avoid pure black (#000) — use near-black like #0f172a for softer feel`,
  ];

  if (query.toLowerCase().includes("dark")) {
    base.push("Dark mode backgrounds: #0f0f13 (base), #1a1a24 (surface), #2d2d40 (border)");
    base.push("In dark mode, use slightly desaturated colors to reduce eye strain");
  }

  return base;
}

export async function performResearch(
  query: string,
  pageType: string,
  _researchEnabled: boolean
): Promise<ResearchResult> {
  logger.info({ query, pageType }, "Research mode: gathering best practices");

  await new Promise((resolve) => setTimeout(resolve, 200));

  const findings = generateFindings(query, pageType);
  const bestPractices = extractDomainBestPractices(pageType);
  const codeSnippets: string[] = [];

  return {
    query,
    findings,
    bestPractices,
    codeSnippets,
  };
}
