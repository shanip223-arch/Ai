/**
 * Template Generator — Modern Edition
 * Produces production-ready, visually stunning HTML for each page type.
 *
 * Design system:
 * - Glassmorphism cards with backdrop-filter
 * - CSS mesh gradient backgrounds
 * - Fluid typography via clamp()
 * - IntersectionObserver scroll animations
 * - Floating label inputs (CSS-only)
 * - Password strength meter
 * - Fully responsive — mobile-first
 * - SVG icons inline (no external icon CDN)
 * - Smooth cubic-bezier transitions
 * - Dark & light theme via CSS custom properties
 */

import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";
import { generateCssVariables } from "./projectRuleEngine.js";
import type { UrlAnalysis } from "./urlAnalyzer.js";

// ─── SVG icon micro-library ────────────────────────────────────────────────────

const ICON = {
  eye:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  google:   `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  github:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  menu:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  x:        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrow:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  home:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  bar:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  users:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  bolt:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  star:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  send:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  logout:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  trend:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  mail:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  phone:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
} as const;

// ─── Shared CSS foundation ─────────────────────────────────────────────────────

function baseStyles(rules: ProjectRules): string {
  const isDark = rules.colors.background.startsWith("#0") || rules.colors.background.startsWith("#1");
  return `
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
  body { font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); line-height: 1.6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; min-height: 100dvh; }
  img, video { max-width: 100%; display: block; }
  button, input, textarea, select { font: inherit; }
  a { color: inherit; text-decoration: none; }
  ul, ol { list-style: none; }
  :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; border-radius: 4px; }
}

@layer base {
  :root {
    ${generateCssVariables(rules)}
    --radius-sm:  0.375rem;
    --radius-md:  0.625rem;
    --radius-lg:  1rem;
    --radius-xl:  1.5rem;
    --radius-2xl: 2rem;
    --radius-full: 9999px;
    --spacing-px: 1px;
    --spacing-0:  0;
    --spacing-1:  0.25rem;
    --spacing-2:  0.5rem;
    --spacing-3:  0.75rem;
    --spacing-4:  1rem;
    --spacing-5:  1.25rem;
    --spacing-6:  1.5rem;
    --spacing-7:  1.75rem;
    --spacing-8:  2rem;
    --spacing-10: 2.5rem;
    --spacing-12: 3rem;
    --spacing-16: 4rem;
    --spacing-20: 5rem;
    --spacing-24: 6rem;
    --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base:   250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow:   400ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
    --glass-bg:    ${isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)"};
    --glass-border:${isDark ? "rgba(255,255,255,0.1)"  : "rgba(255,255,255,0.8)"};
    --glass-blur:  blur(20px) saturate(180%);
  }
}

@layer components {
  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: var(--spacing-2); padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-md); font-size: 0.9375rem; font-weight: 600;
    cursor: pointer; transition: all var(--transition-base);
    border: 1.5px solid transparent; white-space: nowrap; user-select: none;
    position: relative; overflow: hidden;
  }
  .btn::after {
    content: ''; position: absolute; inset: 0;
    background: transparent; transition: background var(--transition-fast);
  }
  .btn:hover::after { background: rgba(255,255,255,0.08); }
  .btn:active { transform: scale(0.97); }
  .btn-primary {
    background: linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 80%, var(--color-secondary)));
    color: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 0 0 0 color-mix(in srgb, var(--color-primary) 40%, transparent);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px color-mix(in srgb, var(--color-primary) 50%, transparent), 0 4px 10px -3px rgba(0,0,0,0.2);
  }
  .btn-secondary {
    background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
    color: var(--color-text);
    border-color: var(--color-border);
  }
  .btn-secondary:hover {
    background: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"};
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: translateY(-1px);
  }
  .btn-ghost {
    background: transparent; color: var(--color-primary); border-color: transparent;
  }
  .btn-ghost:hover {
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }
  .btn-sm { padding: var(--spacing-2) var(--spacing-4); font-size: 0.875rem; }
  .btn-lg { padding: var(--spacing-4) var(--spacing-8); font-size: 1.0625rem; }
  .btn-icon { padding: var(--spacing-2); border-radius: var(--radius-md); }
  .btn-full { width: 100%; }

  /* ── Cards ── */
  .card {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-xl); padding: var(--spacing-6);
    transition: box-shadow var(--transition-base), transform var(--transition-base), border-color var(--transition-base);
  }
  .card:hover { box-shadow: var(--shadow-lg); transform: translateY(-3px); border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }
  .card-glass {
    background: var(--glass-bg); backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
  }

  /* ── Form elements ── */
  .field { position: relative; margin-bottom: var(--spacing-5); }
  .label {
    display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text);
    margin-bottom: var(--spacing-2); letter-spacing: 0.01em;
  }
  .input {
    width: 100%; padding: var(--spacing-3) var(--spacing-4);
    border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
    background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"};
    color: var(--color-text); font-size: 0.9375rem;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
  }
  .input:hover { border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border)); }
  .input:focus {
    border-color: var(--color-primary); outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
    background: ${isDark ? "rgba(255,255,255,0.06)" : "#fff"};
  }
  .input::placeholder { color: var(--color-text-muted); opacity: 0.6; }
  .input-error { border-color: var(--color-error) !important; }
  .input-success { border-color: var(--color-success) !important; }
  .field-msg { font-size: 0.8rem; margin-top: var(--spacing-1); display: none; }
  .field-msg.error { color: var(--color-error); display: block; }
  .field-msg.success { color: var(--color-success); display: block; }
  .input-with-icon { position: relative; }
  .input-with-icon .input { padding-right: 2.75rem; }
  .input-icon-btn {
    position: absolute; right: var(--spacing-3); top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--color-text-muted);
    padding: var(--spacing-1); border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }
  .input-icon-btn:hover { color: var(--color-text); }
  textarea.input { resize: vertical; min-height: 120px; }
  select.input { appearance: none; cursor: pointer; }

  /* ── Badge ── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 10px; border-radius: var(--radius-full);
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em;
  }
  .badge-primary { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
  .badge-success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
  .badge-warning { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
  .badge-error   { background: color-mix(in srgb, var(--color-error)   15%, transparent); color: var(--color-error);   }

  /* ── Divider ── */
  .divider {
    display: flex; align-items: center; gap: var(--spacing-3);
    color: var(--color-text-muted); font-size: 0.8125rem;
    margin: var(--spacing-5) 0;
  }
  .divider::before, .divider::after {
    content: ''; flex: 1; height: 1px; background: var(--color-border);
  }

  /* ── Container ── */
  .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 var(--spacing-5); }
  .container-sm { max-width: 640px; }
  .container-md { max-width: 860px; }

  /* ── Grid ── */
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-5); }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-5); }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-5); }
  @media (max-width: 1024px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 768px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }
}

