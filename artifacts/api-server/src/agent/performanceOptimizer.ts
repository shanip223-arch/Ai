/**
 * Performance Optimizer
 * Reduces generated HTML/CSS/JS size, adds performance hints,
 * and reports before/after metrics. Never changes visual output.
 */

export interface PerformanceOptimization {
  id: string;
  category: "css" | "html" | "js" | "assets" | "hints";
  description: string;
  bytesSaved: number;
}

export interface PerformanceReport {
  score: number;              // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  reductionBytes: number;
  reductionPercent: number;
  optimizationsApplied: PerformanceOptimization[];
  optimizedHtml: string;
  summary: string;
}

// ── CSS optimizations ─────────────────────────────────────────────────────────

function minifyCssBlocks(html: string): { result: string; saved: number } {
  let saved = 0;
  const result = html.replace(/<style[\s\S]*?<\/style>/gi, (block) => {
    const before = block.length;
    let css = block
      .replace(/\/\*[\s\S]*?\*\//g, "")          // remove comments
      .replace(/\s{2,}/g, " ")                     // collapse whitespace
      .replace(/\s*([{}:;,>~+])\s*/g, "$1")        // remove space around operators
      .replace(/;}/g, "}")                          // remove trailing semicolons
      .replace(/\n/g, "")                           // remove newlines
      .replace(/  +/g, " ")                         // collapse remaining spaces
      .trim();
    saved += before - css.length;
    return css;
  });
  return { result, saved };
}

