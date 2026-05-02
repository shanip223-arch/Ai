/**
 * Validation Engine
 * Checks generated HTML for structural correctness, CSS consistency,
 * JS syntax, accessibility basics, and responsiveness.
 * Returns a scored report — never silently passes bad output.
 */

export type CheckStatus = "pass" | "fail" | "warn";

export interface ValidationCheck {
  id: string;
  category: "structure" | "css" | "js" | "accessibility" | "responsiveness" | "design-system";
  name: string;
  status: CheckStatus;
  detail: string;
  weight: number; // contribution to score (0-100 total across all checks)
}

export interface ValidationReport {
  passed: boolean;
  score: number; // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
  suggestions: string[];
  canAutoFix: boolean;
}

// ─── HTML Structure Checks ────────────────────────────────────────────────────

function checkDoctype(html: string): ValidationCheck {
  const has = /<!DOCTYPE\s+html>/i.test(html);
  return {
    id: "html-doctype",
    category: "structure",
    name: "DOCTYPE declaration",
    status: has ? "pass" : "fail",
    detail: has ? "<!DOCTYPE html> present" : "Missing <!DOCTYPE html> — browsers may render in quirks mode",
    weight: 5,
  };
}

function checkHtmlTag(html: string): ValidationCheck {
  const has = /<html[\s>]/i.test(html) && /<\/html>/i.test(html);
  return {
    id: "html-tag",
    category: "structure",
    name: "<html> element",
    status: has ? "pass" : "fail",
    detail: has ? "<html> element present and closed" : "Missing or unclosed <html> element",
    weight: 4,
  };
}