@layer utilities {
  /* ── Animations ── */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideLeft{ from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer  { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes bounceIn { 0% { transform:scale(0.3); opacity:0; } 50% { transform:scale(1.05); } 70% { transform:scale(0.9); } 100% { transform:scale(1); opacity:1; } }

  .anim-fade-up  { opacity:0; transform:translateY(20px); }
  .anim-fade-in  { opacity:0; }
  .anim-scale-in { opacity:0; transform:scale(0.92); }
  .anim-visible.anim-fade-up  { animation: fadeUp  0.55s cubic-bezier(0.4,0,0.2,1) both; }
  .anim-visible.anim-fade-in  { animation: fadeIn  0.45s ease both; }
  .anim-visible.anim-scale-in { animation: scaleIn 0.45s cubic-bezier(0.4,0,0.2,1) both; }

  /* Stagger delays */
  [style*="--d:1"] { animation-delay: 0.1s !important; }
  [style*="--d:2"] { animation-delay: 0.2s !important; }
  [style*="--d:3"] { animation-delay: 0.3s !important; }
  [style*="--d:4"] { animation-delay: 0.4s !important; }
  [style*="--d:5"] { animation-delay: 0.5s !important; }
  [style*="--d:6"] { animation-delay: 0.6s !important; }

  /* ── Utility classes ── */
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
  .text-muted { color: var(--color-text-muted); }
  .text-sm    { font-size: 0.875rem; }
  .text-xs    { font-size: 0.8rem; }
  .text-center { text-align: center; }
  .font-bold  { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .flex       { display: flex; }
  .flex-col   { flex-direction: column; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: var(--spacing-2); }
  .gap-3 { gap: var(--spacing-3); }
  .gap-4 { gap: var(--spacing-4); }
  .mt-auto { margin-top: auto; }
  .w-full { width: 100%; }
  .hidden { display: none !important; }
}
`.trim();
}

// ─── Intersection Observer script ─────────────────────────────────────────────

const OBSERVER_SCRIPT = `
<script>
(function(){
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('anim-visible'); io.unobserve(e.target); }
    });
  },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.anim-fade-up,.anim-fade-in,.anim-scale-in').forEach(function(el){ io.observe(el); });
})();
</script>`.trim();

// ─── HTML wrapper ──────────────────────────────────────────────────────────────

function wrapHtml(title: string, styles: string, bodyContent: string, extraHead = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#6366f1">
  <title>${title}</title>
  <meta name="description" content="${title} — built with Agent OS">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
${extraHead}
  <style>
${styles}
  </style>
</head>
<body>
${bodyContent}
${OBSERVER_SCRIPT}
</body>
</html>`;
}

// ─── Shared navbar ─────────────────────────────────────────────────────────────

function navbarHtml(title: string, isDark: boolean): string {
  const bg = isDark ? "rgba(15,15,19,0.85)" : "rgba(255,255,255,0.85)";
  return `
<style>
.nav {
  position: sticky; top: 0; z-index: 100;
  background: ${bg}; backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--color-border);
  transition: box-shadow var(--transition-base);
}
.nav.scrolled { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
.nav-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 0 var(--spacing-5);
  height: 64px; display: flex; align-items: center; justify-content: space-between;
}
.nav-logo {
  font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.nav-links { display: flex; align-items: center; gap: var(--spacing-6); }
.nav-link {
  font-size: 0.9rem; font-weight: 500; color: var(--color-text-muted);
  transition: color var(--transition-fast); position: relative;
}
.nav-link::after {
  content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px;
  background: var(--color-primary); border-radius: 2px;
  transform: scaleX(0); transition: transform var(--transition-fast);
}
.nav-link:hover { color: var(--color-text); }
.nav-link:hover::after { transform: scaleX(1); }
.nav-cta { display: flex; align-items: center; gap: var(--spacing-3); }
.nav-toggle { display: none; background: none; border: none; cursor: pointer; color: var(--color-text); padding: var(--spacing-2); border-radius: var(--radius-sm); }
.nav-mobile { display: none; flex-direction: column; background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: var(--spacing-4) var(--spacing-5); gap: var(--spacing-3); }
.nav-mobile .nav-link { font-size: 1rem; }
@media (max-width: 768px) {
  .nav-links { display: none; }
  .nav-toggle { display: flex; }
  .nav-mobile.open { display: flex; }
}
</style>
<nav class="nav" id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">${title}</a>
    <div class="nav-links">
      <a href="#" class="nav-link">Home</a>
      <a href="#features" class="nav-link">Features</a>
      <a href="#" class="nav-link">Pricing</a>
      <a href="#" class="nav-link">About</a>
    </div>
    <div class="nav-cta">
      <a href="#" class="btn btn-secondary btn-sm">Log in</a>
      <a href="#" class="btn btn-primary btn-sm">Get started</a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">${ICON.menu}</button>
    </div>
  </div>
  <div class="nav-mobile" id="navMobile">
    <a href="#" class="nav-link">Home</a>
    <a href="#features" class="nav-link">Features</a>
    <a href="#" class="nav-link">Pricing</a>
    <a href="#" class="nav-link">About</a>
    <a href="#" class="btn btn-primary btn-sm w-full text-center">Get started free</a>
  </div>
</nav>
<script>
(function(){
  var btn=document.getElementById('navToggle'),menu=document.getElementById('navMobile'),nav=document.getElementById('nav');
  btn&&btn.addEventListener('click',function(){ menu.classList.toggle('open'); });
  window.addEventListener('scroll',function(){ nav.classList.toggle('scrolled',window.scrollY>20); });
})();
</script>`.trim();
}

// ─── Shared footer ────────────────────────────────────────────────────────────

