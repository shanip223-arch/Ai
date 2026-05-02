/**
 * Confidence Scorer
 * Scores a generated page 0–100 against project design rules.
 * Used by the orchestrator to decide if output meets quality threshold.
 * Scores below threshold trigger auto-regeneration with stricter rules.
 */

import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";
import type { ValidationReport } from "./validationEngine.js";
import type { MultiSourceReport } from "./multiSourceResearch.js";

export interface ConfidenceDimension {
  name: string;
  score: number;     // 0–100
  weight: number;    // importance weight
  rationale: string;
}

export interface ConfidenceResult {
  overall: number;              // 0–100 weighted average
  grade: "A" | "B" | "C" | "D" | "F";
  passesThreshold: boolean;     // true if overall >= threshold
  threshold: number;
  dimensions: ConfidenceDimension[];
  recommendation: "use" | "regenerate" | "fallback";
  regenerationHint: string | null; // what to improve if regenerating
}

const PASS_THRESHOLD = 65; // minimum score to use output without regeneration

export function scoreConfidence(
  html: string,
  conditions: PageConditions,
  _rules: ProjectRules,
  validation: ValidationReport,
  research: MultiSourceReport | null
): ConfidenceResult {
  const dimensions: ConfidenceDimension[] = [];

  // ── 1. Structural Integrity (from validation) ────────────────────────────
  const structureChecks = validation.checks.filter((c) => c.category === "structure");
  const structurePassed = structureChecks.filter((c) => c.status === "pass").length;
  const structureScore = Math.round((structurePassed / Math.max(1, structureChecks.length)) * 100);
  dimensions.push({
    name: "Structural Integrity",
    score: structureScore,
    weight: 25,
    rationale: `${structurePassed}/${structureChecks.length} structural checks passed`,
  });

  // ── 2. Design System Adherence ────────────────────────────────────────────
  const dsChecks = validation.checks.filter(
    (c) => c.category === "design-system" || c.category === "css"
  );
  const dsPassed = dsChecks.filter((c) => c.status === "pass").length;
  const dsWarn = dsChecks.filter((c) => c.status === "warn").length;
  const dsScore = Math.round(((dsPassed + dsWarn * 0.5) / Math.max(1, dsChecks.length)) * 100);
  dimensions.push({
    name: "Design System Adherence",
    score: dsScore,
    weight: 25,
    rationale: `${dsPassed} passing, ${dsWarn} warnings on design system checks`,
  });

  // ── 3. Responsiveness ─────────────────────────────────────────────────────
  const respChecks = validation.checks.filter((c) => c.category === "responsiveness");
  const respPassed = respChecks.filter((c) => c.status === "pass").length;
  const respScore = Math.round((respPassed / Math.max(1, respChecks.length)) * 100);
  dimensions.push({
    name: "Responsiveness",
    score: respScore,
    weight: 20,
    rationale: `${respPassed}/${respChecks.length} responsiveness checks passed`,
  });

  // ── 4. Accessibility ──────────────────────────────────────────────────────
  const a11yChecks = validation.checks.filter((c) => c.category === "accessibility");
  const a11yPassed = a11yChecks.filter((c) => c.status === "pass").length;
  const a11yWarn = a11yChecks.filter((c) => c.status === "warn").length;
  const a11yScore = Math.round(((a11yPassed + a11yWarn * 0.5) / Math.max(1, a11yChecks.length)) * 100);
  dimensions.push({
    name: "Accessibility",
    score: a11yScore,
    weight: 15,
    rationale: `${a11yPassed} passing, ${a11yWarn} warnings on accessibility checks`,
  });

  // ── 5. Research Alignment ─────────────────────────────────────────────────
  let researchScore = 70; // default when research wasn't run
  let researchRationale = "Research mode was not enabled";
  if (research) {
    const appliedCount = research.usedInGeneration.length;
    const totalCritical = research.crossValidatedFindings.filter(
      (f) => f.priority === "critical"
    ).length;
    researchScore = research.confidenceScore;
    researchRationale = research.fallbackUsed
      ? "Thin consensus — fallback rules applied"
      : `${appliedCount}/${totalCritical} critical recommendations applied; research confidence ${research.confidenceScore}%`;
  }
  dimensions.push({
    name: "Research Alignment",
    score: researchScore,
    weight: 10,
    rationale: researchRationale,
  });

  // ── 6. Page-Type Completeness ─────────────────────────────────────────────
  const completenessChecks: { test: boolean; label: string }[] = [];
  if (conditions.pageType === "login" || conditions.pageType === "register") {
    completenessChecks.push(
      { test: /<form\b/i.test(html), label: "has <form>" },
      { test: /<input[^>]*type\s*=\s*["']?(email|text)/i.test(html), label: "has email/text input" },
      { test: /<input[^>]*type\s*=\s*["']?password/i.test(html), label: "has password input" },
      { test: /<button/i.test(html), label: "has submit button" }
    );
  } else if (conditions.pageType === "dashboard") {
    completenessChecks.push(
      { test: /<nav\b|sidebar/i.test(html), label: "has navigation" },
      { test: /<table\b|stat-/i.test(html), label: "has data display" },
      { test: conditions.hasNavbar, label: "navbar condition met" }
    );
  } else if (conditions.pageType === "index") {
    completenessChecks.push(
      { test: /hero\b/i.test(html), label: "has hero section" },
      { test: /<button|btn-primary/i.test(html), label: "has CTA button" },
      { test: conditions.hasNavbar, label: "navbar condition met" }
    );
  } else {
    completenessChecks.push(
      { test: html.length > 2000, label: "sufficient content length" },
      { test: /<style\b/i.test(html), label: "has embedded styles" }
    );
  }

  const completePassed = completenessChecks.filter((c) => c.test).length;
  const completeScore = completenessChecks.length === 0
    ? 80
    : Math.round((completePassed / completenessChecks.length) * 100);

  dimensions.push({
    name: "Page-Type Completeness",
    score: completeScore,
    weight: 5,
    rationale: `${completePassed}/${completenessChecks.length} page-type requirements present (${conditions.pageType})`,
  });

  // ── Weighted overall score ────────────────────────────────────────────────
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const weightedSum = dimensions.reduce((s, d) => s + d.score * d.weight, 0);
  const overall = Math.round(weightedSum / totalWeight);

  const grade: ConfidenceResult["grade"] =
    overall >= 90 ? "A"
    : overall >= 75 ? "B"
    : overall >= 60 ? "C"
    : overall >= 45 ? "D"
    : "F";

  const passesThreshold = overall >= PASS_THRESHOLD;

  // Build regeneration hint from lowest-scoring dimension
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const regenerationHint = passesThreshold
    ? null
    : `Improve ${weakest.name} (scored ${weakest.score}/100): ${weakest.rationale}`;

  const recommendation: ConfidenceResult["recommendation"] =
    overall >= PASS_THRESHOLD + 15 ? "use"
    : overall >= PASS_THRESHOLD ? "use"
    : overall >= 40 ? "regenerate"
    : "fallback";

  return {
    overall,
    grade,
    passesThreshold,
    threshold: PASS_THRESHOLD,
    dimensions,
    recommendation,
    regenerationHint,
  };
}
