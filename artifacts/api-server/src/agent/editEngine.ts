/**
 * Edit Engine
 * Detects edit/update intent from user commands and applies targeted patches
 * to existing generated HTML instead of triggering a full regeneration.
 */

export type EditType =
  | "color"
  | "text"
  | "layout"
  | "style"
  | "add-section"
  | "remove-section"
  | "font"
  | "spacing"
  | "none";

export interface EditRequest {
  isEdit: boolean;
  editType: EditType;
  targetDescription: string;   // human-readable description of what to change
  confidence: number;          // 0–1
  rawCommand: string;
}

export interface EditResult {
  applied: boolean;
  editedHtml: string;
  changesApplied: string[];
  changeCount: number;
  isPartialEdit: boolean;
  summary: string;
}

// ── Intent detection ──────────────────────────────────────────────────────────

const EDIT_SIGNALS: Array<{ pattern: RegExp; type: EditType; weight: number }> = [
  // Color changes
  { pattern: /\b(?:change|make|set|update)\s+(?:the\s+)?(?:color|colour|background|bg|text)\b/i,  type: "color",          weight: 0.9 },
  { pattern: /\b(?:darker|lighter|more\s+(?:dark|light|colorful)|less\s+colorful)\b/i,             type: "color",          weight: 0.8 },
  { pattern: /\b(?:blue|red|green|purple|orange|pink|indigo|teal|yellow|black|white)\s+(?:theme|color|button|background)\b/i, type: "color", weight: 0.85 },
  { pattern: /\b(?:color|colour)\s+(?:ko|badlo|change\s+karo)\b/i,                                 type: "color",          weight: 0.9 },
  // Text/content changes
  { pattern: /\b(?:change|update|fix|correct|replace)\s+(?:the\s+)?(?:text|title|heading|label|placeholder|content)\b/i, type: "text", weight: 0.9 },
  { pattern: /\b(?:rename|relabel|rewrite)\b/i,                                                     type: "text",           weight: 0.7 },
  // Font changes
  { pattern: /\b(?:change|use|switch\s+to)\s+(?:the\s+)?font\b/i,                                  type: "font",           weight: 0.9 },
  { pattern: /\b(?:bigger|smaller|larger)\s+(?:font|text|heading)\b/i,                              type: "font",           weight: 0.8 },
  // Layout changes
  { pattern: /\b(?:move|shift|center|align|reposition)\s+(?:the\s+)?\w+/i,                         type: "layout",         weight: 0.7 },
  { pattern: /\b(?:two|three|four|2|3|4)\s+columns?\b/i,                                            type: "layout",         weight: 0.8 },
  { pattern: /\b(?:sidebar|navbar|header|footer)\s+(?:ko\s+)?(?:hata|remove|add|change)\b/i,       type: "layout",         weight: 0.85 },
  // Spacing
  { pattern: /\b(?:more|less|add|remove|increase|decrease)\s+(?:spacing|padding|margin|gap)\b/i,   type: "spacing",        weight: 0.85 },
  // Style
  { pattern: /\b(?:make\s+it|yeh|isko)\s+(?:more\s+)?(?:modern|minimal|clean|simple|fancy|premium)\b/i, type: "style",   weight: 0.75 },
  { pattern: /\b(?:add|remove)\s+(?:shadow|border|animation|hover|gradient)\b/i,                   type: "style",          weight: 0.8 },
  // Add/remove sections
  { pattern: /\b(?:add|include|jodo)\s+(?:a\s+)?(?:section|block|hero|footer|header|nav|testimonial|pricing|faq)\b/i, type: "add-section", weight: 0.85 },
  { pattern: /\b(?:remove|delete|hata|hatao)\s+(?:the\s+)?(?:section|block|hero|footer|header|nav)\b/i,               type: "remove-section", weight: 0.85 },
];

const NON_EDIT_SIGNALS = [
  /\b(?:create|make|build|generate|bana|banao)\s+(?:a|an|new|ek)\s+(?:page|project|site|website|form|dashboard|login)\b/i,
  /\b(?:fresh|completely|from\s+scratch|naya|dobara\s+bana)\b/i,
  /^(?:reset|start\s+over|shuru\s+se)\b/i,
];