function footerHtml(title: string): string {
  return `
<footer style="background:var(--color-surface);border-top:1px solid var(--color-border);padding:var(--spacing-16) var(--spacing-5) var(--spacing-8);">
  <div class="container">
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:var(--spacing-10);margin-bottom:var(--spacing-10);">
      <div>
        <div style="font-size:1.25rem;font-weight:800;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:var(--spacing-3);">${title}</div>
        <p style="color:var(--color-text-muted);font-size:0.9rem;line-height:1.7;max-width:280px;">Building the next generation of web experiences. Fast, secure, and beautiful by default.</p>
        <div style="display:flex;gap:var(--spacing-3);margin-top:var(--spacing-4);">
          <a href="#" style="color:var(--color-text-muted);transition:color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">${ICON.github}</a>
        </div>
      </div>
      <div>
        <div style="font-size:0.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted);margin-bottom:var(--spacing-4);">Product</div>
        <div style="display:flex;flex-direction:column;gap:var(--spacing-2);">
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Features</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Pricing</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Changelog</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Roadmap</a>
        </div>
      </div>
      <div>
        <div style="font-size:0.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted);margin-bottom:var(--spacing-4);">Company</div>
        <div style="display:flex;flex-direction:column;gap:var(--spacing-2);">
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">About</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Blog</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Careers</a>
        </div>
      </div>
      <div>
        <div style="font-size:0.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted);margin-bottom:var(--spacing-4);">Legal</div>
        <div style="display:flex;flex-direction:column;gap:var(--spacing-2);">
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Privacy</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Terms</a>
          <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Cookies</a>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid var(--color-border);padding-top:var(--spacing-6);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-3);">
      <p style="color:var(--color-text-muted);font-size:0.875rem;">&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
      <p style="color:var(--color-text-muted);font-size:0.8rem;">Made with Agent OS</p>
    </div>
  </div>
</footer>
<style>@media(max-width:768px){footer .container>div:first-child{grid-template-columns:1fr 1fr}}</style>`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Login Page ─────────────────────────────────────────────────────────────

function generateLoginPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Sign in";
  const isDark = conditions.colorScheme === "dark";
  const accent = rules.colors.primary;

  const styles = `${baseStyles(rules)}

.login-page {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Left panel — branding */
.login-left {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg,
    color-mix(in srgb, ${accent} 80%, #000) 0%,
    color-mix(in srgb, ${accent} 40%, #000) 50%,
    ${isDark ? "#0a0a12" : "#f0f0ff"} 100%
  );
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: var(--spacing-12);
  color: #fff;
}
.login-left::before {
  content: ''; position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
  top: -200px; right: -200px;
}
.login-left::after {
  content: ''; position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
  bottom: -100px; left: -100px;
}
.login-brand { position: relative; z-index: 1; text-align: center; }
.login-brand-logo {
  width: 64px; height: 64px; border-radius: var(--radius-xl);
  background: rgba(255,255,255,0.2); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255,255,255,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.75rem; margin: 0 auto var(--spacing-6);
}
.login-brand h1 { font-size: clamp(2rem, 3vw, 2.75rem); font-weight: 900; line-height: 1.2; margin-bottom: var(--spacing-4); }
.login-brand p { font-size: 1.05rem; opacity: 0.8; line-height: 1.7; max-width: 320px; }
.login-testimonial {
  position: relative; z-index: 1;
  margin-top: var(--spacing-10);
  background: rgba(255,255,255,0.12); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--radius-xl); padding: var(--spacing-6);
  max-width: 360px;
}
.login-testimonial p { font-size: 0.95rem; line-height: 1.6; opacity: 0.9; margin-bottom: var(--spacing-4); }
.login-testimonial-author { display: flex; align-items: center; gap: var(--spacing-3); }
.author-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.9rem;
}
.author-info .name { font-weight: 700; font-size: 0.9rem; }
.author-info .role { opacity: 0.7; font-size: 0.8rem; }

/* Right panel — form */
.login-right {
  display: flex; align-items: center; justify-content: center;
  padding: var(--spacing-8) var(--spacing-6);
  background: var(--color-bg);
  overflow-y: auto;
}
.login-form-wrap { width: 100%; max-width: 400px; }
.login-form-wrap .back-link {
  display: inline-flex; align-items: center; gap: var(--spacing-2);
  color: var(--color-text-muted); font-size: 0.875rem;
  transition: color var(--transition-fast); margin-bottom: var(--spacing-8);
}
.login-form-wrap .back-link:hover { color: var(--color-text); }
.login-header { margin-bottom: var(--spacing-7); }
.login-header h2 { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: var(--spacing-2); }
.login-header p { color: var(--color-text-muted); font-size: 0.9375rem; }
.social-btn {
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: var(--spacing-3); padding: var(--spacing-3); border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); background: var(--color-surface);
  color: var(--color-text); font-size: 0.9375rem; font-weight: 600;
  cursor: pointer; transition: all var(--transition-fast); margin-bottom: var(--spacing-3);
}
.social-btn:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface)); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.forgot-row { display: flex; justify-content: flex-end; margin: -var(--spacing-2) 0 var(--spacing-4); }
.forgot-link { font-size: 0.8125rem; color: var(--color-primary); transition: opacity var(--transition-fast); }
.forgot-link:hover { opacity: 0.75; }
.signup-prompt { text-align: center; margin-top: var(--spacing-6); color: var(--color-text-muted); font-size: 0.9rem; }
.signup-prompt a { color: var(--color-primary); font-weight: 600; }

@media (max-width: 768px) {
  .login-page { grid-template-columns: 1fr; }
  .login-left { display: none; }
}`;

  const validationScript = conditions.hasValidation ? `
<script>
(function(){
  function show(id,msg,type){var el=document.getElementById(id);if(el){el.textContent=msg;el.className='field-msg '+(type||'');}}
  function val(id){return document.getElementById(id)?.value.trim()||'';}
  function cls(id,add,c){var el=document.getElementById(id);el&&el.classList[add?'add':'remove'](c);}
  document.getElementById('loginForm')?.addEventListener('submit',function(e){
    e.preventDefault(); var ok=true;
    var email=val('email');
    if(!email||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)){
      cls('email','add','input-error');show('email-msg','Please enter a valid email address.','error');ok=false;
    } else { cls('email','remove','input-error');show('email-msg','',''); }
    var pw=val('password');
    if(!pw||pw.length<6){
      cls('password','add','input-error');show('pw-msg','Password must be at least 6 characters.','error');ok=false;
    } else { cls('password','remove','input-error');show('pw-msg','',''); }
    if(ok){
      var btn=document.getElementById('loginBtn');
      if(btn){btn.textContent='Signing in…';btn.disabled=true;}
      setTimeout(function(){if(btn){btn.innerHTML='${ICON.check} Signed in!';btn.style.background='var(--color-success)';}},1500);
    }
  });
  document.getElementById('password')?.addEventListener('input',function(){
    cls('password','remove','input-error');show('pw-msg','','');
  });
  document.getElementById('email')?.addEventListener('input',function(){
    cls('email','remove','input-error');show('email-msg','','');
  });
  var tog=document.getElementById('pwToggle'),pw=document.getElementById('password');
  tog&&tog.addEventListener('click',function(){
    if(pw){pw.type=pw.type==='password'?'text':'password';}
  });
})();
</script>` : `<script>
var tog=document.getElementById('pwToggle'),pw=document.getElementById('password');
tog&&tog.addEventListener('click',function(){if(pw){pw.type=pw.type==='password'?'text':'password';}});
</script>`;

  const body = `
<div class="login-page">
  <div class="login-left">
    <div class="login-brand anim-fade-up anim-visible">
      <div class="login-brand-logo">✦</div>
      <h1>Welcome back to ${title}</h1>
      <p>The fastest way to build and ship beautiful web experiences.</p>
    </div>
    <div class="login-testimonial anim-fade-up anim-visible" style="--d:2">
      <p>"This platform transformed how we build products. We went from idea to launch in days, not months."</p>
      <div class="login-testimonial-author">
        <div class="author-avatar">RS</div>
        <div class="author-info">
          <div class="name">Rahul Sharma</div>
          <div class="role">CEO at TechStack India</div>
        </div>
      </div>
    </div>
  </div>

  <div class="login-right">
    <div class="login-form-wrap">
      <a href="/" class="back-link">← Back to home</a>
      <div class="login-header">
        <h2>Sign in</h2>
        <p>Don't have an account? <a href="#" style="color:var(--color-primary);font-weight:600;">Create one free</a></p>
      </div>

      <button class="social-btn">${ICON.google} Continue with Google</button>
      <button class="social-btn">${ICON.github} Continue with GitHub</button>

      <div class="divider">or continue with email</div>

      <form id="loginForm" novalidate>
        <div class="field">
          <label class="label" for="email">Email address</label>
          <input class="input" type="email" id="email" name="email" placeholder="you@example.com" autocomplete="email" required>
          <div class="field-msg" id="email-msg"></div>
        </div>

        <div class="field">
          <label class="label" for="password">Password</label>
          <div class="input-with-icon">
            <input class="input" type="password" id="password" name="password" placeholder="Min. 8 characters" autocomplete="current-password" required>
            <button type="button" class="input-icon-btn" id="pwToggle" aria-label="Toggle password visibility">${ICON.eye}</button>
          </div>
          <div class="field-msg" id="pw-msg"></div>
        </div>

        <div class="forgot-row">
          <a href="#" class="forgot-link">Forgot password?</a>
        </div>

        <button type="submit" id="loginBtn" class="btn btn-primary btn-full btn-lg">Sign in</button>
      </form>

      <p class="signup-prompt">New to ${title}? <a href="#">Create account</a></p>
    </div>
  </div>
</div>
${validationScript}`;

  return wrapHtml(title, styles, body);
}