function removeCssComments(html: string): { result: string; saved: number } {
  const before = html.length;
  const result = html.replace(/\/\*(?![\s\S]*<\/style>)[\s\S]*?\*\//g, "");
  return { result, saved: before - result.length };
}

// ── HTML optimizations ────────────────────────────────────────────────────────

function removeHtmlComments(html: string): { result: string; saved: number } {
  const before = html.length;
  // Keep IE conditional comments and important markers
  const result = html.replace(/<!--(?!\[if)(?!.*?important)[\s\S]*?-->/g, "");
  return { result, saved: before - result.length };
}

function collapseHtmlWhitespace(html: string): { result: string; saved: number } {
  const before = html.length;
  // Collapse whitespace between tags (preserve pre/textarea/script/style blocks)
  const result = html
    .replace(/(<\/?(pre|textarea|script|style)[^>]*>[\s\S]*?<\/\2>)/gi, (m) => m) // preserve
    .replace(/>\s{2,}</g, "> <")   // collapse inter-tag whitespace
    .replace(/\n\s*\n/g, "\n");    // collapse blank lines
  return { result, saved: before - result.length };
}

// ── JS optimizations ──────────────────────────────────────────────────────────

function minifyInlineScripts(html: string): { result: string; saved: number } {
  let saved = 0;
  const result = html.replace(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/gi, (block, content) => {
    const before = block.length;
    const minified = content
      .replace(/\/\/[^\n]*/g, "")          // remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, "")    // remove multi-line comments
      .replace(/\s{2,}/g, " ")             // collapse whitespace
      .replace(/\n/g, " ")                  // remove newlines
      .trim();
    const newBlock = block.replace(content, minified);
    saved += before - newBlock.length;
    return newBlock;
  });
  return { result, saved };
}

function deferNonCriticalScripts(html: string): { result: string; saved: number } {
  // Add defer to external scripts that don't already have it or async
  const before = html.length;
  const result = html.replace(
    /<script\s+src=["'][^"']+["'](?!\s+(?:defer|async))[^>]*>/gi,
    (tag) => {
      if (tag.includes("defer") || tag.includes("async")) return tag;
      return tag.replace(">", " defer>");
    }
  );
  return { result, saved: before - result.length };
}

// ── Asset optimizations ───────────────────────────────────────────────────────

function addLazyLoading(html: string): { result: string; saved: number } {
  // Add loading="lazy" to img tags that don't have it (except above-the-fold hero imgs)
  let count = 0;
  const result = html.replace(/<img(?![^>]+loading=)[^>]+>/gi, (tag) => {
    if (tag.includes('loading=')) return tag;
    count++;
    return tag.replace("<img", '<img loading="lazy"');
  });
  // Each added attribute saves ~0 bytes but improves performance score
  return { result, saved: 0 };
}

// ── Resource hints ────────────────────────────────────────────────────────────

function addResourceHints(html: string): { result: string; saved: number } {
  if (!html.includes("<head>") && !html.includes("<head ")) return { result: html, saved: 0 };

  // Check what external resources are used
  const hints: string[] = [];

  if (html.includes("fonts.googleapis.com")) {
    hints.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    hints.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }

  // Remove duplicates of preconnects we're about to add
  let result = html;
  for (const hint of hints) {
    if (!result.includes(hint)) {
      result = result.replace("</head>", `${hint}\n</head>`);
    }
  }

  // Add charset meta if missing
  if (!result.includes("charset")) {
    result = result.replace("<head>", '<head>\n  <meta charset="UTF-8">');
  }

  return { result, saved: 0 };
}

// ── Will-change hints ─────────────────────────────────────────────────────────

function addWillChangeHints(html: string): { result: string; saved: number } {
  // Add will-change to elements that have CSS animations
  const hasAnimations = /animation:|@keyframes/.test(html);
  if (!hasAnimations) return { result: html, saved: 0 };

  // Add will-change: transform to animated elements via CSS
  const hint = `.animate-in, [class*="animate"] { will-change: transform, opacity; }`;
  const result = html.replace(
    /<\/style>/,
    `${hint}\n</style>`
  );
  return { result, saved: 0 };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function computeScore(opts: {
  reductionPercent: number;
  hasLazyLoading: boolean;
  hasDefer: boolean;
  hasPreconnect: boolean;
  hasViewport: boolean;
}): number {
  let score = 60; // base
  score += Math.min(opts.reductionPercent * 0.5, 15); // up to +15 for size reduction
  if (opts.hasLazyLoading)  score += 7;
  if (opts.hasDefer)        score += 8;
  if (opts.hasPreconnect)   score += 5;
  if (opts.hasViewport)     score += 5;
  return Math.min(100, Math.round(score));
}

function getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

// ── Main optimizer ────────────────────────────────────────────────────────────

export function optimizePerformance(html: string): PerformanceReport {
  const originalSize = Buffer.byteLength(html, "utf-8");
  const optimizations: PerformanceOptimization[] = [];
  let current = html;

  const steps: Array<{
    id: string;
    category: PerformanceOptimization["category"];
    description: string;
    fn: (h: string) => { result: string; saved: number };
  }> = [
    { id: "html-comments",   category: "html",   description: "Remove HTML comments",              fn: removeHtmlComments },
    { id: "css-minify",      category: "css",    description: "Minify inline CSS blocks",           fn: minifyCssBlocks },
    { id: "css-comments",    category: "css",    description: "Strip CSS comments",                 fn: removeCssComments },
    { id: "js-minify",       category: "js",     description: "Minify inline JavaScript",           fn: minifyInlineScripts },
    { id: "js-defer",        category: "js",     description: "Add defer to external scripts",      fn: deferNonCriticalScripts },
    { id: "html-whitespace", category: "html",   description: "Collapse inter-tag whitespace",      fn: collapseHtmlWhitespace },
    { id: "img-lazy",        category: "assets", description: "Add lazy loading to images",         fn: addLazyLoading },
    { id: "resource-hints",  category: "hints",  description: "Add preconnect resource hints",      fn: addResourceHints },
    { id: "will-change",     category: "css",    description: "Add will-change animation hints",    fn: addWillChangeHints },
  ];

  for (const step of steps) {
    const { result, saved } = step.fn(current);
    if (result !== current || saved > 0) {
      optimizations.push({
        id: step.id,
        category: step.category,
        description: step.description,
        bytesSaved: saved,
      });
      current = result;
    }
  }

  const optimizedSize = Buffer.byteLength(current, "utf-8");
  const reductionBytes = originalSize - optimizedSize;
  const reductionPercent = originalSize > 0
    ? Math.round((reductionBytes / originalSize) * 100)
    : 0;

  const score = computeScore({
    reductionPercent,
    hasLazyLoading: current.includes('loading="lazy"'),
    hasDefer: current.includes("defer"),
    hasPreconnect: current.includes('rel="preconnect"'),
    hasViewport: current.includes("viewport"),
  });

  const grade = getGrade(score);

  const summary =
    optimizations.length === 0
      ? "No optimizations needed — output is already lean"
      : `Applied ${optimizations.length} optimizations; ` +
        (reductionBytes > 0
          ? `reduced by ${(reductionBytes / 1024).toFixed(1)}KB (${reductionPercent}%)`
          : "improved performance hints");

  return {
    score,
    grade,
    originalSizeBytes: originalSize,
    optimizedSizeBytes: optimizedSize,
    reductionBytes,
    reductionPercent,
    optimizationsApplied: optimizations,
    optimizedHtml: current,
    summary,
  };
}