export function detectEditIntent(command: string, hasExistingOutput: boolean): EditRequest {
  if (!hasExistingOutput) {
    return { isEdit: false, editType: "none", targetDescription: "", confidence: 0, rawCommand: command };
  }

  // Check for explicit non-edit signals
  for (const nonEdit of NON_EDIT_SIGNALS) {
    if (nonEdit.test(command)) {
      return { isEdit: false, editType: "none", targetDescription: "", confidence: 0, rawCommand: command };
    }
  }

  // Score edit signals
  let bestType: EditType = "none";
  let bestWeight = 0;
  let matchedDescriptions: string[] = [];

  for (const signal of EDIT_SIGNALS) {
    const match = command.match(signal.pattern);
    if (match) {
      matchedDescriptions.push(match[0]);
      if (signal.weight > bestWeight) {
        bestWeight = signal.weight;
        bestType   = signal.type;
      }
    }
  }

  const isEdit = bestWeight >= 0.7;

  return {
    isEdit,
    editType: isEdit ? bestType : "none",
    targetDescription: matchedDescriptions.join("; "),
    confidence: bestWeight,
    rawCommand: command,
  };
}

// ── CSS value extractors ──────────────────────────────────────────────────────

const COLOR_NAMES: Record<string, string> = {
  blue: "#3b82f6", red: "#ef4444", green: "#22c55e", purple: "#8b5cf6",
  orange: "#f97316", pink: "#ec4899", indigo: "#6366f1", teal: "#14b8a6",
  yellow: "#eab308", black: "#000000", white: "#ffffff", gray: "#6b7280",
  cyan: "#06b6d4", violet: "#7c3aed", emerald: "#10b981", rose: "#f43f5e",
};

function extractColor(command: string): string | null {
  const lower = command.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (lower.includes(name)) return hex;
  }
  const hexMatch = command.match(/#[0-9a-fA-F]{3,6}/);
  return hexMatch?.[0] ?? null;
}

function extractFontSize(command: string): string | null {
  if (/\b(?:bigger|larger|increase)\b/i.test(command)) return "scale-up";
  if (/\b(?:smaller|decrease)\b/i.test(command))        return "scale-down";
  const px = command.match(/(\d+)\s*px/i);
  if (px) return `${px[1]}px`;
  const rem = command.match(/(\d+(?:\.\d+)?)\s*rem/i);
  if (rem) return `${rem[1]}rem`;
  return null;
}

// ── Patch applicators ─────────────────────────────────────────────────────────

function applyColorPatch(html: string, command: string): { result: string; changes: string[] } {
  const newColor = extractColor(command);
  const changes: string[] = [];
  let result = html;

  if (!newColor) return { result, changes };

  // Determine what to change based on command keywords
  const lower = command.toLowerCase();

  if (lower.includes("primary") || lower.includes("button") || lower.includes("accent")) {
    result = result.replace(/--color-primary:\s*[^;]+;/, `--color-primary: ${newColor};`);
    changes.push(`Primary color → ${newColor}`);
  }
  if (lower.includes("background") || lower.includes("bg") || lower.includes("background")) {
    result = result.replace(/--color-bg:\s*[^;]+;/, `--color-bg: ${newColor};`);
    changes.push(`Background color → ${newColor}`);
  }
  if (lower.includes("text") && !lower.includes("button")) {
    result = result.replace(/--color-text:\s*[^;]+;/, `--color-text: ${newColor};`);
    changes.push(`Text color → ${newColor}`);
  }

  // Generic: change the most prominent color token
  if (changes.length === 0) {
    result = result.replace(/--color-primary:\s*[^;]+;/, `--color-primary: ${newColor};`);
    changes.push(`Primary color → ${newColor}`);
  }

  return { result, changes };
}

function applyFontPatch(html: string, command: string): { result: string; changes: string[] } {
  const changes: string[] = [];
  let result = html;

  const fontSize = extractFontSize(command);
  if (fontSize === "scale-up") {
    result = result.replace(/font-size:\s*16px/, "font-size: 18px");
    result = result.replace(/html\s*\{[^}]*font-size:\s*16px/, (m) => m.replace("16px", "18px"));
    changes.push("Base font size increased to 18px");
  } else if (fontSize === "scale-down") {
    result = result.replace(/font-size:\s*16px/, "font-size: 14px");
    changes.push("Base font size decreased to 14px");
  }

  // Font family changes
  const lower = command.toLowerCase();
  if (lower.includes("mono") || lower.includes("code")) {
    result = result.replace(/--font-body:\s*[^;]+;/, "--font-body: 'JetBrains Mono', monospace;");
    changes.push("Font changed to monospace");
  } else if (lower.includes("serif")) {
    result = result.replace(/--font-body:\s*[^;]+;/, "--font-body: 'Georgia', serif;");
    changes.push("Font changed to serif");
  } else if (lower.includes("sans") || lower.includes("clean")) {
    result = result.replace(/--font-body:\s*[^;]+;/, "--font-body: 'Inter', system-ui, sans-serif;");
    changes.push("Font reset to Inter sans-serif");
  }

  return { result, changes };
}