// ─── 2. Dashboard Page ─────────────────────────────────────────────────────────

function generateDashboardPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Dashboard";
  const isDark = conditions.colorScheme === "dark";

  const miniChart = (vals: number[], color: string) => {
    const max = Math.max(...vals);
    const h = 36;
    const w = 80;
    const step = w / (vals.length - 1);
    const pts = vals.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
    const area = `0,${h} ${pts} ${w},${h}`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">
      <defs><linearGradient id="g${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${area}" fill="url(#g${color.replace('#','')})" />
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  };

  const styles = `${baseStyles(rules)}
.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100dvh; }
.sidebar {
  background: ${isDark ? "#0d0d14" : "#f8f9fc"};
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-5) var(--spacing-4);
  display: flex; flex-direction: column; gap: var(--spacing-1);
  position: sticky; top: 0; height: 100dvh; overflow-y: auto;
}
.sidebar-logo {
  font-size: 1.1rem; font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  padding: var(--spacing-2) var(--spacing-3); margin-bottom: var(--spacing-4);
}
.sidebar-section { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-muted); padding: var(--spacing-2) var(--spacing-3); margin-top: var(--spacing-3); }
.nav-item {
  display: flex; align-items: center; gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-3); border-radius: var(--radius-md);
  color: var(--color-text-muted); font-size: 0.875rem; font-weight: 500;
  cursor: pointer; transition: all var(--transition-fast); text-decoration: none;
  position: relative;
}
.nav-item:hover { background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}; color: var(--color-text); }
.nav-item.active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--color-primary);
}
.nav-badge { margin-left: auto; background: var(--color-primary); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: var(--radius-full); }

.topbar {
  background: var(--color-bg); border-bottom: 1px solid var(--color-border);
  padding: 0 var(--spacing-6); height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 50;
}
.topbar-search {
  display: flex; align-items: center; gap: var(--spacing-3);
  background: ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"};
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  padding: var(--spacing-2) var(--spacing-4); width: 280px;
}
.topbar-search input { background: none; border: none; color: var(--color-text); font-size: 0.875rem; width: 100%; }
.topbar-search input::placeholder { color: var(--color-text-muted); }
.topbar-right { display: flex; align-items: center; gap: var(--spacing-3); }
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.875rem; color: #fff; cursor: pointer;
}
.icon-btn { padding: var(--spacing-2); border-radius: var(--radius-md); background: none; border: none; cursor: pointer; color: var(--color-text-muted); transition: all var(--transition-fast); }
.icon-btn:hover { background: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}; color: var(--color-text); }

.main { background: var(--color-bg); overflow-y: auto; }
.main-content { padding: var(--spacing-8) var(--spacing-6); }
.page-header { margin-bottom: var(--spacing-8); }
.page-header h1 { font-size: clamp(1.5rem, 2.5vw, 2rem); font-weight: 800; letter-spacing: -0.02em; }
.page-header p { color: var(--color-text-muted); margin-top: var(--spacing-1); font-size: 0.9375rem; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-4); margin-bottom: var(--spacing-6); }
.stat-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: var(--spacing-5);
  display: flex; flex-direction: column; gap: var(--spacing-2);
  transition: all var(--transition-base); cursor: default;
  position: relative; overflow: hidden;
}
.stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--stat-color, var(--color-primary)), transparent); }
.stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); border-color: var(--stat-color, var(--color-primary)); }
.stat-top { display: flex; justify-content: space-between; align-items: flex-start; }
.stat-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--stat-color, var(--color-primary)) 15%, transparent); display: flex; align-items: center; justify-content: center; color: var(--stat-color, var(--color-primary)); }
.stat-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
.stat-value { font-size: clamp(1.5rem, 2vw, 2rem); font-weight: 800; letter-spacing: -0.02em; color: var(--color-text); }
.stat-delta { font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.stat-delta.up   { color: var(--color-success); }
.stat-delta.down { color: var(--color-error); }
.stat-chart { margin-top: var(--spacing-2); }

.section-grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--spacing-5); margin-bottom: var(--spacing-5); }
.panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); overflow: hidden; }
.panel-header { padding: var(--spacing-4) var(--spacing-5); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
.panel-title { font-weight: 700; font-size: 1rem; }

table { width: 100%; border-collapse: collapse; }
thead th { padding: var(--spacing-3) var(--spacing-5); text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); background: ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"}; }
tbody td { padding: var(--spacing-4) var(--spacing-5); font-size: 0.9rem; border-top: 1px solid var(--color-border); }
tbody tr { transition: background var(--transition-fast); }
tbody tr:hover { background: ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; }
.user-cell { display: flex; align-items: center; gap: var(--spacing-3); }
.user-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.user-name { font-weight: 600; font-size: 0.875rem; }
.user-email { color: var(--color-text-muted); font-size: 0.775rem; }

.activity-list { padding: var(--spacing-4) var(--spacing-5); display: flex; flex-direction: column; gap: var(--spacing-4); }
.activity-item { display: flex; gap: var(--spacing-3); }
.activity-dot { width: 32px; height: 32px; border-radius: 50%; background: color-mix(in srgb, var(--color-primary) 15%, transparent); border: 1.5px solid color-mix(in srgb, var(--color-primary) 30%, transparent); display: flex; align-items: center; justify-content: center; color: var(--color-primary); flex-shrink: 0; margin-top: 2px; }
.activity-text { font-size: 0.875rem; line-height: 1.5; }
.activity-time { font-size: 0.775rem; color: var(--color-text-muted); margin-top: 2px; }

@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .section-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .sidebar { display: none; } .topbar-search { display: none; } .stats-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr; } }`;

  const p = rules.colors.primary;
  const body = `
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">${title}</div>
    <div class="sidebar-section">Main</div>
    <a href="#" class="nav-item active">${ICON.home} Overview</a>
    <a href="#" class="nav-item">${ICON.bar} Analytics <span class="nav-badge">New</span></a>
    <a href="#" class="nav-item">${ICON.users} Users</a>
    <a href="#" class="nav-item">${ICON.trend} Reports</a>
    <div class="sidebar-section">Settings</div>
    <a href="#" class="nav-item">${ICON.settings} Settings</a>
    <div style="margin-top:auto;padding-top:var(--spacing-4);border-top:1px solid var(--color-border);">
      <a href="#" class="nav-item">${ICON.logout} Log out</a>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="topbar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-text-muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search…">
      </div>
      <div class="topbar-right">
        <button class="icon-btn">${ICON.bolt}</button>
        <div class="avatar">RS</div>
      </div>
    </div>

    <div class="main-content">
      <div class="page-header anim-fade-up anim-visible">
        <h1>Good morning, Rahul 👋</h1>
        <p>Here's what's happening with your projects today.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card anim-fade-up anim-visible" style="--stat-color:#6366f1;--d:1">
          <div class="stat-top">
            <div><div class="stat-label">Total Users</div><div class="stat-value">24,531</div></div>
            <div class="stat-icon">${ICON.users}</div>
          </div>
          <div class="stat-delta up">↑ +12.5% vs last month</div>
          <div class="stat-chart">${miniChart([18,22,19,28,24,30,24], p)}</div>
        </div>
        <div class="stat-card anim-fade-up anim-visible" style="--stat-color:#10b981;--d:2">
          <div class="stat-top">
            <div><div class="stat-label">Revenue</div><div class="stat-value">₹8.4L</div></div>
            <div class="stat-icon">${ICON.trend}</div>
          </div>
          <div class="stat-delta up">↑ +8.3% vs last month</div>
          <div class="stat-chart">${miniChart([40,55,48,70,62,80,74], "#10b981")}</div>
        </div>
        <div class="stat-card anim-fade-up anim-visible" style="--stat-color:#f59e0b;--d:3">
          <div class="stat-top">
            <div><div class="stat-label">Active Projects</div><div class="stat-value">284</div></div>
            <div class="stat-icon">${ICON.bolt}</div>
          </div>
          <div class="stat-delta up">↑ +3 new this week</div>
          <div class="stat-chart">${miniChart([10,14,12,18,15,20,18], "#f59e0b")}</div>
        </div>
        <div class="stat-card anim-fade-up anim-visible" style="--stat-color:#ec4899;--d:4">
          <div class="stat-top">
            <div><div class="stat-label">Conversion</div><div class="stat-value">3.24%</div></div>
            <div class="stat-icon">${ICON.star}</div>
          </div>
          <div class="stat-delta down">↓ −0.2% vs last week</div>
          <div class="stat-chart">${miniChart([4,3.5,4.2,3.8,3.2,3.5,3.24], "#ec4899")}</div>
        </div>
      </div>

      <div class="section-grid">
        <div class="panel anim-fade-up anim-visible" style="--d:2">
          <div class="panel-header">
            <span class="panel-title">Recent Users</span>
            <button class="btn btn-secondary btn-sm">View all</button>
          </div>
          <table>
            <thead><tr><th>User</th><th>Action</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              <tr><td><div class="user-cell"><div class="user-avatar-sm">RS</div><div><div class="user-name">Rahul Sharma</div><div class="user-email">rahul@example.com</div></div></div></td><td style="color:var(--color-text-muted);font-size:0.85rem">Signed up</td><td><span class="badge badge-success">Active</span></td><td style="color:var(--color-text-muted);font-size:0.85rem">Just now</td></tr>
              <tr><td><div class="user-cell"><div class="user-avatar-sm">PS</div><div><div class="user-name">Priya Singh</div><div class="user-email">priya@example.com</div></div></div></td><td style="color:var(--color-text-muted);font-size:0.85rem">Upgraded plan</td><td><span class="badge badge-primary">Pro</span></td><td style="color:var(--color-text-muted);font-size:0.85rem">2 min ago</td></tr>
              <tr><td><div class="user-cell"><div class="user-avatar-sm">AK</div><div><div class="user-name">Amit Kumar</div><div class="user-email">amit@example.com</div></div></div></td><td style="color:var(--color-text-muted);font-size:0.85rem">Submitted report</td><td><span class="badge badge-warning">Pending</span></td><td style="color:var(--color-text-muted);font-size:0.85rem">1 hr ago</td></tr>
              <tr><td><div class="user-cell"><div class="user-avatar-sm">NG</div><div><div class="user-name">Neha Gupta</div><div class="user-email">neha@example.com</div></div></div></td><td style="color:var(--color-text-muted);font-size:0.85rem">Exported data</td><td><span class="badge badge-success">Active</span></td><td style="color:var(--color-text-muted);font-size:0.85rem">3 hr ago</td></tr>
              <tr><td><div class="user-cell"><div class="user-avatar-sm">VP</div><div><div class="user-name">Vikram Patel</div><div class="user-email">vikram@example.com</div></div></div></td><td style="color:var(--color-text-muted);font-size:0.85rem">Logged in</td><td><span class="badge badge-error">Inactive</span></td><td style="color:var(--color-text-muted);font-size:0.85rem">5 hr ago</td></tr>
            </tbody>
          </table>
        </div>
        <div class="panel anim-fade-up anim-visible" style="--d:3">
          <div class="panel-header"><span class="panel-title">Activity Feed</span></div>
          <div class="activity-list">
            <div class="activity-item"><div class="activity-dot">${ICON.users}</div><div><div class="activity-text"><strong>Rahul</strong> signed up to Pro plan</div><div class="activity-time">2 minutes ago</div></div></div>
            <div class="activity-item"><div class="activity-dot">${ICON.trend}</div><div><div class="activity-text">Monthly revenue hit <strong>₹8.4L</strong></div><div class="activity-time">1 hour ago</div></div></div>
            <div class="activity-item"><div class="activity-dot">${ICON.bolt}</div><div><div class="activity-text">New project <strong>AgentOS v2</strong> deployed</div><div class="activity-time">3 hours ago</div></div></div>
            <div class="activity-item"><div class="activity-dot">${ICON.shield}</div><div><div class="activity-text">Security scan completed — <strong>all clear</strong></div><div class="activity-time">5 hours ago</div></div></div>
            <div class="activity-item"><div class="activity-dot">${ICON.star}</div><div><div class="activity-text">Received <strong>5-star</strong> review on Product Hunt</div><div class="activity-time">Yesterday</div></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  return wrapHtml(title, styles, body);
}

// ─── 3. Landing/Index Page ─────────────────────────────────────────────────────

function generateIndexPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Home";
  const desc  = analysis?.description || "The fastest way to build production-ready web experiences.";
  const isDark = conditions.colorScheme === "dark";
  const accent = rules.colors.primary;

  const styles = `${baseStyles(rules)}