function checkHeadSection(html: string): ValidationCheck {
  const hasHead = /<head[\s>]/i.test(html) && /<\/head>/i.test(html);
  const hasCharset = /charset\s*=\s*["']?utf-8/i.test(html);
  const hasViewport = /name\s*=\s*["']viewport["']/i.test(html);
  const hasTitle = /<title>[\s\S]+<\/title>/i.test(html);

  const issues: string[] = [];
  if (!hasHead) issues.push("missing <head>");
  if (!hasCharset) issues.push("missing charset=UTF-8");
  if (!hasViewport) issues.push("missing viewport meta tag");
  if (!hasTitle) issues.push("missing <title>");

  return {
    id: "html-head",
    category: "structure",
    name: "Head section completeness",
    status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warn" : "fail",
    detail: issues.length === 0
      ? "Head has charset, viewport, and title"
      : `Issues: ${issues.join(", ")}`,
    weight: 8,
  };
}

function checkBodySection(html: string): ValidationCheck {
  const has = /<body[\s>]/i.test(html) && /<\/body>/i.test(html);
  const bodyContent = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
  const isEmpty = bodyContent.trim().length < 50;
  return {
    id: "html-body",
    category: "structure",
    name: "<body> element",
    status: !has ? "fail" : isEmpty ? "warn" : "pass",
    detail: !has
      ? "Missing or unclosed <body> element"
      : isEmpty
      ? "<body> present but content appears empty"
      : "<body> element present with content",
    weight: 5,
  };
}

function checkBracketBalance(html: string): ValidationCheck {
  // Count mismatched < > pairs (rough check, not a full parser)
  let opens = (html.match(/</g) ?? []).length;
  let closes = (html.match(/>/g) ?? []).length;
  const diff = Math.abs(opens - closes);
  return {
    id: "html-brackets",
    category: "structure",
    name: "Tag bracket balance",
    status: diff === 0 ? "pass" : diff < 5 ? "warn" : "fail",
    detail: diff === 0
      ? "All tag brackets balanced"
      : `${diff} mismatched angle brackets — possible unclosed tags`,
    weight: 4,
  };
}

// ─── CSS Checks ───────────────────────────────────────────────────────────────

function checkCssVariables(html: string): ValidationCheck {
  const usages = [...(html.matchAll(/var\(--([a-zA-Z0-9-]+)\)/g))].map((m) => m[1]);
  const definitions = [...(html.matchAll(/--([a-zA-Z0-9-]+)\s*:/g))].map((m) => m[1]);
  const defSet = new Set(definitions);
  const undeclared = [...new Set(usages)].filter((v) => !defSet.has(v));

  return {
    id: "css-variables",
    category: "css",
    name: "CSS custom property declarations",
    status: undeclared.length === 0 ? "pass" : undeclared.length <= 3 ? "warn" : "fail",
    detail: undeclared.length === 0
      ? `All ${usages.length} CSS variables are declared`
      : `Undeclared variables: ${undeclared.slice(0, 5).map((v) => `--${v}`).join(", ")}${undeclared.length > 5 ? ` +${undeclared.length - 5} more` : ""}`,
    weight: 10,
  };
}

function checkInlineCss(html: string): ValidationCheck {
  // Count elements with style= that are not just display:none or color (acceptable inline uses)
  const inlineStyles = (html.match(/style="[^"]+"/g) ?? []).length;
  const threshold = 15;
  return {
    id: "css-inline",
    category: "css",
    name: "Inline style usage",
    status: inlineStyles === 0 ? "pass" : inlineStyles <= threshold ? "warn" : "fail",
    detail: inlineStyles === 0
      ? "No inline styles found"
      : `${inlineStyles} inline style attributes — prefer class-based styling`,
    weight: 6,
  };
}

function checkCssRootBlock(html: string): ValidationCheck {
  const has = /:root\s*\{[^}]+\}/i.test(html);
  return {
    id: "css-root",
    category: "css",
    name: ":root design tokens block",
    status: has ? "pass" : "fail",
    detail: has
      ? ":root block with design tokens present"
      : "No :root block found — design tokens must be declared centrally",
    weight: 8,
  };
}

function checkColorContrast(html: string): ValidationCheck {
  // Check for pure black text (#000000 or color:#000) with no lightness adjustment
  const hasPureBlack = /#000000|color:\s*#000(?![\da-f])/i.test(html);
  const hasPureWhite = /background(?:-color)?:\s*#fff(?:fff)?(?![\da-f])/i.test(html);
  const issues: string[] = [];
  if (hasPureBlack) issues.push("pure black #000 used — prefer near-black #0f172a");
  if (hasPureWhite) issues.push("pure white background detected — prefer #fafafa for softer feel");

  return {
    id: "css-contrast",
    category: "css",
    name: "Color token discipline",
    status: issues.length === 0 ? "pass" : "warn",
    detail: issues.length === 0
      ? "No hardcoded extreme colors detected"
      : issues.join("; "),
    weight: 5,
  };
}

// ─── JS Checks ────────────────────────────────────────────────────────────────

function checkJsSyntaxBalance(html: string): ValidationCheck {
  const scripts = [...(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))].map((m) => m[1]);

  if (scripts.length === 0) {
    return {
      id: "js-syntax",
      category: "js",
      name: "JavaScript syntax balance",
      status: "pass",
      detail: "No inline scripts to validate",
      weight: 5,
    };
  }

  const issues: string[] = [];
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i];
    const opens = (src.match(/\{/g) ?? []).length;
    const closes = (src.match(/\}/g) ?? []).length;
    const parensOpen = (src.match(/\(/g) ?? []).length;
    const parensClose = (src.match(/\)/g) ?? []).length;
    if (Math.abs(opens - closes) > 2) issues.push(`Script ${i + 1}: unbalanced braces`);
    if (Math.abs(parensOpen - parensClose) > 2) issues.push(`Script ${i + 1}: unbalanced parentheses`);
  }

  return {
    id: "js-syntax",
    category: "js",
    name: "JavaScript syntax balance",
    status: issues.length === 0 ? "pass" : "warn",
    detail: issues.length === 0
      ? `${scripts.length} script block(s) — brace/paren balance OK`
      : issues.join("; "),
    weight: 5,
  };
}