function applySpacingPatch(html: string, command: string): { result: string; changes: string[] } {
  const changes: string[] = [];
  let result = html;

  const lower = command.toLowerCase();
  if (lower.includes("more") || lower.includes("increase") || lower.includes("zyada")) {
    // Scale up spacing tokens
    result = result.replace(/--spacing-5:\s*24px/, "--spacing-5: 32px");
    result = result.replace(/--spacing-6:\s*32px/, "--spacing-6: 40px");
    result = result.replace(/--spacing-7:\s*48px/, "--spacing-7: 64px");
    changes.push("Spacing increased — more breathing room");
  } else if (lower.includes("less") || lower.includes("decrease") || lower.includes("kam")) {
    result = result.replace(/--spacing-5:\s*24px/, "--spacing-5: 16px");
    result = result.replace(/--spacing-6:\s*32px/, "--spacing-6: 24px");
    result = result.replace(/--spacing-7:\s*48px/, "--spacing-7: 36px");
    changes.push("Spacing reduced — more compact layout");
  }

  return { result, changes };
}

function applyStylePatch(html: string, command: string): { result: string; changes: string[] } {
  const changes: string[] = [];
  let result = html;
  const lower = command.toLowerCase();

  if (lower.includes("shadow") && lower.includes("add")) {
    result = result.replace(/.card\s*\{([^}]*)\}/, (m, body) => {
      if (body.includes("box-shadow")) return m;
      return m.replace(body, body + " box-shadow: 0 10px 30px rgba(0,0,0,0.15);");
    });
    changes.push("Added card shadows");
  }

  if (lower.includes("border") && lower.includes("remove")) {
    result = result.replace(/border:\s*1px solid[^;]+;/g, "border: none;");
    changes.push("Removed borders");
  }

  if (lower.includes("rounded") || lower.includes("border-radius")) {
    result = result.replace(/--border-radius:\s*[^;]+;/, "--border-radius: 1.5rem;");
    changes.push("Increased border radius for a rounder look");
  }

  if (lower.includes("flat") || lower.includes("minimal")) {
    result = result.replace(/box-shadow:[^;]+;/g, "box-shadow: none;");
    result = result.replace(/backdrop-filter:[^;]+;/g, "backdrop-filter: none;");
    changes.push("Applied flat/minimal style — shadows removed");
  }

  return { result, changes };
}

// ── Main applier ──────────────────────────────────────────────────────────────

export function applyEdit(existingHtml: string, request: EditRequest): EditResult {
  let result = existingHtml;
  const allChanges: string[] = [];

  switch (request.editType) {
    case "color": {
      const { result: r, changes } = applyColorPatch(result, request.rawCommand);
      result = r; allChanges.push(...changes); break;
    }
    case "font": {
      const { result: r, changes } = applyFontPatch(result, request.rawCommand);
      result = r; allChanges.push(...changes); break;
    }
    case "spacing": {
      const { result: r, changes } = applySpacingPatch(result, request.rawCommand);
      result = r; allChanges.push(...changes); break;
    }
    case "style": {
      const { result: r, changes } = applyStylePatch(result, request.rawCommand);
      result = r; allChanges.push(...changes); break;
    }
    default:
      break;
  }

  const applied    = allChanges.length > 0 && result !== existingHtml;
  const changeCount = allChanges.length;

  return {
    applied,
    editedHtml: result,
    changesApplied: allChanges,
    changeCount,
    isPartialEdit: true,
    summary: applied
      ? `Applied ${changeCount} targeted edit${changeCount > 1 ? "s" : ""}: ${allChanges.join("; ")}`
      : "Could not apply targeted edit — will perform full regeneration",
  };
}