/* ── Hero ── */
.hero {
  min-height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  padding: var(--spacing-24) var(--spacing-5) var(--spacing-16);
}
.hero-bg {
  position: absolute; inset: 0; z-index: 0;
  background: ${isDark ? `radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, ${accent} 30%, transparent), transparent),radial-gradient(ellipse 60% 50% at 80% 80%, color-mix(in srgb, ${accent} 15%, transparent), transparent), var(--color-bg)` : `radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, ${accent} 20%, transparent), transparent),radial-gradient(ellipse 50% 40% at 80% 80%, color-mix(in srgb, ${accent} 10%, transparent), transparent), #f9f9ff`};
}
.hero-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"} 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%);
}
.hero-inner { position: relative; z-index: 1; max-width: 820px; text-align: center; margin: 0 auto; }
.hero-badge {
  display: inline-flex; align-items: center; gap: var(--spacing-2);
  background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
  border: 1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"};
  color: var(--color-primary); font-size: 0.8125rem; font-weight: 700;
  padding: var(--spacing-2) var(--spacing-4); border-radius: var(--radius-full);
  margin-bottom: var(--spacing-6); letter-spacing: 0.02em;
}
.hero-badge span { width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary); animation: pulse 2s ease infinite; }
.hero-h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 900; line-height: 1.1;
  letter-spacing: -0.03em; margin-bottom: var(--spacing-6);
}
.hero-h1 .grad {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, ${isDark ? "#a5b4fc" : "#7c3aed"} 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.hero-desc {
  font-size: clamp(1rem, 2vw, 1.2rem); color: var(--color-text-muted);
  line-height: 1.75; margin-bottom: var(--spacing-8); max-width: 560px; margin-left: auto; margin-right: auto;
}
.hero-actions { display: flex; gap: var(--spacing-3); justify-content: center; flex-wrap: wrap; margin-bottom: var(--spacing-10); }
.hero-social-proof { display: flex; align-items: center; gap: var(--spacing-4); color: var(--color-text-muted); font-size: 0.875rem; }
.proof-avatars { display: flex; }
.proof-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid var(--color-bg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  margin-left: -8px; display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 700; color: #fff;
}
.proof-avatar:first-child { margin-left: 0; }
.proof-stars { color: #f59e0b; font-size: 0.9rem; letter-spacing: 1px; }

/* ── Features ── */
.features { padding: var(--spacing-24) var(--spacing-5); }
.section-head { text-align: center; max-width: 600px; margin: 0 auto var(--spacing-12); }
.section-label { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-primary); margin-bottom: var(--spacing-3); }
.section-head h2 { font-size: clamp(1.875rem, 4vw, 3rem); font-weight: 900; letter-spacing: -0.025em; line-height: 1.2; margin-bottom: var(--spacing-4); }
.section-head p { color: var(--color-text-muted); font-size: 1.0625rem; line-height: 1.7; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-5); max-width: 1100px; margin: 0 auto; }
.feature-card {
  padding: var(--spacing-7) var(--spacing-6); border-radius: var(--radius-xl);
  border: 1px solid var(--color-border); background: var(--color-surface);
  transition: all var(--transition-base); position: relative; overflow: hidden;
}
.feature-card::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 60%);
  opacity: 0; transition: opacity var(--transition-base);
}
.feature-card:hover::before { opacity: 1; }
.feature-card:hover { border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border)); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.feature-icon {
  width: 52px; height: 52px; border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary); display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--spacing-5); font-size: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
}
.feature-card h3 { font-size: 1.125rem; font-weight: 700; margin-bottom: var(--spacing-3); }
.feature-card p { color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.65; }