function checkEventHandlers(html: string): ValidationCheck {
  // Inline event handlers (onclick= etc.) should be minimal
  const handlers = (html.match(/on(?:click|submit|change|input|focus|blur)="[^"]*"/gi) ?? []).length;
  return {
    id: "js-handlers",
    category: "js",
    name: "Event handler style",
    status: handlers === 0 ? "pass" : handlers <= 5 ? "warn" : "fail",
    detail: handlers === 0
      ? "No inline event handlers"
      : `${handlers} inline event handlers — acceptable for generated pages but prefer addEventListener`,
    weight: 3,
  };
}

// ─── Accessibility Checks ─────────────────────────────────────────────────────

function checkImgAlt(html: string): ValidationCheck {
  const imgs = (html.match(/<img\b[^>]*/gi) ?? []);
  const withoutAlt = imgs.filter((img) => !/alt\s*=/i.test(img));
  return {
    id: "a11y-img-alt",
    category: "accessibility",
    name: "Image alt attributes",
    status: withoutAlt.length === 0 ? "pass" : withoutAlt.length <= 2 ? "warn" : "fail",
    detail: withoutAlt.length === 0
      ? `All ${imgs.length} image(s) have alt attributes`
      : `${withoutAlt.length} image(s) missing alt attribute`,
    weight: 6,
  };
}

function checkFormLabels(html: string): ValidationCheck {
  const inputs = (html.match(/<input\b(?![^>]*type\s*=\s*["'](?:hidden|submit|button|reset|checkbox|radio)["'])[^>]*/gi) ?? []);
  const labelsById = (html.match(/<label\b[^>]*for\s*=/gi) ?? []).length;
  const ariaLabeled = inputs.filter((i) => /aria-label(ledby)?\s*=/i.test(i)).length;
  const covered = labelsById + ariaLabeled;

  return {
    id: "a11y-labels",
    category: "accessibility",
    name: "Form input labels",
    status: inputs.length === 0 ? "pass" : covered >= inputs.length ? "pass" : covered > 0 ? "warn" : "fail",
    detail: inputs.length === 0
      ? "No unlabeled form inputs"
      : `${covered}/${inputs.length} inputs have labels or aria-label`,
    weight: 7,
  };
}

function checkButtonText(html: string): ValidationCheck {
  const buttons = [...(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi))];
  const empty = buttons.filter((m) => m[1].replace(/<[^>]+>/g, "").trim() === "");
  return {
    id: "a11y-btn-text",
    category: "accessibility",
    name: "Button text content",
    status: empty.length === 0 ? "pass" : "warn",
    detail: empty.length === 0
      ? `All ${buttons.length} button(s) have text content`
      : `${empty.length} button(s) have no visible text — add aria-label`,
    weight: 4,
  };
}

// ─── Responsiveness Checks ────────────────────────────────────────────────────

function checkMediaQueries(html: string): ValidationCheck {
  const mediaQueries = (html.match(/@media\s*\(/g) ?? []).length;
  return {
    id: "resp-media",
    category: "responsiveness",
    name: "Responsive @media queries",
    status: mediaQueries >= 2 ? "pass" : mediaQueries === 1 ? "warn" : "fail",
    detail: mediaQueries >= 2
      ? `${mediaQueries} @media breakpoints defined`
      : mediaQueries === 1
      ? "Only 1 @media query — consider adding more breakpoints"
      : "No @media queries — page may not be mobile-friendly",
    weight: 8,
  };
}

function checkViewportMeta(html: string): ValidationCheck {
  const has = /content\s*=\s*["'][^"']*width\s*=\s*device-width[^"']*["']/i.test(html);
  return {
    id: "resp-viewport",
    category: "responsiveness",
    name: "Viewport meta tag",
    status: has ? "pass" : "fail",
    detail: has
      ? "viewport meta with device-width present"
      : "Missing viewport meta — mobile browsers will default to desktop scaling",
    weight: 5,
  };
}

function checkFlexGrid(html: string): ValidationCheck {
  const hasFlex = /display\s*:\s*flex/i.test(html);
  const hasGrid = /display\s*:\s*grid/i.test(html);
  return {
    id: "resp-layout",
    category: "responsiveness",
    name: "Flexbox/Grid layout",
    status: hasFlex || hasGrid ? "pass" : "warn",
    detail: hasFlex && hasGrid
      ? "Both flexbox and grid used for layout"
      : hasFlex
      ? "Flexbox layout used"
      : hasGrid
      ? "CSS Grid layout used"
      : "No flexbox or grid — may rely on floats or tables",
    weight: 5,
  };
}

// ─── Design System Checks ─────────────────────────────────────────────────────

function checkDesignTokenUsage(html: string): ValidationCheck {
  const expectedTokens = [
    "--color-primary",
    "--color-bg",
    "--color-text",
    "--color-border",
    "--border-radius",
    "--shadow-md",
    "--spacing-4",
    "--font-body",
  ];
  const present = expectedTokens.filter((t) => html.includes(t));
  const ratio = present.length / expectedTokens.length;

  return {
    id: "ds-tokens",
    category: "design-system",
    name: "Design system token usage",
    status: ratio >= 0.7 ? "pass" : ratio >= 0.4 ? "warn" : "fail",
    detail: `${present.length}/${expectedTokens.length} design tokens used (${Math.round(ratio * 100)}% coverage)`,
    weight: 10,
  };
}

function checkSpacingScale(html: string): ValidationCheck {
  // Check that spacing uses var(--spacing-*) or the 8px scale values
  const spacingVars = (html.match(/var\(--spacing-\d+\)/g) ?? []).length;
  const rawPx = (html.match(/(?:padding|margin):\s*(?!0)\d+px/g) ?? []).length;
  return {
    id: "ds-spacing",
    category: "design-system",
    name: "Spacing scale adherence",
    status: spacingVars > rawPx ? "pass" : rawPx > 10 ? "warn" : "pass",
    detail: spacingVars > 0
      ? `${spacingVars} spacing tokens used, ${rawPx} raw px values`
      : rawPx > 10
      ? `${rawPx} raw px spacing values — prefer var(--spacing-N) tokens`
      : "Spacing appears consistent",
    weight: 5,
  };
}

// ─── Main Validator ───────────────────────────────────────────────────────────

export function validateOutput(html: string): ValidationReport {
  const checks: ValidationCheck[] = [
    // Structure
    checkDoctype(html),
    checkHtmlTag(html),
    checkHeadSection(html),
    checkBodySection(html),
    checkBracketBalance(html),
    // CSS
    checkCssVariables(html),
    checkInlineCss(html),
    checkCssRootBlock(html),
    checkColorContrast(html),
    // JS
    checkJsSyntaxBalance(html),
    checkEventHandlers(html),
    // Accessibility
    checkImgAlt(html),
    checkFormLabels(html),
    checkButtonText(html),
    // Responsiveness
    checkMediaQueries(html),
    checkViewportMeta(html),
    checkFlexGrid(html),
    // Design system
    checkDesignTokenUsage(html),
    checkSpacingScale(html),
  ];

  // Score: for each check, award weight * (pass=1, warn=0.5, fail=0)
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.reduce((s, c) => {
    return s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0);
  }, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  const errors = checks.filter((c) => c.status === "fail").map((c) => `[${c.category}] ${c.name}: ${c.detail}`);
  const warnings = checks.filter((c) => c.status === "warn").map((c) => `[${c.category}] ${c.name}: ${c.detail}`);

  const suggestions: string[] = [];
  if (!html.includes("font-family")) suggestions.push("Add explicit font-family to body");
  if (!html.includes("transition")) suggestions.push("Add CSS transitions for interactive states");
  if (!html.includes(":hover")) suggestions.push("Add :hover states to interactive elements");
  if (!html.includes("focus")) suggestions.push("Add :focus styles for keyboard navigation");

  const grade: ValidationReport["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";

  const canAutoFix = errors.some((e) =>
    e.includes("DOCTYPE") || e.includes("charset") || e.includes("viewport")
  );

  return {
    passed: errors.length === 0,
    score,
    grade,
    checks,
    errors,
    warnings,
    suggestions,
    canAutoFix,
  };
}

/**
 * Auto-fix common structural issues in generated HTML.
 * Only applied when validation reports fixable errors.
 */
export function autoFixHtml(html: string, report: ValidationReport): string {
  let fixed = html;

  // Fix missing DOCTYPE
  if (!fixed.trimStart().startsWith("<!DOCTYPE")) {
    fixed = "<!DOCTYPE html>\n" + fixed;
  }

  // Fix missing charset
  if (!/charset/i.test(fixed)) {
    fixed = fixed.replace(/<head([^>]*)>/i, '<head$1>\n  <meta charset="UTF-8">');
  }

  // Fix missing viewport
  if (!/viewport/i.test(fixed)) {
    fixed = fixed.replace(
      /<meta\s+charset[^>]*>/i,
      (m) => m + '\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  }

  return fixed;
}
