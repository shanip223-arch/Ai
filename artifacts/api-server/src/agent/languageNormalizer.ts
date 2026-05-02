const intentMap: Record<string, string[]> = {
  create: [
    "bana do", "bnado", "bna do", "banao", "create kar do", "create karo",
    "create kar", "create", "generate kar", "generate karo", "generate",
    "bana", "build kar", "build karo", "build", "bna", "likho", "likh do",
    "design kar", "design karo", "make kar", "make karo", "make",
    "bana dena", "create kar dena", "develop kar", "develop karo",
  ],
  clone: [
    "copy kar", "copy karo", "clone karo", "clone kar", "clone",
    "copy", "duplicate", "copy kar do", "clone kar do", "replicate",
    "nakal karo", "nakal kar", "same bana", "same banao",
  ],
  analyze: [
    "samjho", "samjh lo", "analyze karo", "analyze kar", "analyze",
    "dekho", "dekh lo", "check karo", "check kar", "check",
    "parse karo", "parse kar", "scan karo", "scan kar", "scan",
    "inspect karo", "inspect kar", "study karo",
  ],
  open: [
    "khol", "kholo", "open karo", "open kar", "open",
    "launch karo", "launch kar", "visit karo", "visit",
  ],
  research: [
    "research karo", "research kar", "research", "search karo", "search kar",
    "search", "internet pe dhundo", "dhundo", "find karo", "find kar",
    "google karo", "google kar", "web search", "online dhundo",
  ],
  add: [
    "add karo", "add kar", "add", "jodo", "jod do", "include karo",
    "include kar", "daalo", "daal do", "insert karo", "insert kar",
  ],
};

const uiStyleMap: Record<string, string[]> = {
  clean: ["clean", "saaf", "simple", "sada", "minimalist", "minimal", "neat"],
  modern: ["modern", "naya", "contemporary", "latest", "updated", "trendy"],
  professional: ["professional", "pro", "formal", "business", "corporate", "premium"],
  minimal: ["minimal", "minimalist", "basic", "bare", "stripped"],
  dark: ["dark", "dark mode", "dark theme", "andhera", "black theme"],
};

const pageTypeMap: Record<string, string[]> = {
  login: ["login", "sign in", "signin", "log in", "authentication", "auth page", "login page"],
  dashboard: ["dashboard", "admin panel", "panel", "admin", "control panel", "stats page"],
  index: ["index", "home", "homepage", "landing", "main page", "front page"],
  register: ["register", "signup", "sign up", "registration", "create account"],
  profile: ["profile", "user profile", "account page", "my account"],
  form: ["form", "contact form", "contact page", "feedback", "survey"],
  gallery: ["gallery", "portfolio", "showcase", "images page", "photos"],
};

const validationKeywords = [
  "validation", "validate", "form validation", "check karo", "error handling",
  "required fields", "input check", "verify",
];

export interface NormalizedCommand {
  original: string;
  normalized: string;
  intent: string;
  pageType: string | null;
  uiStyle: string[];
  hasValidation: boolean;
  url: string | null;
  keywords: string[];
}

function extractUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlRegex);
  return matches ? matches[0].replace(/[,.]$/, "") : null;
}

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const [intent, patterns] of Object.entries(intentMap)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return intent;
    }
  }
  return "create";
}

function detectPageType(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [pageType, patterns] of Object.entries(pageTypeMap)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return pageType;
    }
  }
  return null;
}

function detectUiStyle(text: string): string[] {
  const lower = text.toLowerCase();
  const styles: string[] = [];
  for (const [style, patterns] of Object.entries(uiStyleMap)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        styles.push(style);
        break;
      }
    }
  }
  return styles.length > 0 ? styles : ["clean", "modern"];
}

function buildNormalizedSentence(intent: string, pageType: string | null, uiStyle: string[], url: string | null, hasValidation: boolean): string {
  const parts: string[] = [];
  parts.push(`${intent.charAt(0).toUpperCase() + intent.slice(1)}`);
  if (pageType) parts.push(`a ${pageType} page`);
  else parts.push("a webpage");
  if (uiStyle.length > 0) parts.push(`with ${uiStyle.join(", ")} UI`);
  if (hasValidation) parts.push("with form validation");
  if (url) parts.push(`based on ${url}`);
  return parts.join(" ");
}

export function normalizeCommand(rawCommand: string): NormalizedCommand {
  const url = extractUrl(rawCommand);
  const intent = detectIntent(rawCommand);
  const pageType = detectPageType(rawCommand);
  const uiStyle = detectUiStyle(rawCommand);
  const lower = rawCommand.toLowerCase();
  const hasValidation = validationKeywords.some((kw) => lower.includes(kw));

  const keywords: string[] = [];
  if (url) keywords.push("url-present");
  if (hasValidation) keywords.push("validation");
  uiStyle.forEach((s) => keywords.push(`style:${s}`));
  if (pageType) keywords.push(`page:${pageType}`);

  const normalized = buildNormalizedSentence(intent, pageType, uiStyle, url, hasValidation);

  return {
    original: rawCommand,
    normalized,
    intent,
    pageType,
    uiStyle,
    hasValidation,
    url,
    keywords,
  };
}
