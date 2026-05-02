import type { NormalizedCommand } from "./languageNormalizer.js";

export interface PageConditions {
  pageType: string;
  uiStyle: string[];
  hasValidation: boolean;
  hasNavbar: boolean;
  hasFooter: boolean;
  colorScheme: "light" | "dark" | "auto";
  responsive: boolean;
  animationsEnabled: boolean;
}

export function buildConditions(cmd: NormalizedCommand): PageConditions {
  const lower = cmd.original.toLowerCase();

  const hasDark = cmd.uiStyle.includes("dark") || lower.includes("dark");
  const hasNavbar =
    lower.includes("navbar") ||
    lower.includes("nav") ||
    lower.includes("header") ||
    cmd.pageType === "dashboard" ||
    cmd.pageType === "index";
  const hasFooter =
    lower.includes("footer") ||
    cmd.pageType === "index";

  return {
    pageType: cmd.pageType ?? "index",
    uiStyle: cmd.uiStyle,
    hasValidation: cmd.hasValidation,
    hasNavbar,
    hasFooter,
    colorScheme: hasDark ? "dark" : "light",
    responsive: true,
    animationsEnabled: cmd.uiStyle.includes("modern"),
  };
}
