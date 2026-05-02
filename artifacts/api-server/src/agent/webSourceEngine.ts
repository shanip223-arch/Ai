/**
 * Web Source Engine — Controlled Internet Research
 *
 * Intelligently fetches real web content only when necessary or requested.
 * Applies strict filtering, cross-validation, and pattern adaptation
 * to ensure all external data is clean, reliable, and project-aligned.
 *
 * Architecture:
 *  1. Trigger detection   — only activates when web research is warranted
 *  2. Targeted search     — curated trusted sources + DuckDuckGo fallback
 *  3. Content extraction  — headings, key sentences, code patterns only
 *  4. Noise filtering     — ads, navs, cookie banners, duplicate text removed
 *  5. Cross-checking      — promote facts confirmed by 2+ independent sources
 *  6. Pattern adaptation  — rewrite as project-aligned rules, never raw copy-paste
 *  7. Result caching      — 30-min TTL to avoid redundant fetches
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../lib/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebSource {
  url: string;
  domain: string;
  title: string;
  headings: string[];
  keyPoints: string[];
  codePatterns: string[];
  relevanceScore: number;   // 0–100: how relevant to the query
  qualityScore: number;     // 0–100: domain trust score
  fetchedAt: string;
}

export interface WebResearchReport {
  query: string;
  triggered: boolean;
  triggerReason: string;
  sourcesSearched: number;
  sourcesUsed: WebSource[];
  crossCheckedFacts: string[];      // confirmed by 2+ sources
  adaptedPatterns: string[];        // project-aligned insights (never raw copy-paste)
  discardedSources: number;         // low-quality or irrelevant sources dropped
  confidence: number;               // 0–100
  cached: boolean;
  searchDurationMs: number;
}

// ─── Trigger detection ─────────────────────────────────────────────────────────

const WEB_TRIGGER_KEYWORDS = [
  // English
  "search", "find online", "look up", "google", "research", "internet",
  "web search", "fetch", "online resources", "latest", "current", "recent",
  "2024", "2025", "trending", "trends", "best practices for", "how to",
  "examples of", "real examples", "reference", "industry standard",
  "compare", "what do sites use", "popular", "modern approach",
  // Hinglish
  "dhundho", "search kar", "internet pe", "web pe", "online dhundh",
  "latest trend", "aajkal", "naya style", "duniya mein",
];

export function shouldUseWebResearch(
  rawCommand: string,
  researchModeEnabled: boolean
): { triggered: boolean; reason: string } {
  if (researchModeEnabled) {
    return { triggered: true, reason: "Research mode enabled by user" };
  }

  const lower = rawCommand.toLowerCase();
  const matchedKeyword = WEB_TRIGGER_KEYWORDS.find((kw) => lower.includes(kw));

  if (matchedKeyword) {
    return { triggered: true, reason: `Command contains web trigger: "${matchedKeyword}"` };
  }

  return { triggered: false, reason: "No web trigger detected — using internal knowledge" };
}

// ─── Trusted domain registry ───────────────────────────────────────────────────

const TRUSTED_DOMAINS: Record<string, number> = {
  "developer.mozilla.org": 97,
  "web.dev": 93,
  "www.w3.org": 92,
  "www.nngroup.com": 90,
  "www.smashingmagazine.com": 88,
  "css-tricks.com": 87,
  "developers.google.com": 86,
  "uxdesign.cc": 83,
  "tympanus.net": 80,
  "ui.dev": 80,
  "www.a11yproject.com": 85,
  "webaim.org": 87,
  "htmlreference.io": 82,
  "cssreference.io": 82,
  "www.joshwcomeau.com": 85,
  "ishadeed.com": 84,
  "piccalil.li": 83,
  "moderncss.dev": 84,
  "every-layout.dev": 83,
  "www.patterns.dev": 86,
};

function getDomainQuality(url: string): number {
  try {
    const { hostname } = new URL(url);
    return TRUSTED_DOMAINS[hostname] ?? 0;
  } catch {
    return 0;
  }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

// ─── Curated seed URLs per page type and topic ────────────────────────────────

const SEED_URLS: Record<string, string[]> = {
  login: [
    "https://web.dev/articles/sign-in-form-best-practices",
    "https://www.nngroup.com/articles/login-walls/",
    "https://css-tricks.com/password-strength-meter/",
    "https://www.a11yproject.com/posts/how-to-accessible-form/",
  ],
  dashboard: [
    "https://www.smashingmagazine.com/2022/02/designing-better-dashboard/",
    "https://uxdesign.cc/designing-the-best-dashboard-experience-8b86b4b33e8c",
    "https://web.dev/articles/cls",
  ],
  index: [
    "https://web.dev/articles/lcp",
    "https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/",
    "https://css-tricks.com/css-grid-holy-grail-layout/",
  ],
  register: [
    "https://web.dev/articles/sign-in-form-best-practices",
    "https://www.nngroup.com/articles/web-form-design/",
    "https://www.a11yproject.com/posts/how-to-accessible-form/",
  ],
  form: [
    "https://www.nngroup.com/articles/web-form-design/",
    "https://css-tricks.com/form-validation-ux-html-css/",
    "https://web.dev/articles/payment-and-address-form-best-practices",
  ],
  admin: [
    "https://www.smashingmagazine.com/2022/02/designing-better-dashboard/",
    "https://www.nngroup.com/articles/navigation-ia-tests/",
  ],
  _global: [
    "https://web.dev/articles/responsive-web-design-basics",
    "https://css-tricks.com/accessible-svgs/",
    "https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design",
    "https://moderncss.dev/top-css-grid-layout-patterns-with-full-page-demos/",
  ],
};

// ─── HTTP fetch with timeout + retry ─────────────────────────────────────────

const FETCH_TIMEOUT_MS = 7000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AGENT_OS-Research/1.0; +https://github.com/agent-os) AppleWebKit/537.36";

async function fetchUrl(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      maxRedirects: 3,
      validateStatus: (s) => s === 200,
    });
    return typeof response.data === "string" ? response.data : null;
  } catch {
    return null;
  }
}

// ─── Noise patterns to remove ─────────────────────────────────────────────────

const NOISE_SELECTORS = [
  "script", "style", "noscript", "iframe", "video", "audio", "canvas",
  "nav", "footer", "header", "aside", "form",
  ".ad", ".advertisement", ".banner", ".cookie", ".popup", ".modal",
  ".newsletter", ".subscribe", ".sidebar", ".menu", ".navigation",
  ".social-share", ".comment", ".comments", "[aria-hidden='true']",
  ".breadcrumb", ".pagination", ".related", ".recommendation",
];

const NOISE_TEXT_PATTERNS = [
  /subscribe|newsletter|sign.?up|cookie|gdpr|privacy.?policy|terms.?of.?service/i,
  /follow us|share this|click here|read more|load more/i,
  /advertisement|sponsored|affiliate/i,
  /^\s*$/, // empty strings
];

function isNoisyText(text: string): boolean {
  return NOISE_TEXT_PATTERNS.some((p) => p.test(text));
}

// ─── Content extraction with Cheerio ─────────────────────────────────────────

function extractContent(html: string, url: string): Omit<WebSource, "url" | "domain" | "relevanceScore" | "qualityScore" | "fetchedAt"> | null {
  try {
    const $ = cheerio.load(html);

    // Remove all noise elements
    $(NOISE_SELECTORS.join(", ")).remove();

    // Title
    const title = $("title").text().trim() ||
      $("h1").first().text().trim() ||
      extractDomain(url);

    // Headings (h1–h3) — these signal the article structure
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 200 && !isNoisyText(text)) {
        headings.push(text);
      }
    });

    // Key sentences — paragraphs with real content (50–400 chars)
    const keyPoints: string[] = [];
    $("p, li").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length >= 60 && text.length <= 450 && !isNoisyText(text)) {
        keyPoints.push(text);
      }
    });

    // Code patterns — pre/code blocks that show patterns, not implementations
    const codePatterns: string[] = [];
    $("pre code, code, pre").each((_, el) => {
      const text = $(el).text().trim();
      // Only keep short, readable code snippets (patterns, not full implementations)
      if (text.length > 15 && text.length < 600 && !isNoisyText(text)) {
        codePatterns.push(text);
      }
    });

    // Deduplicate
    const unique = <T>(arr: T[]) => [...new Set(arr)];

    return {
      title: title.slice(0, 120),
      headings: unique(headings).slice(0, 8),
      keyPoints: unique(keyPoints).slice(0, 10),
      codePatterns: unique(codePatterns).slice(0, 4),
    };
  } catch (err) {
    logger.warn({ url, err }, "Content extraction failed");
    return null;
  }
}

// ─── Relevance scoring ────────────────────────────────────────────────────────

function scoreRelevance(source: Omit<WebSource, "relevanceScore" | "qualityScore">, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const allText = [
    source.title,
    ...source.headings,
    ...source.keyPoints,
  ].join(" ").toLowerCase();

  const matchCount = queryWords.filter((w) => allText.includes(w)).length;
  const matchRatio = queryWords.length > 0 ? matchCount / queryWords.length : 0;

  // Content richness bonus
  const richnessBonus = Math.min(20, source.keyPoints.length * 2 + source.headings.length);

  return Math.min(100, Math.round(matchRatio * 70 + richnessBonus + 10));
}

// ─── Cross-validation ─────────────────────────────────────────────────────────

function crossCheckSources(sources: WebSource[]): string[] {
  if (sources.length < 2) return [];

  // Collect all headings from all sources
  const headingMap = new Map<string, Set<number>>();

  sources.forEach((src, idx) => {
    src.headings.forEach((h) => {
      const words = h.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      words.forEach((word) => {
        const existing = headingMap.get(word) ?? new Set();
        existing.add(idx);
        headingMap.set(word, existing);
      });
    });
  });

  // Find concepts mentioned across multiple sources
  const crossCheckedConcepts: string[] = [];
  const seenHeadings = new Set<string>();

  sources.forEach((src) => {
    src.headings.forEach((heading) => {
      if (seenHeadings.has(heading)) return;
      const words = heading.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const sourcesWithConcept = new Set<number>();
      words.forEach((word) => {
        const srcs = headingMap.get(word) ?? new Set();
        srcs.forEach((s) => sourcesWithConcept.add(s));
      });
      if (sourcesWithConcept.size >= 2) {
        crossCheckedConcepts.push(heading);
        seenHeadings.add(heading);
      }
    });
  });

  // Also check key points for repeated patterns
  const pointWords = new Map<string, number>();
  sources.forEach((src) => {
    src.keyPoints.forEach((pt) => {
      const sig = pt.toLowerCase().slice(0, 50);
      pointWords.set(sig, (pointWords.get(sig) ?? 0) + 1);
    });
  });
  const repeatedPoints = [...pointWords.entries()]
    .filter(([, count]) => count >= 2)
    .map(([sig]) => sig)
    .slice(0, 5);

  return [...crossCheckedConcepts, ...repeatedPoints].slice(0, 10);
}

// ─── Pattern adaptation (never raw copy-paste) ────────────────────────────────

function adaptPatterns(sources: WebSource[], pageType: string, colorScheme: string): string[] {
  const adapted: string[] = [];
  const seen = new Set<string>();

  const addInsight = (text: string) => {
    const key = text.toLowerCase().slice(0, 40);
    if (!seen.has(key) && text.length > 20) {
      seen.add(key);
      adapted.push(text);
    }
  };

  // Synthesize patterns from headings (structural insights)
  sources.forEach((src) => {
    src.headings.slice(0, 4).forEach((h) => {
      // Convert headings to actionable project rules
      if (/responsive|mobile|breakpoint/i.test(h)) {
        addInsight(`Apply mobile-first responsive layout (per ${src.domain})`);
      }
      if (/contrast|color|accessibility|a11y/i.test(h)) {
        addInsight(`Ensure WCAG AA contrast ratios on all interactive elements (per ${src.domain})`);
      }
      if (/form|input|validation|error/i.test(h)) {
        addInsight(`Use inline validation with clear error states near each field (per ${src.domain})`);
      }
      if (/performance|speed|load|cls|lcp/i.test(h)) {
        addInsight(`Minimize render-blocking resources; use font-display:swap (per ${src.domain})`);
      }
      if (/navigation|sidebar|menu/i.test(h)) {
        addInsight(`Provide semantic nav landmark with keyboard accessibility (per ${src.domain})`);
      }
      if (/spacing|layout|grid|flex/i.test(h)) {
        addInsight(`Use 8px grid system for consistent spacing (per ${src.domain})`);
      }
    });
  });

  // Synthesize from key points (behavioral insights)
  const allPoints = sources.flatMap((s) => s.keyPoints);
  if (colorScheme === "dark" && allPoints.some((p) => /dark|contrast|background/i.test(p))) {
    addInsight("Dark backgrounds: use #0f172a base, not pure black; maintain 4.5:1 text contrast");
  }
  if (allPoints.some((p) => /focus|keyboard|tab/i.test(p))) {
    addInsight("All interactive elements must have visible :focus-visible styles");
  }
  if (allPoints.some((p) => /animation|transition/i.test(p))) {
    addInsight("Transitions max 200ms; use transform/opacity only to avoid layout thrash");
  }
  if (pageType === "login" || pageType === "register") {
    if (allPoints.some((p) => /password|show.?hide/i.test(p))) {
      addInsight("Include show/hide password toggle with aria-label for screen readers");
    }
  }
  if (pageType === "dashboard" && allPoints.some((p) => /kpi|metric|card/i.test(p))) {
    addInsight("KPI cards: large numeric values (2rem+), paired icon, trend indicator");
  }

  // Code patterns: convert to architectural notes, not raw snippets
  sources.forEach((src) => {
    src.codePatterns.slice(0, 2).forEach((code) => {
      if (/display:\s*grid|grid-template/i.test(code)) {
        addInsight(`Use CSS Grid for main layout structure (pattern found at ${src.domain})`);
      }
      if (/var\(--/i.test(code)) {
        addInsight(`Apply CSS custom properties for all design tokens (per ${src.domain})`);
      }
      if (/aria-|role=/i.test(code)) {
        addInsight(`Add ARIA attributes for interactive components (per ${src.domain})`);
      }
    });
  });

  return adapted.slice(0, 12);
}

// ─── In-memory cache (30-min TTL) ─────────────────────────────────────────────

interface CacheEntry { report: WebResearchReport; expiresAt: number; }
const researchCache = new Map<string, CacheEntry>();

function getCacheKey(query: string, pageType: string): string {
  return `${pageType}::${query.toLowerCase().slice(0, 60)}`;
}

function getFromCache(key: string): WebResearchReport | null {
  const entry = researchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    researchCache.delete(key);
    return null;
  }
  return { ...entry.report, cached: true };
}

function setCache(key: string, report: WebResearchReport): void {
  researchCache.set(key, {
    report,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
  });
  // Cap cache size at 50 entries
  if (researchCache.size > 50) {
    const firstKey = researchCache.keys().next().value;
    if (firstKey) researchCache.delete(firstKey);
  }
}

// ─── DuckDuckGo search for supplemental URLs ─────────────────────────────────

async function searchDuckDuckGo(query: string, pageType: string): Promise<string[]> {
  const searchQuery = encodeURIComponent(`${pageType} page ${query} web design best practices site:smashingmagazine.com OR site:css-tricks.com OR site:web.dev OR site:nngroup.com`);
  const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

  try {
    const html = await fetchUrl(url);
    if (!html) return [];

    const $ = cheerio.load(html);
    const urls: string[] = [];

    $("a.result__url").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http")) {
        const quality = getDomainQuality(href);
        if (quality >= 78) urls.push(href);
      }
    });

    // Also extract from result snippets
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (href.startsWith("http") && getDomainQuality(href) >= 78) {
        urls.push(href);
      }
    });

    return [...new Set(urls)].slice(0, 3);
  } catch {
    return [];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface WebResearchOptions {
  rawCommand: string;
  pageType: string;
  colorScheme?: string;
  researchModeEnabled: boolean;
  maxSources?: number;
}

export async function performWebResearch(options: WebResearchOptions): Promise<WebResearchReport> {
  const {
    rawCommand,
    pageType,
    colorScheme = "light",
    researchModeEnabled,
    maxSources = 4,
  } = options;

  const startTime = Date.now();

  // ── 1. Check trigger ───────────────────────────────────────────────────────
  const { triggered, reason } = shouldUseWebResearch(rawCommand, researchModeEnabled);

  if (!triggered) {
    return {
      query: rawCommand,
      triggered: false,
      triggerReason: reason,
      sourcesSearched: 0,
      sourcesUsed: [],
      crossCheckedFacts: [],
      adaptedPatterns: [],
      discardedSources: 0,
      confidence: 0,
      cached: false,
      searchDurationMs: Date.now() - startTime,
    };
  }

  // ── 2. Check cache ─────────────────────────────────────────────────────────
  const cacheKey = getCacheKey(rawCommand, pageType);
  const cached = getFromCache(cacheKey);
  if (cached) {
    logger.info({ cacheKey }, "Web research: returning cached result");
    return cached;
  }

  logger.info({ pageType, reason }, "Web research: fetching live sources");

  // ── 3. Build candidate URL list ────────────────────────────────────────────
  const seedUrls = [
    ...(SEED_URLS[pageType] ?? []),
    ...SEED_URLS["_global"],
  ];

  // Try DuckDuckGo for additional URLs (non-blocking — don't wait too long)
  const ddgUrls = await Promise.race([
    searchDuckDuckGo(rawCommand, pageType),
    new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 4000)),
  ]);

  // Merge: prioritize curated seeds, add DDG results, deduplicate
  const allCandidates = [...new Set([...seedUrls, ...ddgUrls])];

  // Sort by domain quality (best first), limit candidates
  const rankedCandidates = allCandidates
    .map((url) => ({ url, quality: getDomainQuality(url) }))
    .filter((c) => c.quality >= 78)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, maxSources + 3)  // fetch a few extra to account for failures
    .map((c) => c.url);

  // ── 4. Fetch + extract in parallel (with concurrency limit) ───────────────
  const fetchPromises = rankedCandidates.map(async (url) => {
    const html = await fetchUrl(url);
    if (!html) return null;
    return { url, html };
  });

  const fetchResults = await Promise.all(fetchPromises);

  // ── 5. Extract content, score, filter ─────────────────────────────────────
  const validSources: WebSource[] = [];
  let discardedSources = 0;

  for (const result of fetchResults) {
    if (!result) { discardedSources++; continue; }

    const { url, html } = result;
    const extracted = extractContent(html, url);
    if (!extracted || (extracted.headings.length === 0 && extracted.keyPoints.length === 0)) {
      discardedSources++;
      continue;
    }

    const qualityScore = getDomainQuality(url);
    const partial = { ...extracted, url, domain: extractDomain(url), fetchedAt: new Date().toISOString() };
    const relevanceScore = scoreRelevance(partial, rawCommand);

    // Discard low-quality or irrelevant sources
    if (relevanceScore < 20 || qualityScore < 78) {
      discardedSources++;
      continue;
    }

    validSources.push({ ...partial, relevanceScore, qualityScore });
  }

  // Sort by combined score, keep top N
  const topSources = validSources
    .sort((a, b) => (b.relevanceScore * 0.6 + b.qualityScore * 0.4) - (a.relevanceScore * 0.6 + a.qualityScore * 0.4))
    .slice(0, maxSources);

  // ── 6. Cross-check + adapt ─────────────────────────────────────────────────
  const crossCheckedFacts = crossCheckSources(topSources);
  const adaptedPatterns = adaptPatterns(topSources, pageType, colorScheme);

  // ── 7. Confidence score ────────────────────────────────────────────────────
  const avgRelevance = topSources.length > 0
    ? topSources.reduce((s, src) => s + src.relevanceScore, 0) / topSources.length
    : 0;
  const confidence = Math.min(100, Math.round(
    avgRelevance * 0.5 +
    Math.min(topSources.length, 4) * 10 +
    crossCheckedFacts.length * 3
  ));

  const report: WebResearchReport = {
    query: rawCommand,
    triggered: true,
    triggerReason: reason,
    sourcesSearched: rankedCandidates.length,
    sourcesUsed: topSources,
    crossCheckedFacts,
    adaptedPatterns,
    discardedSources,
    confidence,
    cached: false,
    searchDurationMs: Date.now() - startTime,
  };

  // ── 8. Cache result ────────────────────────────────────────────────────────
  setCache(cacheKey, report);

  logger.info({
    pageType,
    sourcesFound: topSources.length,
    discarded: discardedSources,
    crossCheckedFacts: crossCheckedFacts.length,
    adaptedPatterns: adaptedPatterns.length,
    confidence,
    durationMs: report.searchDurationMs,
  }, "Web research complete");

  return report;
}