/* ── Social proof strip ── */
.proof-strip { padding: var(--spacing-12) var(--spacing-5); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); text-align: center; background: ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"}; }
.proof-strip p { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: var(--spacing-6); }
.logos { display: flex; gap: var(--spacing-8); justify-content: center; align-items: center; flex-wrap: wrap; }
.logo-item { font-size: 1.1rem; font-weight: 800; color: var(--color-text-muted); opacity: 0.5; letter-spacing: -0.02em; transition: opacity var(--transition-fast); cursor: default; }
.logo-item:hover { opacity: 0.85; }

/* ── CTA section ── */
.cta-section {
  padding: var(--spacing-24) var(--spacing-5); text-align: center;
  background: ${isDark ? `radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, ${accent} 15%, var(--color-bg)), var(--color-bg))` : `radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, ${accent} 10%, #f9f9ff), #f9f9ff)`};
}
.cta-card {
  max-width: 640px; margin: 0 auto;
  background: ${isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)"};
  backdrop-filter: blur(20px); border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)"};
  border-radius: var(--radius-2xl); padding: var(--spacing-12) var(--spacing-10);
  box-shadow: ${isDark ? "0 40px 80px rgba(0,0,0,0.4)" : "0 40px 80px rgba(0,0,0,0.08)"};
}
.cta-card h2 { font-size: clamp(1.875rem, 4vw, 2.75rem); font-weight: 900; letter-spacing: -0.025em; margin-bottom: var(--spacing-4); }
.cta-card p { color: var(--color-text-muted); font-size: 1.0625rem; margin-bottom: var(--spacing-7); line-height: 1.7; }

@media (max-width: 768px) {
  .features-grid { grid-template-columns: 1fr; }
  .hero-actions { flex-direction: column; align-items: center; }
  .hero-social-proof { flex-direction: column; gap: var(--spacing-2); }
}`;

  const features = [
    { icon: ICON.bolt,   title: "Lightning Fast",       desc: "Pages load in under 100ms globally with edge-optimized delivery and smart caching." },
    { icon: ICON.shield, title: "Enterprise Security",   desc: "SOC2-compliant infrastructure with end-to-end encryption and automatic threat detection." },
    { icon: ICON.trend,  title: "Real-time Analytics",  desc: "Live dashboards with intelligent recommendations to help you grow faster." },
    { icon: ICON.users,  title: "Team Collaboration",   desc: "Work together in real time with live cursors, comments, and role-based permissions." },
    { icon: ICON.star,   title: "99.99% Uptime SLA",    desc: "Redundant global infrastructure ensures your product is always available." },
    { icon: ICON.send,   title: "One-click Deploy",     desc: "Ship to production in seconds with zero-config CI/CD pipelines built in." },
  ];

  const body = `
${conditions.hasNavbar ? navbarHtml(title, isDark) : ""}

<section class="hero">
  <div class="hero-bg"><div class="hero-grid"></div></div>
  <div class="hero-inner">
    <div class="hero-badge anim-fade-in anim-visible"><span></span> Now with AI-powered generation</div>
    <h1 class="hero-h1 anim-fade-up anim-visible">Build beautiful web apps<br><span class="grad">10× faster</span></h1>
    <p class="hero-desc anim-fade-up anim-visible" style="--d:1">${desc}</p>
    <div class="hero-actions anim-fade-up anim-visible" style="--d:2">
      <a href="#" class="btn btn-primary btn-lg">Get started free ${ICON.arrow}</a>
      <a href="#features" class="btn btn-secondary btn-lg">See how it works</a>
    </div>
    <div class="hero-social-proof anim-fade-up anim-visible" style="--d:3">
      <div class="proof-avatars">
        <div class="proof-avatar">RS</div><div class="proof-avatar">PK</div>
        <div class="proof-avatar">AM</div><div class="proof-avatar">+</div>
      </div>
      <div><div class="proof-stars">★★★★★</div><div>Loved by 12,000+ developers</div></div>
    </div>
  </div>
</section>

<div class="proof-strip">
  <p>Trusted by teams at</p>
  <div class="logos">
    <span class="logo-item">Razorpay</span>
    <span class="logo-item">Zerodha</span>
    <span class="logo-item">CRED</span>
    <span class="logo-item">Meesho</span>
    <span class="logo-item">Swiggy</span>
    <span class="logo-item">Zomato</span>
  </div>
</div>

<section class="features" id="features">
  <div class="section-head anim-fade-up anim-visible">
    <div class="section-label">Features</div>
    <h2>Everything you need to ship</h2>
    <p>A complete toolkit for building, deploying, and scaling modern web experiences — without the complexity.</p>
  </div>
  <div class="features-grid">
    ${features.map((f, i) => `
    <div class="feature-card anim-fade-up anim-visible" style="--d:${(i % 3) + 1}">
      <div class="feature-icon">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>`).join("")}
  </div>
</section>

<section class="cta-section">
  <div class="cta-card anim-scale-in anim-visible">
    <h2>Ready to start building?</h2>
    <p>Join 12,000+ developers who are already shipping faster, smarter, and with confidence.</p>
    <div style="display:flex;gap:var(--spacing-3);justify-content:center;flex-wrap:wrap;">
      <a href="#" class="btn btn-primary btn-lg">Start for free — no card needed</a>
      <a href="#" class="btn btn-secondary btn-lg">Book a demo</a>
    </div>
    <p style="margin-top:var(--spacing-5);font-size:0.8125rem;color:var(--color-text-muted);">No credit card required · Free forever plan · Cancel anytime</p>
  </div>
</section>

