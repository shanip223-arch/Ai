/**
 * Security Scanner
 * Detects and neutralizes unsafe patterns in generated HTML/CSS/JS.
 * Never silently passes dangerous output — always reports + sanitizes.
 */

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export interface SecurityIssue {
  id: string;
  severity: SecuritySeverity;
  type: string;
  description: string;
  pattern: string;
  suggestion: string;
  autoFixed: boolean;
}

export interface SecurityReport {
  safe: boolean;              // true only when no critical/high issues remain
  score: number;              // 0–100 (100 = no issues)
  issues: SecurityIssue[];
  blockedCount: number;
  sanitizedHtml: string;      // auto-fixed version safe to serve
  summary: string;
}

// ── Pattern definitions ───────────────────────────────────────────────────────

interface ScanPattern {
  id: string;
  severity: SecuritySeverity;
  type: string;
  regex: RegExp;
  description: string;
  suggestion: string;
  autoFix?: (html: string) => string;
}

const PATTERNS: ScanPattern[] = [
  // ── Critical ──
  {
    id: "eval-usage",
    severity: "critical",
    type: "code-injection",
    regex: /\beval\s*\(/g,
    description: "eval() executes arbitrary strings as code — primary XSS vector",
    suggestion: "Replace eval() with JSON.parse() for data or use a whitelist approach",
    autoFix: (html) => html.replace(/\beval\s*\(/g, "/* eval removed */ (function(){"),
  },
  {
    id: "function-constructor",
    severity: "critical",
    type: "code-injection",
    regex: /new\s+Function\s*\(/g,
    description: "new Function() is equivalent to eval() and allows arbitrary code execution",
    suggestion: "Remove new Function() usage — pass functions directly or use callbacks",
    autoFix: (html) => html.replace(/new\s+Function\s*\(/g, "/* Function() removed */ (function(){").toString(),
  },
  {
    id: "document-write",
    severity: "critical",
    type: "dom-injection",
    regex: /document\.write\s*\(/g,
    description: "document.write() can overwrite the entire page and introduce XSS",
    suggestion: "Use document.getElementById().textContent = ... instead",
    autoFix: (html) => html.replace(/document\.write\s*\(/g, "console.warn('document.write removed') || (function(){"),
  },
  {
    id: "javascript-href",
    severity: "critical",
    type: "xss",
    regex: /href\s*=\s*["']javascript:/gi,
    description: "javascript: URIs in href execute script when clicked",
    suggestion: "Use onclick handlers or regular URLs instead of javascript: URIs",
    autoFix: (html) => html.replace(/href\s*=\s*["']javascript:[^"']*/gi, 'href="#"'),
  },
  // ── High ──
  {
    id: "innerHTML-variable",
    severity: "high",
    type: "xss",
    regex: /\.innerHTML\s*=\s*(?!["'`])/g,
    description: "innerHTML assignment with a variable can execute injected HTML/scripts",
    suggestion: "Use textContent for text, or sanitize with DOMPurify before setting innerHTML",
  },
  {
    id: "external-script-unknown",
    severity: "high",
    type: "supply-chain",
    regex: /<script[^>]+src\s*=\s*["'](?!https?:\/\/(cdn\.|unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|code\.jquery\.com))/gi,
    description: "External script from an untrusted domain — supply-chain risk",
    suggestion: "Only load scripts from trusted CDNs or self-host dependencies",
    autoFix: (html) =>
      html.replace(
        /<script[^>]+src\s*=\s*["'](?!https?:\/\/(cdn\.|unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|code\.jquery\.com))[^"']*["'][^>]*><\/script>/gi,
        "<!-- external script removed by security scanner -->"
      ),
  },
  {
    id: "base64-script",
    severity: "high",
    type: "obfuscation",
    regex: /atob\s*\(|btoa\s*\(.*eval|data:text\/javascript;base64/gi,
    description: "Base64-encoded script execution — common obfuscation technique for malware",
    suggestion: "Do not use base64 to encode executable JavaScript",
  },
  // ── Medium ──
  {
    id: "settimeout-string",
    severity: "medium",
    type: "code-injection",
    regex: /setTimeout\s*\(\s*["'`]/g,
    description: "setTimeout() with a string argument behaves like eval()",
    suggestion: "Pass a function reference: setTimeout(() => { ... }, delay)",
    autoFix: (html) =>
      html.replace(/setTimeout\s*\(\s*["'`]([^"'`]*)["'`]/g, "setTimeout(function(){ /* $1 */ }"),
  },
  {
    id: "setinterval-string",
    severity: "medium",
    type: "code-injection",
    regex: /setInterval\s*\(\s*["'`]/g,
    description: "setInterval() with a string argument behaves like eval()",
    suggestion: "Pass a function reference: setInterval(() => { ... }, delay)",
    autoFix: (html) =>
      html.replace(/setInterval\s*\(\s*["'`]([^"'`]*)["'`]/g, "setInterval(function(){ /* $1 */ }"),
  },
  {
    id: "css-expression",
    severity: "medium",
    type: "css-injection",
    regex: /expression\s*\(/gi,
    description: "CSS expression() is an IE-era attack vector for code execution",
    suggestion: "Remove all CSS expression() usage — it is non-standard and dangerous",
    autoFix: (html) => html.replace(/expression\s*\([^)]*\)/gi, "inherit"),
  },
  {
    id: "hardcoded-secret",
    severity: "medium",
    type: "secret-exposure",
    regex: /(?:password|secret|api[_-]?key|auth[_-]?token)\s*[:=]\s*["'][^"']{6,}["']/gi,
    description: "Potential hardcoded credential or secret in source code",
    suggestion: "Move secrets to environment variables — never hardcode credentials",
    autoFix: (html) =>
      html.replace(
        /((?:password|secret|api[_-]?key|auth[_-]?token)\s*[:=]\s*["'])[^"']+(["'])/gi,
        "$1[REDACTED]$2"
      ),
  },
  // ── Low ──
  {
    id: "console-log-production",
    severity: "low",
    type: "information-disclosure",
    regex: /console\.(log|debug|info)\s*\(/g,
    description: "console.log() in production may expose sensitive internal data",
    suggestion: "Remove debug logs or guard with: if (location.hostname === 'localhost') console.log()",
  },
  {
    id: "open-redirect",
    severity: "low",
    type: "redirect",
    regex: /window\.location\s*=\s*(?:location\.search|new URLSearchParams|req\.query)/g,
    description: "Potential open redirect — location set from user-controlled input",
    suggestion: "Always validate and whitelist redirect targets",
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

const SEVERITY_DEDUCTIONS: Record<SecuritySeverity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 3,
  info: 0,
};

function computeScore(issues: SecurityIssue[]): number {
  const deduction = issues.reduce((sum, issue) => {
    if (!issue.autoFixed) sum += SEVERITY_DEDUCTIONS[issue.severity];
    return sum;
  }, 0);
  return Math.max(0, 100 - deduction);
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export function scanSecurity(html: string): SecurityReport {
  const issues: SecurityIssue[] = [];
  let sanitized = html;
  let blockedCount = 0;

  for (const pattern of PATTERNS) {
    if (!pattern.regex.test(html)) {
      pattern.regex.lastIndex = 0;
      continue;
    }
    pattern.regex.lastIndex = 0;

    let autoFixed = false;
    if (pattern.autoFix) {
      const before = sanitized;
      sanitized = pattern.autoFix(sanitized);
      if (sanitized !== before) {
        autoFixed = true;
        blockedCount++;
      }
    }

    issues.push({
      id: pattern.id,
      severity: pattern.severity,
      type: pattern.type,
      description: pattern.description,
      pattern: pattern.regex.source,
      suggestion: pattern.suggestion,
      autoFixed,
    });
  }

  const score = computeScore(issues);
  const criticalRemaining = issues.filter(
    (i) => (i.severity === "critical" || i.severity === "high") && !i.autoFixed
  );
  const safe = criticalRemaining.length === 0;

  const severityCounts = issues.reduce(
    (acc, i) => { acc[i.severity] = (acc[i.severity] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const parts: string[] = [];
  if (severityCounts.critical) parts.push(`${severityCounts.critical} critical`);
  if (severityCounts.high)     parts.push(`${severityCounts.high} high`);
  if (severityCounts.medium)   parts.push(`${severityCounts.medium} medium`);
  if (severityCounts.low)      parts.push(`${severityCounts.low} low`);

  const summary =
    issues.length === 0
      ? "No security issues detected — output is clean"
      : `${issues.length} issue${issues.length > 1 ? "s" : ""} found (${parts.join(", ")}); ${blockedCount} auto-fixed`;

  return { safe, score, issues, blockedCount, sanitizedHtml: sanitized, summary };
}

export function isSafeToServe(report: SecurityReport): boolean {
  return report.safe;
}

export function getSecurityGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}
