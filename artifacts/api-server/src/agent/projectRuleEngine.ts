export interface ProjectRules {
  spacing: { base: number; scale: number[] };
  typography: {
    headings: string[];
    body: string;
    mono: string;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    error: string;
    warning: string;
  };
  borderRadius: string;
  shadows: { sm: string; md: string; lg: string };
  breakpoints: { sm: string; md: string; lg: string; xl: string };
  fileNaming: string;
  cssStrategy: string;
  gridSystem: string;
}

const DARK_RULES: ProjectRules = {
  spacing: { base: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
  typography: {
    headings: ["Inter", "system-ui", "sans-serif"],
    body: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, Fira Code, monospace",
  },
  colors: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    background: "#0f0f13",
    surface: "#1a1a24",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    border: "#2d2d40",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
  },
  borderRadius: "0.5rem",
  shadows: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.4)",
    md: "0 4px 6px -1px rgba(0,0,0,0.5)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.6)",
  },
  breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
  fileNaming: "kebab-case",
  cssStrategy: "css-variables",
  gridSystem: "css-grid",
};

const LIGHT_RULES: ProjectRules = {
  spacing: { base: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
  typography: {
    headings: ["Inter", "system-ui", "sans-serif"],
    body: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, Fira Code, monospace",
  },
  colors: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
  },
  borderRadius: "0.5rem",
  shadows: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.07)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.08)",
  },
  breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
  fileNaming: "kebab-case",
  cssStrategy: "css-variables",
  gridSystem: "css-grid",
};

export function getRules(colorScheme: "light" | "dark" | "auto"): ProjectRules {
  return colorScheme === "dark" ? DARK_RULES : LIGHT_RULES;
}

export function generateCssVariables(rules: ProjectRules): string {
  return `
  --color-primary: ${rules.colors.primary};
  --color-secondary: ${rules.colors.secondary};
  --color-bg: ${rules.colors.background};
  --color-surface: ${rules.colors.surface};
  --color-text: ${rules.colors.text};
  --color-text-muted: ${rules.colors.textMuted};
  --color-border: ${rules.colors.border};
  --color-success: ${rules.colors.success};
  --color-error: ${rules.colors.error};
  --color-warning: ${rules.colors.warning};
  --border-radius: ${rules.borderRadius};
  --shadow-sm: ${rules.shadows.sm};
  --shadow-md: ${rules.shadows.md};
  --shadow-lg: ${rules.shadows.lg};
  --font-body: ${rules.typography.body};
  --font-mono: ${rules.typography.mono};
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 24px;
  --spacing-6: 32px;
  --spacing-7: 48px;
  --spacing-8: 64px;
`.trim();
}