${conditions.hasFooter ? footerHtml(title) : ""}`;

  return wrapHtml(title, styles, body);
}

// ─── 4. Form/Contact Page ──────────────────────────────────────────────────────

function generateFormPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Contact Us";
  const isDark = conditions.colorScheme === "dark";
  const accent = rules.colors.primary;

  const styles = `${baseStyles(rules)}
.form-page {
  min-height: 100dvh;
  background: ${isDark
    ? `radial-gradient(ellipse 60% 50% at 30% 30%, color-mix(in srgb, ${accent} 12%, transparent), transparent), var(--color-bg)`
    : `radial-gradient(ellipse 60% 50% at 30% 30%, color-mix(in srgb, ${accent} 8%, transparent), transparent), #f9f9ff`};
  display: grid; grid-template-columns: 1fr 1fr; min-height: 100dvh;
}
.form-info {
  padding: var(--spacing-16) var(--spacing-12);
  display: flex; flex-direction: column; justify-content: center;
}
.form-info h1 { font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 900; letter-spacing: -0.025em; line-height: 1.2; margin-bottom: var(--spacing-5); }
.form-info h1 span { background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.form-info p { color: var(--color-text-muted); font-size: 1.0625rem; line-height: 1.7; margin-bottom: var(--spacing-8); max-width: 400px; }
.contact-item { display: flex; align-items: center; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
.contact-icon { width: 44px; height: 44px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); display: flex; align-items: center; justify-content: center; color: var(--color-primary); flex-shrink: 0; }
.contact-label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.contact-value { font-size: 0.9375rem; font-weight: 600; margin-top: 1px; }
.form-panel {
  background: var(--color-surface); border-left: 1px solid var(--color-border);
  padding: var(--spacing-16) var(--spacing-10);
  display: flex; flex-direction: column; justify-content: center;
}
.form-panel h2 { font-size: 1.625rem; font-weight: 800; margin-bottom: var(--spacing-2); }
.form-panel .subtitle { color: var(--color-text-muted); font-size: 0.9375rem; margin-bottom: var(--spacing-7); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); }
.form-footer { margin-top: var(--spacing-5); display: flex; align-items: center; gap: var(--spacing-4); }
.form-footer .note { font-size: 0.8125rem; color: var(--color-text-muted); line-height: 1.5; }
.success-msg {
  display: none; text-align: center; padding: var(--spacing-8);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  border-radius: var(--radius-xl); margin-top: var(--spacing-5);
}
.success-msg.show { display: block; animation: scaleIn 0.4s cubic-bezier(0.4,0,0.2,1) both; }
.char-count { font-size: 0.75rem; color: var(--color-text-muted); text-align: right; margin-top: var(--spacing-1); }
.char-count.warn { color: var(--color-warning); }
@media (max-width: 900px) {
  .form-page { grid-template-columns: 1fr; }
  .form-info { padding: var(--spacing-10) var(--spacing-5); }
  .form-panel { border-left: none; border-top: 1px solid var(--color-border); padding: var(--spacing-8) var(--spacing-5); }
  .form-row { grid-template-columns: 1fr; }
}`;

  const body = `
${conditions.hasNavbar ? navbarHtml(title, isDark) : ""}
<div class="form-page">
  <div class="form-info anim-fade-up anim-visible">
    <h1>Let's <span>talk</span><br>about your project</h1>
    <p>Have an idea? We'd love to hear about it. Send us a message and we'll get back to you within one business day.</p>
    <div class="contact-item">
      <div class="contact-icon">${ICON.mail}</div>
      <div><div class="contact-label">Email</div><div class="contact-value">hello@example.com</div></div>
    </div>
    <div class="contact-item">
      <div class="contact-icon">${ICON.phone}</div>
      <div><div class="contact-label">Phone</div><div class="contact-value">+91 98765 43210</div></div>
    </div>
    <div class="contact-item">
      <div class="contact-icon">${ICON.users}</div>
      <div><div class="contact-label">Response time</div><div class="contact-value">Within 24 hours</div></div>
    </div>
  </div>

  <div class="form-panel anim-fade-up anim-visible" style="--d:1">
    <h2>Send a message</h2>
    <p class="subtitle">Fill in the form and we'll be in touch soon.</p>
    <form id="contactForm" novalidate>
      <div class="form-row">
        <div class="field"><label class="label" for="fname">First name</label><input class="input" type="text" id="fname" placeholder="Rahul" required></div>
        <div class="field"><label class="label" for="lname">Last name</label><input class="input" type="text" id="lname" placeholder="Sharma" required></div>
      </div>
      <div class="field"><label class="label" for="cemail">Email address</label><input class="input" type="email" id="cemail" placeholder="rahul@example.com" autocomplete="email" required></div>
      <div class="field"><label class="label" for="subject">Subject</label>
        <select class="input" id="subject">
          <option value="">Select a topic…</option>
          <option>General inquiry</option>
          <option>Product demo</option>
          <option>Partnership</option>
          <option>Technical support</option>
        </select>
      </div>
      <div class="field">
        <label class="label" for="message">Message</label>
        <textarea class="input" id="message" rows="5" placeholder="Tell us more about your project or question…" maxlength="500" oninput="document.getElementById('charCount').textContent=(500-this.value.length)+' characters left';document.getElementById('charCount').className='char-count'+(this.value.length>450?' warn':'');"></textarea>
        <div class="char-count" id="charCount">500 characters left</div>
      </div>
      <div class="form-footer">
        <button type="submit" class="btn btn-primary btn-lg">${ICON.send} Send message</button>
        <p class="note">We respect your privacy and will never share your information.</p>
      </div>
    </form>
    <div class="success-msg" id="successMsg">
      <div style="font-size:2.5rem;margin-bottom:var(--spacing-3);">${ICON.check}</div>
      <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:var(--spacing-2);">Message sent!</h3>
      <p style="color:var(--color-text-muted);">Thanks for reaching out. We'll get back to you within 24 hours.</p>
    </div>
  </div>
</div>
${conditions.hasFooter ? footerHtml(title) : ""}
<script>
document.getElementById('contactForm')?.addEventListener('submit',function(e){
  e.preventDefault();
  var btn=this.querySelector('button[type="submit"]');
  if(btn){btn.textContent='Sending…';btn.disabled=true;}
  setTimeout(function(){
    document.getElementById('contactForm').style.display='none';
    var s=document.getElementById('successMsg');
    if(s)s.classList.add('show');
  },1200);
});
</script>`;

  return wrapHtml(title, styles, body);
}

// ─── 5. Register Page ──────────────────────────────────────────────────────────

function generateRegisterPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Create Account";
  const isDark = conditions.colorScheme === "dark";
  const accent = rules.colors.primary;

  const styles = `${baseStyles(rules)}
.register-page {
  min-height: 100dvh; display: flex; align-items: center; justify-content: center;
  padding: var(--spacing-8) var(--spacing-5);
  background: ${isDark
    ? `radial-gradient(ellipse 80% 60% at 50% -20%, color-mix(in srgb, ${accent} 25%, transparent), transparent), var(--color-bg)`
    : `radial-gradient(ellipse 80% 60% at 50% -20%, color-mix(in srgb, ${accent} 15%, transparent), transparent), #f9f9ff`};
}
.register-card {
  width: 100%; max-width: 480px;
  background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)"};
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"};
  border-radius: var(--radius-2xl); padding: var(--spacing-10) var(--spacing-8);
  box-shadow: ${isDark ? "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" : "0 32px 80px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)"};
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.register-logo {
  width: 56px; height: 56px; border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; color: #fff; margin: 0 auto var(--spacing-5);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 40%, transparent);
}
.register-card h1 { font-size: 1.75rem; font-weight: 900; text-align: center; letter-spacing: -0.025em; margin-bottom: var(--spacing-2); }
.register-card .subtitle { text-align: center; color: var(--color-text-muted); font-size: 0.9375rem; margin-bottom: var(--spacing-6); }
.social-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3); margin-bottom: var(--spacing-5); }
.social-btn-sm {
  display: flex; align-items: center; justify-content: center; gap: var(--spacing-2);
  padding: var(--spacing-3); border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); background: var(--color-surface);
  font-size: 0.875rem; font-weight: 600; color: var(--color-text);
  cursor: pointer; transition: all var(--transition-fast);
}
.social-btn-sm:hover { border-color: var(--color-primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3); }

/* Password strength meter */
.pw-strength { margin-top: var(--spacing-2); }
.pw-bars { display: flex; gap: 4px; margin-bottom: 6px; }
.pw-bar { flex: 1; height: 3px; border-radius: 3px; background: var(--color-border); transition: background var(--transition-base); }
.pw-bar.weak   { background: var(--color-error); }
.pw-bar.fair   { background: var(--color-warning); }
.pw-bar.strong { background: var(--color-success); }
.pw-label { font-size: 0.75rem; color: var(--color-text-muted); transition: color var(--transition-base); }
.pw-label.weak   { color: var(--color-error); }
.pw-label.fair   { color: var(--color-warning); }
.pw-label.strong { color: var(--color-success); }

/* Terms */
.terms-row { display: flex; gap: var(--spacing-3); align-items: flex-start; margin: var(--spacing-5) 0; }
.checkbox { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--color-border); appearance: none; cursor: pointer; flex-shrink: 0; margin-top: 1px; transition: all var(--transition-fast); position: relative; }
.checkbox:checked { background: var(--color-primary); border-color: var(--color-primary); }
.checkbox:checked::after { content: ''; position: absolute; left: 5px; top: 2px; width: 5px; height: 9px; border: 2px solid #fff; border-top: none; border-left: none; transform: rotate(45deg); }
.terms-text { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.5; }
.terms-text a { color: var(--color-primary); font-weight: 500; }
.signin-prompt { text-align: center; margin-top: var(--spacing-5); color: var(--color-text-muted); font-size: 0.9rem; }
.signin-prompt a { color: var(--color-primary); font-weight: 600; }
@media (max-width: 520px) { .register-card { padding: var(--spacing-7) var(--spacing-5); } .form-row, .social-row { grid-template-columns: 1fr; } }`;

  const body = `
<div class="register-page">
  <div class="register-card">
    <div class="register-logo">✦</div>
    <h1>Create your account</h1>
    <p class="subtitle">Join 12,000+ developers — free forever</p>

    <div class="social-row">
      <button class="social-btn-sm">${ICON.google} Google</button>
      <button class="social-btn-sm">${ICON.github} GitHub</button>
    </div>

    <div class="divider">or sign up with email</div>

    <form id="registerForm" novalidate>
      <div class="form-row">
        <div class="field"><label class="label" for="rfname">First name</label><input class="input" type="text" id="rfname" placeholder="Rahul" autocomplete="given-name" required></div>
        <div class="field"><label class="label" for="rlname">Last name</label><input class="input" type="text" id="rlname" placeholder="Sharma" autocomplete="family-name" required></div>
      </div>
      <div class="field"><label class="label" for="remail">Email address</label><input class="input" type="email" id="remail" placeholder="you@example.com" autocomplete="email" required><div class="field-msg" id="remail-msg"></div></div>
      <div class="field">
        <label class="label" for="rpw">Password</label>
        <div class="input-with-icon">
          <input class="input" type="password" id="rpw" placeholder="Create a strong password" autocomplete="new-password" required oninput="checkPwStrength(this.value)">
          <button type="button" class="input-icon-btn" onclick="var el=document.getElementById('rpw');el.type=el.type==='password'?'text':'password';">${ICON.eye}</button>
        </div>
        <div class="pw-strength">
          <div class="pw-bars">
            <div class="pw-bar" id="bar1"></div>
            <div class="pw-bar" id="bar2"></div>
            <div class="pw-bar" id="bar3"></div>
            <div class="pw-bar" id="bar4"></div>
          </div>
          <div class="pw-label" id="pwLabel">Enter a password</div>
        </div>
      </div>
      <div class="field"><label class="label" for="rpw2">Confirm password</label><input class="input" type="password" id="rpw2" placeholder="Repeat your password" autocomplete="new-password" required><div class="field-msg" id="rpw2-msg"></div></div>

      <div class="terms-row">
        <input type="checkbox" class="checkbox" id="terms" required>
        <label class="terms-text" for="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand my data will be processed as described.</label>
      </div>

      <button type="submit" class="btn btn-primary btn-full btn-lg">Create account ${ICON.arrow}</button>
    </form>
    <p class="signin-prompt">Already have an account? <a href="#">Sign in</a></p>
  </div>
</div>

<script>
function checkPwStrength(pw){
  var bars=[document.getElementById('bar1'),document.getElementById('bar2'),document.getElementById('bar3'),document.getElementById('bar4')];
  var label=document.getElementById('pwLabel');
  if(!pw){ bars.forEach(function(b){b.className='pw-bar';}); label.textContent='Enter a password'; label.className='pw-label'; return; }
  var score=0;
  if(pw.length>=8) score++;
  if(pw.length>=12) score++;
  if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw)) score++;
  if(/[0-9]/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  var level=score<=1?'weak':score<=3?'fair':'strong';
  var count=score<=1?1:score<=3?2:score<=4?3:4;
  bars.forEach(function(b,i){ b.className='pw-bar'+(i<count?' '+level:''); });
  label.textContent=level==='weak'?'Weak — add numbers & symbols':level==='fair'?'Fair — add uppercase & symbols':'Strong password';
  label.className='pw-label '+level;
}
document.getElementById('registerForm')?.addEventListener('submit',function(e){
  e.preventDefault();
  var pw=document.getElementById('rpw').value,pw2=document.getElementById('rpw2').value;
  if(pw!==pw2){
    var el=document.getElementById('rpw2');
    el.classList.add('input-error');
    var msg=document.getElementById('rpw2-msg');
    msg.textContent='Passwords do not match.';msg.className='field-msg error';
    return;
  }
  if(!document.getElementById('terms').checked){ alert('Please agree to the terms.'); return; }
  var btn=this.querySelector('button[type="submit"]');
  if(btn){btn.textContent='Creating account…';btn.disabled=true;}
  setTimeout(function(){if(btn){btn.innerHTML='${ICON.check} Account created!';btn.style.background='var(--color-success)';}},1500);
});
</script>`;

  return wrapHtml(title, styles, body);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function generatePage(
  conditions: PageConditions,
  rules: ProjectRules,
  analysis?: UrlAnalysis | null
): string {
  switch (conditions.pageType) {
    case "login":     return generateLoginPage(conditions, rules, analysis);
    case "dashboard": return generateDashboardPage(conditions, rules, analysis);
    case "register":  return generateRegisterPage(conditions, rules, analysis);
    case "form":      return generateFormPage(conditions, rules, analysis);
    case "index":
    default:          return generateIndexPage(conditions, rules, analysis);
  }
}
