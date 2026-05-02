/**
 * Multi-File Project Template Engine
 * Generates complete, separated, production-ready project structures.
 *
 * Output structure per project:
 *   index.html        ← main entry (links to external CSS + JS)
 *   pages/            ← additional pages (linked from main)
 *   css/
 *     variables.css   ← design tokens only
 *     base.css        ← reset + base element styles + animations
 *     components.css  ← reusable UI components (btn, card, badge, form, nav)
 *     {pageType}.css  ← page-specific layout classes only
 *   js/
 *     utils.js        ← DOM helpers, toast, fetch wrapper
 *     validation.js   ← form validation helpers (if hasValidation)
 *     main.js         ← page init + event listeners
 *   assets/
 *     .gitkeep
 */

import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";
import type { UrlAnalysis } from "./urlAnalyzer.js";
import { generateCssVariables } from "./projectRuleEngine.js";

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export interface GeneratedProject {
  files: GeneratedFile[];
  entryPoint: string;
  pageType: string;
  title: string;
  combinedHtml: string;
}

// ─── CSS Layer ────────────────────────────────────────────────────────────────

function buildVariablesCss(rules: ProjectRules): string {
  return `/* =============================================
 * Design Tokens — CSS Custom Properties
 * Edit these to retheme the entire project.
 * ============================================= */
:root {
  ${generateCssVariables(rules)}
}
`.trim();
}

function buildBaseCss(): string {
  return `/* Base Styles — Reset + Element Defaults + Animations */
@import url('variables.css');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

img { max-width: 100%; display: block; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.animate-in        { animation: fadeIn 0.4s ease forwards; }
.animate-slide-in  { animation: slideInLeft 0.3s ease forwards; }
`.trim();
}

function buildComponentsCss(): string {
  return `/* Component Library — Reusable UI Elements */
@import url('variables.css');

/* ── Layout ─────────────────────────────────── */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-5);
}

.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-5); }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-5); }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-5); }

@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}

/* ── Buttons ─────────────────────────────────── */
button, .btn {
  cursor: pointer;
  font-family: inherit;
  border: none;
  outline: none;
  transition: all 0.2s ease;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  font-weight: 600;
  border: 1.5px solid transparent;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.btn-primary:hover {
  background: color-mix(in srgb, var(--color-primary) 85%, black);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.btn-secondary:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.btn:active { transform: translateY(0); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ── Forms ───────────────────────────────────── */
input, textarea, select {
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  border: 1.5px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-surface);
  color: var(--color-text);
  padding: var(--spacing-3) var(--spacing-4);
  width: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.form-error {
  font-size: 0.8rem;
  color: var(--color-error);
  margin-top: 2px;
  display: none;
}

.input-invalid { border-color: var(--color-error) !important; }
.input-valid   { border-color: var(--color-success) !important; }

/* ── Cards ───────────────────────────────────── */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--border-radius) * 1.5);
  padding: var(--spacing-5);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* ── Badges ──────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
.badge-warning { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
.badge-error   { background: color-mix(in srgb, var(--color-error)   15%, transparent); color: var(--color-error); }
.badge-primary { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }

/* ── Navigation ──────────────────────────────── */
.navbar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--spacing-5);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}
.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.navbar-logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}
.navbar-links { display: flex; align-items: center; gap: var(--spacing-4); }
.navbar-link  { color: var(--color-text-muted); font-size: 0.9rem; transition: color 0.2s; text-decoration: none; }
.navbar-link:hover { color: var(--color-text); text-decoration: none; }

/* ── Footer ──────────────────────────────────── */
.footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-7) var(--spacing-5);
  margin-top: var(--spacing-7);
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}
.footer-copy  { color: var(--color-text-muted); font-size: 0.875rem; }
.footer-links { display: flex; gap: var(--spacing-4); }
.footer-links a { color: var(--color-text-muted); font-size: 0.875rem; }

/* ── Tables ──────────────────────────────────── */
table { width: 100%; border-collapse: collapse; }
th {
  padding: var(--spacing-3) var(--spacing-5);
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: color-mix(in srgb, var(--color-surface) 50%, var(--color-bg));
}
td {
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--color-border);
  font-size: 0.9rem;
}
tr:hover td { background: color-mix(in srgb, var(--color-primary) 4%, transparent); }

/* ── Toast Notifications ─────────────────────── */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.toast {
  padding: 12px 20px;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.3s ease;
  max-width: 320px;
}
.toast-success { background: var(--color-success); color: #fff; }
.toast-error   { background: var(--color-error);   color: #fff; }
.toast-info    { background: var(--color-primary);  color: #fff; }
`.trim();
}

// ─── Page-specific CSS ────────────────────────────────────────────────────────

function buildLoginCss(): string {
  return `/* Login Page — Layout & Specific Styles */
@import url('variables.css');

.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: var(--spacing-5);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--spacing-7) var(--spacing-6);
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.4s ease;
}

.login-logo { text-align: center; margin-bottom: var(--spacing-6); }
.login-logo h1 { font-size: 1.75rem; font-weight: 800; color: var(--color-primary); }
.login-logo p  { color: var(--color-text-muted); font-size: 0.9rem; margin-top: 4px; }

.divider { display: flex; align-items: center; gap: var(--spacing-3); margin: var(--spacing-4) 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
.divider span { color: var(--color-text-muted); font-size: 0.8rem; }

.forgot-link { text-align: right; margin-bottom: var(--spacing-4); }
.forgot-link a { font-size: 0.8rem; color: var(--color-primary); }

.login-footer { text-align: center; margin-top: var(--spacing-4); font-size: 0.875rem; color: var(--color-text-muted); }

.social-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-5);
  border: 1.5px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.social-btn:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface)); }
`.trim();
}

function buildDashboardCss(): string {
  return `/* Dashboard Page — Layout & Specific Styles */
@import url('variables.css');

.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-logo {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--color-border);
}

.sidebar-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--border-radius);
  color: var(--color-text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.nav-item:hover, .nav-item.active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  text-decoration: none;
}

.nav-icon { font-size: 1rem; width: 20px; text-align: center; }

/* Main content */
.main-content {
  background: var(--color-bg);
  padding: var(--spacing-6);
  overflow-y: auto;
}

.page-header { margin-bottom: var(--spacing-6); }
.page-header h1 { font-size: 1.75rem; font-weight: 800; }
.page-header p  { color: var(--color-text-muted); margin-top: 4px; }

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--spacing-5);
  transition: all 0.2s;
}
.stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.stat-icon   { font-size: 1.5rem; margin-bottom: var(--spacing-3); }
.stat-label  { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value  { font-size: 2rem; font-weight: 800; margin-top: 4px; }
.stat-delta  { font-size: 0.8rem; color: var(--color-success); margin-top: 4px; }
.stat-delta.negative { color: var(--color-error); }

/* Table section */
.table-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: var(--spacing-5);
}
.table-header {
  padding: var(--spacing-4) var(--spacing-5);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.table-header h3 { font-weight: 700; }

/* Responsive */
@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
`.trim();
}

function buildIndexCss(): string {
  return `/* Landing Page — Layout & Specific Styles */
@import url('variables.css');

.hero {
  padding: var(--spacing-7) var(--spacing-5);
  text-align: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--color-primary) 8%, var(--color-bg)),
    var(--color-bg));
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-inner { max-width: 700px; margin: 0 auto; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: var(--spacing-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: var(--spacing-4);
}

.hero h1 span { color: var(--color-primary); }

.hero p {
  font-size: 1.15rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: var(--spacing-6);
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
}

.hero-buttons {
  display: flex;
  gap: var(--spacing-3);
  justify-content: center;
  flex-wrap: wrap;
}

.features-section { padding: var(--spacing-7) var(--spacing-5); }

.section-header { text-align: center; margin-bottom: var(--spacing-7); }
.section-header h2 { font-size: 2rem; font-weight: 800; }
.section-header p  { color: var(--color-text-muted); margin-top: var(--spacing-2); font-size: 1.05rem; }

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-5);
  max-width: 1100px;
  margin: 0 auto;
}

.feature-card {
  padding: var(--spacing-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: all 0.2s;
}
.feature-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: var(--spacing-4);
}

.feature-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: var(--spacing-2); }
.feature-card p  { color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.6; }

.cta-section {
  padding: var(--spacing-7) var(--spacing-5);
  text-align: center;
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg));
  border-top: 1px solid var(--color-border);
}

.cta-section h2 { font-size: 2rem; font-weight: 800; margin-bottom: var(--spacing-3); }
.cta-section p  { color: var(--color-text-muted); margin-bottom: var(--spacing-6); font-size: 1.05rem; }

@media (max-width: 768px) {
  .features-grid { grid-template-columns: 1fr; }
  .hero-buttons { flex-direction: column; align-items: center; }
}
`.trim();
}

function buildRegisterCss(): string {
  return `/* Register Page — Layout & Specific Styles */
@import url('variables.css');

.register-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-5);
  background: var(--color-bg);
}

.register-card {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--spacing-7) var(--spacing-6);
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.4s ease;
}

.register-card h1 { font-size: 1.75rem; font-weight: 800; text-align: center; margin-bottom: 4px; }
.register-subtitle { text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: var(--spacing-6); }

.name-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3); }

.password-strength {
  height: 4px;
  border-radius: 2px;
  margin-top: 6px;
  background: var(--color-border);
  overflow: hidden;
}
.password-strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
  width: 0%;
}

.terms-check { display: flex; align-items: flex-start; gap: var(--spacing-3); margin-bottom: var(--spacing-5); }
.terms-check input[type="checkbox"] { width: auto; margin-top: 2px; }
.terms-check label { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.5; cursor: pointer; }

.register-footer { text-align: center; margin-top: var(--spacing-4); font-size: 0.875rem; color: var(--color-text-muted); }

@media (max-width: 480px) {
  .name-row { grid-template-columns: 1fr; }
}
`.trim();
}

function buildFormCss(): string {
  return `/* Contact/Form Page — Layout & Specific Styles */
@import url('variables.css');

.form-page {
  min-height: 100vh;
  padding: var(--spacing-7) var(--spacing-5);
  background: var(--color-bg);
}

.form-container { max-width: 640px; margin: 0 auto; }
.form-container h1 { font-size: 2rem; font-weight: 800; margin-bottom: var(--spacing-2); }
.form-container > p { color: var(--color-text-muted); margin-bottom: var(--spacing-6); font-size: 1rem; }

.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); }

.form-success {
  display: none;
  text-align: center;
  padding: var(--spacing-7) var(--spacing-5);
}
.form-success .success-icon { font-size: 3rem; margin-bottom: var(--spacing-4); }
.form-success h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: var(--spacing-2); }
.form-success p  { color: var(--color-text-muted); }

.char-count { font-size: 0.75rem; color: var(--color-text-muted); text-align: right; margin-top: 4px; }

@media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
`.trim();
}

// ─── JS Layer ─────────────────────────────────────────────────────────────────

function buildUtilsJs(): string {
  return `/**
 * utils.js — Shared DOM Utilities & Helpers
 * Available on every page. Loaded before main.js.
 */

// ── DOM Shortcuts ─────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ── Toast Notification System ─────────────────
let _toastContainer = null;

function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = \`toast toast-\${type}\`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API Fetch Wrapper ─────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || \`Request failed: \${res.status}\`);
    }
    return res.json();
  } catch (err) {
    showToast(err.message || 'Something went wrong', 'error');
    throw err;
  }
}

// ── Local Storage Helpers ─────────────────────
const storage = {
  get: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* quota exceeded or private mode */ }
  },
  remove: (key) => localStorage.removeItem(key),
};

// ── Debounce ──────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Format Helpers ────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}
`.trim();
}

function buildValidationJs(): string {
  return `/**
 * validation.js — Form Validation Helpers
 * Provides real-time field validation with accessible error messaging.
 */

// ── Field-level validators ─────────────────────
function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePassword(value, minLength = 8) {
  return typeof value === 'string' && value.length >= minLength;
}

function validateRequired(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatePhone(value) {
  return /^[+]?[0-9]{7,15}$/.test(value.replace(/\\s/g, ''));
}

function validateUrl(value) {
  try { new URL(value); return true; }
  catch { return false; }
}

// ── UI helpers ────────────────────────────────
function showFieldError(inputEl, message) {
  inputEl.classList.add('input-invalid');
  inputEl.classList.remove('input-valid');
  let errEl = inputEl.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'form-error';
    inputEl.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
  errEl.style.display = 'block';
}

function clearFieldError(inputEl) {
  inputEl.classList.remove('input-invalid');
  inputEl.classList.add('input-valid');
  const errEl = inputEl.parentElement.querySelector('.form-error');
  if (errEl) errEl.style.display = 'none';
}

function resetFieldState(inputEl) {
  inputEl.classList.remove('input-invalid', 'input-valid');
  const errEl = inputEl.parentElement.querySelector('.form-error');
  if (errEl) errEl.style.display = 'none';
}

// ── Password strength ─────────────────────────
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–5
}

function updateStrengthBar(barEl, password) {
  const score = getPasswordStrength(password);
  const pct = (score / 5) * 100;
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];
  barEl.style.width = pct + '%';
  barEl.style.background = colors[Math.max(0, score - 1)] || colors[0];
}

// ── Attach real-time validation ───────────────
function attachLiveValidation(formEl, rules) {
  Object.entries(rules).forEach(([fieldId, { validator, message }]) => {
    const input = formEl.querySelector(\`#\${fieldId}\`);
    if (!input) return;
    const check = () => {
      if (!input.value) { resetFieldState(input); return; }
      if (validator(input.value)) clearFieldError(input);
      else showFieldError(input, message);
    };
    input.addEventListener('input', debounce(check, 400));
    input.addEventListener('blur', check);
  });
}

// ── Full form validation ──────────────────────
function validateForm(formEl, rules) {
  let isValid = true;
  Object.entries(rules).forEach(([fieldId, { validator, message }]) => {
    const input = formEl.querySelector(\`#\${fieldId}\`);
    if (!input) return;
    if (!validator(input.value)) {
      showFieldError(input, message);
      if (isValid) input.focus();
      isValid = false;
    } else {
      clearFieldError(input);
    }
  });
  return isValid;
}
`.trim();
}

function buildMainJs(pageType: string, conditions: PageConditions): string {
  if (pageType === "login") {
    return `/**
 * main.js — Login Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-btn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const RULES = {
    email: { validator: validateEmail, message: 'Please enter a valid email address.' },
    password: { validator: (v) => validatePassword(v, 6), message: 'Password must be at least 6 characters.' },
  };

  // Real-time validation
  ${conditions.hasValidation ? "attachLiveValidation(form, RULES);" : "// Validation disabled"}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    ${conditions.hasValidation ? `
    if (!validateForm(form, RULES)) return;
    ` : ""}

    // Loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      // TODO: Replace with your actual API endpoint
      // const data = await apiFetch('/api/auth/login', {
      //   method: 'POST',
      //   body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
      // });
      // storage.set('token', data.token);
      // window.location.href = '/dashboard.html';

      // Demo: simulate success
      await new Promise((r) => setTimeout(r, 1500));
      showToast('Signed in successfully!', 'success');
      setTimeout(() => { submitBtn.textContent = 'Sign In'; submitBtn.disabled = false; }, 1500);
    } catch (err) {
      submitBtn.textContent = 'Sign In';
      submitBtn.disabled = false;
    }
  });

  // Social login buttons
  document.querySelectorAll('.social-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      showToast('Social login — connect your OAuth provider here.', 'info');
    });
  });
});
`.trim();
  }

  if (pageType === "dashboard") {
    return `/**
 * main.js — Dashboard Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Active nav item ──────────────────────────
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // ── Animate stat cards ────────────────────────
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.style.animationDelay = \`\${i * 0.1}s\`;
    card.classList.add('animate-in');
  });

  // ── Fake real-time data refresh ───────────────
  // TODO: Replace with actual API calls
  // async function loadStats() {
  //   const data = await apiFetch('/api/dashboard/stats');
  //   document.getElementById('stat-users').textContent = data.totalUsers.toLocaleString();
  // }
  // loadStats();
  // setInterval(loadStats, 30000);

  // ── Table row click ───────────────────────────
  document.querySelectorAll('tbody tr').forEach((row) => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      showToast('Row clicked — add your detail view here.', 'info');
    });
  });

  // ── Search (if present) ───────────────────────
  const searchInput = document.getElementById('table-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const query = searchInput.value.toLowerCase();
      document.querySelectorAll('tbody tr').forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    }, 300));
  }

  showToast('Dashboard loaded!', 'success');
});
`.trim();
  }

  if (pageType === "register") {
    return `/**
 * main.js — Register Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-btn');
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strength-bar');
  const confirmInput = document.getElementById('confirm-password');

  const RULES = {
    'first-name': { validator: validateRequired, message: 'First name is required.' },
    email:        { validator: validateEmail,    message: 'Enter a valid email address.' },
    password:     { validator: (v) => validatePassword(v, 8), message: 'Password must be at least 8 characters.' },
    'confirm-password': {
      validator: (v) => v === passwordInput.value,
      message: 'Passwords do not match.',
    },
  };

  ${conditions.hasValidation ? "attachLiveValidation(form, RULES);" : ""}

  // Password strength meter
  if (passwordInput && strengthBar) {
    passwordInput.addEventListener('input', () => {
      updateStrengthBar(strengthBar, passwordInput.value);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ${conditions.hasValidation ? "if (!validateForm(form, RULES)) return;" : ""}

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      // TODO: Replace with actual API call
      // await apiFetch('/api/auth/register', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     firstName: form.querySelector('#first-name').value,
      //     email: form.querySelector('#email').value,
      //     password: passwordInput.value,
      //   }),
      // });
      // window.location.href = '/pages/login.html';

      await new Promise((r) => setTimeout(r, 1500));
      showToast('Account created! Redirecting to login...', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } catch {
      submitBtn.textContent = 'Create Account';
      submitBtn.disabled = false;
    }
  });
});
`.trim();
  }

  if (pageType === "form") {
    return `/**
 * main.js — Contact Form Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const formCard = document.getElementById('form-card');
  const successView = document.getElementById('form-success');
  const msgInput = document.getElementById('message');
  const charCount = document.getElementById('char-count');

  // Character counter for message field
  if (msgInput && charCount) {
    msgInput.addEventListener('input', () => {
      charCount.textContent = \`\${msgInput.value.length}/500 characters\`;
    });
  }

  const RULES = {
    'first-name': { validator: validateRequired, message: 'First name is required.' },
    email:        { validator: validateEmail,    message: 'Enter a valid email address.' },
    subject:      { validator: validateRequired, message: 'Subject is required.' },
    message:      { validator: (v) => v.trim().length >= 10, message: 'Message must be at least 10 characters.' },
  };

  attachLiveValidation(form, RULES);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form, RULES)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      // TODO: Replace with actual API or form service
      // await apiFetch('/api/contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });

      await new Promise((r) => setTimeout(r, 1500));
      formCard.style.display = 'none';
      successView.style.display = 'block';
    } catch {
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
    }
  });
});
`.trim();
  }

  // Default: index/landing page
  return `/**
 * main.js — Landing Page Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Smooth scroll for anchor links ────────────
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Animate feature cards on scroll ──────────
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.feature-card').forEach((card) => observer.observe(card));

  // ── CTA buttons ───────────────────────────────
  document.querySelectorAll('[data-cta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showToast('Get started — connect your sign-up flow here.', 'info');
    });
  });

  // ── Navbar scroll effect ──────────────────────
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.boxShadow = window.scrollY > 20 ? 'var(--shadow-md)' : 'none';
    });
  }
});
`.trim();
}

// ─── HTML Builders ────────────────────────────────────────────────────────────

function buildHtmlDoc(
  title: string,
  pageType: string,
  bodyContent: string,
  hasValidation: boolean,
  extraCssPath?: string
): string {
  const cssLinks = [
    '<link rel="stylesheet" href="css/base.css">',
    '<link rel="stylesheet" href="css/components.css">',
    ...(extraCssPath ? [`<link rel="stylesheet" href="${extraCssPath}">`] : []),
  ].join("\n  ");

  const jsLinks = [
    '<script src="js/utils.js"></script>',
    ...(hasValidation ? ['<script src="js/validation.js"></script>'] : []),
    '<script src="js/main.js"></script>',
  ].join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title} — Generated by AgentOS">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${cssLinks}
</head>
<body>
${bodyContent}
  ${jsLinks}
</body>
</html>`;
}

function buildNavbarHtml(title: string): string {
  return `<nav class="navbar">
  <div class="navbar-inner">
    <a href="index.html" class="navbar-logo">${title}</a>
    <div class="navbar-links">
      <a href="#features" class="navbar-link">Features</a>
      <a href="#about" class="navbar-link">About</a>
      <a href="pages/contact.html" class="navbar-link">Contact</a>
      <a href="pages/login.html" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.875rem;">Sign In</a>
    </div>
  </div>
</nav>`;
}

function buildFooterHtml(title: string): string {
  return `<footer class="footer">
  <div class="footer-inner">
    <span style="font-weight: 700; font-size: 1.1rem; color: var(--color-primary);">${title}</span>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
    <div class="footer-links">
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
      <a href="pages/contact.html">Contact</a>
    </div>
  </div>
</footer>`;
}

// ─── Page body builders ───────────────────────────────────────────────────────

function buildLoginBody(conditions: PageConditions, title: string): string {
  return `
<div class="login-root">
  <div class="login-card">
    <div class="login-logo">
      <h1>${title}</h1>
      <p>Welcome back! Please sign in to continue.</p>
    </div>
    <form id="login-form">
      <div class="form-group">
        <label class="form-label" for="email">Email Address</label>
        <input type="email" id="email" placeholder="you@example.com" autocomplete="email" required>
        <span class="form-error" id="email-err"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input type="password" id="password" placeholder="••••••••" autocomplete="current-password" required>
        <span class="form-error" id="pass-err"></span>
      </div>
      <div class="forgot-link">
        <a href="#">Forgot password?</a>
      </div>
      <button type="submit" id="login-btn" class="btn btn-primary" style="width:100%;padding:var(--spacing-4);">
        Sign In
      </button>
    </form>
    <div class="divider"><span>or continue with</span></div>
    <button class="social-btn" type="button">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.8 39.8 16.4 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.7 4.6-5 6l6.2 5.2C40.6 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
      Continue with Google
    </button>
    <p class="login-footer">Don't have an account? <a href="pages/register.html">Sign up free</a></p>
  </div>
</div>`.trim();
}

function buildDashboardBody(title: string): string {
  return `
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">${title}</div>

    <span class="sidebar-section-label">Main</span>
    <a href="index.html" class="nav-item active"><span class="nav-icon">📊</span> Overview</a>
    <a href="pages/analytics.html" class="nav-item"><span class="nav-icon">📈</span> Analytics</a>
    <a href="pages/users.html" class="nav-item"><span class="nav-icon">👥</span> Users</a>
    <a href="pages/projects.html" class="nav-item"><span class="nav-icon">📁</span> Projects</a>

    <span class="sidebar-section-label">System</span>
    <a href="pages/settings.html" class="nav-item"><span class="nav-icon">⚙️</span> Settings</a>
    <a href="#" class="nav-item" style="margin-top: auto;"><span class="nav-icon">🚪</span> Logout</a>
  </aside>

  <main class="main-content">
    <div class="page-header">
      <h1>Good morning! 👋</h1>
      <p>Here's what's happening with your projects today.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Total Users</div>
        <div class="stat-value" id="stat-users">12,430</div>
        <div class="stat-delta">↑ 12.5% from last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Revenue</div>
        <div class="stat-value">$48.2k</div>
        <div class="stat-delta">↑ 8.3% from last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">284</div>
        <div class="stat-delta">↑ 3 new this week</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-value">3.24%</div>
        <div class="stat-delta">↑ 0.4% from last week</div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-header">
        <h3>Recent Activity</h3>
        <input type="text" id="table-search" placeholder="Search..." style="width:220px;padding:6px 12px;font-size:0.85rem;">
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Action</th><th>Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Rahul Sharma</td><td>Created project</td><td>2 min ago</td><td><span class="badge badge-success">Active</span></td></tr>
          <tr><td>Priya Singh</td><td>Updated profile</td><td>15 min ago</td><td><span class="badge badge-success">Active</span></td></tr>
          <tr><td>Amit Kumar</td><td>Submitted report</td><td>1 hour ago</td><td><span class="badge badge-warning">Pending</span></td></tr>
          <tr><td>Neha Gupta</td><td>Deleted record</td><td>3 hours ago</td><td><span class="badge badge-error">Archived</span></td></tr>
          <tr><td>Vikram Patel</td><td>Logged in</td><td>5 hours ago</td><td><span class="badge badge-success">Active</span></td></tr>
        </tbody>
      </table>
    </div>
  </main>
</div>`.trim();
}

function buildIndexBody(conditions: PageConditions, title: string, desc: string): string {
  const navbar = conditions.hasNavbar ? buildNavbarHtml(title) : "";
  const footer = conditions.hasFooter ? buildFooterHtml(title) : "";
  return `${navbar}
<section class="hero">
  <div class="hero-inner animate-in">
    <div class="hero-badge">✨ Now in Public Beta</div>
    <h1>Build faster,<br><span>${title}</span></h1>
    <p>${desc}</p>
    <div class="hero-buttons">
      <a href="pages/register.html" class="btn btn-primary" style="padding:14px 32px;font-size:1rem;" data-cta>Get Started Free</a>
      <a href="#features" class="btn btn-secondary" style="padding:14px 32px;font-size:1rem;">See Features</a>
    </div>
  </div>
</section>

<section class="features-section" id="features">
  <div class="section-header">
    <h2>Everything you need</h2>
    <p>Powerful features to help you build and scale faster than ever.</p>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">⚡</div>
      <h3>Lightning Fast</h3>
      <p>Optimized for performance from the ground up. Load times under 1 second on average.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔒</div>
      <h3>Secure by Default</h3>
      <p>Enterprise-grade security with end-to-end encryption and compliance built in from day one.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🎯</div>
      <h3>Smart Analytics</h3>
      <p>Real-time insights and intelligent recommendations to help you grow your business.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔌</div>
      <h3>Easy Integration</h3>
      <p>Connect with 200+ tools and services in minutes with our plug-and-play API system.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📱</div>
      <h3>Mobile Ready</h3>
      <p>Responsive design that works perfectly on any device, screen size, or orientation.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🚀</div>
      <h3>Scale Instantly</h3>
      <p>Auto-scaling infrastructure that grows with your traffic — no extra configuration needed.</p>
    </div>
  </div>
</section>

<section class="cta-section">
  <h2>Ready to get started?</h2>
  <p>Join thousands of teams already building with us.</p>
  <a href="pages/register.html" class="btn btn-primary" style="padding:14px 36px;font-size:1.05rem;" data-cta>Create Free Account</a>
</section>
${footer}`.trim();
}

function buildRegisterBody(conditions: PageConditions, title: string): string {
  return `
<div class="register-root">
  <div class="register-card">
    <h1>Create your account</h1>
    <p class="register-subtitle">Join thousands of users today. No credit card required.</p>
    <form id="register-form">
      <div class="name-row">
        <div class="form-group">
          <label class="form-label" for="first-name">First Name</label>
          <input type="text" id="first-name" placeholder="Rahul" required>
          <span class="form-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="last-name">Last Name</label>
          <input type="text" id="last-name" placeholder="Sharma">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="email">Email Address</label>
        <input type="email" id="email" placeholder="you@example.com" required>
        <span class="form-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input type="password" id="password" placeholder="Min 8 characters" required>
        <span class="form-error"></span>
        <div class="password-strength">
          <div class="password-strength-bar" id="strength-bar"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="confirm-password">Confirm Password</label>
        <input type="password" id="confirm-password" placeholder="Repeat password" required>
        <span class="form-error"></span>
      </div>
      <div class="terms-check">
        <input type="checkbox" id="terms" required>
        <label for="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
      </div>
      <button type="submit" id="register-btn" class="btn btn-primary" style="width:100%;padding:var(--spacing-4);">
        Create Account
      </button>
    </form>
    <p class="register-footer">Already have an account? <a href="login.html">Sign in</a></p>
  </div>
</div>`.trim();
}

function buildFormBody(conditions: PageConditions, title: string): string {
  const navbar = conditions.hasNavbar ? buildNavbarHtml(title) : "";
  const footer = conditions.hasFooter ? buildFooterHtml(title) : "";
  return `${navbar}
<div class="form-page">
  <div class="form-container animate-in">
    <h1>${title}</h1>
    <p>Fill out the form below and we'll get back to you within 24 hours.</p>
    <div class="form-card" id="form-card">
      <form id="contact-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="first-name">First Name</label>
            <input type="text" id="first-name" placeholder="Rahul" required>
            <span class="form-error"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="last-name">Last Name</label>
            <input type="text" id="last-name" placeholder="Sharma">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <input type="email" id="email" placeholder="you@example.com" required>
          <span class="form-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="subject">Subject</label>
          <input type="text" id="subject" placeholder="How can we help?" required>
          <span class="form-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="message">Message</label>
          <textarea id="message" rows="5" placeholder="Tell us more..." required></textarea>
          <span class="form-error"></span>
          <p class="char-count" id="char-count">0/500 characters</p>
        </div>
        <button type="submit" id="submit-btn" class="btn btn-primary" style="width:100%;padding:var(--spacing-4);">
          Send Message
        </button>
      </form>
    </div>
    <div class="form-success" id="form-success">
      <div class="success-icon">✅</div>
      <h3>Message Sent!</h3>
      <p>Thank you for reaching out. We'll get back to you within 24 hours.</p>
    </div>
  </div>
</div>
${footer}`.trim();
}

// ─── Extra pages ──────────────────────────────────────────────────────────────

function buildRegisterPage(title: string, conditions: PageConditions, rules: ProjectRules): GeneratedFile {
  const body = buildRegisterBody(conditions, "Create Account");
  const content = buildHtmlDoc("Create Account — " + title, "register", body, true, "css/register.css");
  return { path: "pages/register.html", content, description: "Registration page linked from login" };
}

function buildLoginPage(title: string, conditions: PageConditions, rules: ProjectRules): GeneratedFile {
  const body = buildLoginBody(conditions, "Sign In");
  const content = buildHtmlDoc("Sign In — " + title, "login", body, true, "css/login.css");
  return { path: "pages/login.html", content, description: "Login page linked from register and dashboard" };
}

function buildSimplePage(title: string, heading: string, content: string, backPath: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading} — ${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${backPath}css/base.css">
  <link rel="stylesheet" href="${backPath}css/components.css">
</head>
<body>
  <nav class="navbar">
    <div class="navbar-inner">
      <a href="${backPath}index.html" class="navbar-logo">${title}</a>
      <div class="navbar-links">
        <a href="${backPath}index.html" class="navbar-link">← Back to Home</a>
      </div>
    </div>
  </nav>
  <div style="max-width:700px;margin:80px auto;padding:0 24px;" class="animate-in">
    <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;">${heading}</h1>
    ${content}
  </div>
  <script src="${backPath}js/utils.js"></script>
</body>
</html>`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateStructuredProject(
  conditions: PageConditions,
  rules: ProjectRules,
  analysis?: UrlAnalysis | null
): GeneratedProject {
  const pageType = conditions.pageType;
  const title = analysis?.title || pageTitleMap[pageType] || "My App";
  const desc = analysis?.description || "Build something amazing with our platform.";

  const files: GeneratedFile[] = [];

  // ── CSS files (always present) ────────────────────────────────────────────
  files.push({ path: "css/variables.css", content: buildVariablesCss(rules), description: "Design tokens — edit to retheme" });
  files.push({ path: "css/base.css",      content: buildBaseCss(),           description: "Reset + base element styles + animations" });
  files.push({ path: "css/components.css",content: buildComponentsCss(),     description: "Reusable UI component library" });

  // ── JS files ──────────────────────────────────────────────────────────────
  files.push({ path: "js/utils.js",       content: buildUtilsJs(),                      description: "DOM helpers, toast, fetch wrapper" });
  if (conditions.hasValidation) {
    files.push({ path: "js/validation.js", content: buildValidationJs(), description: "Form validation helpers" });
  }
  files.push({ path: "js/main.js",        content: buildMainJs(pageType, conditions),   description: "Page initialization and event listeners" });

  // ── Assets placeholder ────────────────────────────────────────────────────
  files.push({ path: "assets/.gitkeep",   content: "# Place your images, icons, and fonts here\n", description: "Assets directory placeholder" });

  // ── Page-specific CSS + HTML ──────────────────────────────────────────────
  let indexHtmlBody = "";
  let pageCssContent = "";
  let pageCssPath = `css/${pageType}.css`;

  switch (pageType) {
    case "login": {
      pageCssContent = buildLoginCss();
      indexHtmlBody = buildLoginBody(conditions, title);
      // Also generate register page
      files.push(buildRegisterPage(title, conditions, rules));
      files.push({ path: "css/register.css", content: buildRegisterCss(), description: "Register page styles" });
      break;
    }
    case "register": {
      pageCssContent = buildRegisterCss();
      indexHtmlBody = buildRegisterBody(conditions, title);
      // Also generate login page
      files.push(buildLoginPage(title, conditions, rules));
      files.push({ path: "css/login.css", content: buildLoginCss(), description: "Login page styles" });
      break;
    }
    case "dashboard": {
      pageCssContent = buildDashboardCss();
      indexHtmlBody = buildDashboardBody(title);
      // Extra pages
      files.push({
        path: "pages/users.html",
        content: buildSimplePage(title, "Users", '<p style="color:var(--color-text-muted)">User management table goes here. Connect to your API to load real user data.</p>', "../"),
        description: "Users management page"
      });
      files.push({
        path: "pages/analytics.html",
        content: buildSimplePage(title, "Analytics", '<p style="color:var(--color-text-muted)">Charts and analytics go here. Integrate Chart.js or your preferred charting library.</p>', "../"),
        description: "Analytics page"
      });
      files.push({
        path: "pages/settings.html",
        content: buildSimplePage(title, "Settings", '<p style="color:var(--color-text-muted)">Settings and configuration forms go here.</p>', "../"),
        description: "Settings page"
      });
      files.push({
        path: "pages/projects.html",
        content: buildSimplePage(title, "Projects", '<p style="color:var(--color-text-muted)">Project listing and management goes here.</p>', "../"),
        description: "Projects page"
      });
      files.push(buildLoginPage(title, conditions, rules));
      files.push({ path: "css/login.css", content: buildLoginCss(), description: "Login page styles" });
      break;
    }
    case "form": {
      pageCssContent = buildFormCss();
      indexHtmlBody = buildFormBody(conditions, title);
      break;
    }
    case "index":
    default: {
      pageCssContent = buildIndexCss();
      indexHtmlBody = buildIndexBody(conditions, title, desc);
      pageCssPath = "css/index.css";
      // Extra pages
      files.push({
        path: "pages/about.html",
        content: buildSimplePage(title, "About Us", '<p style="color:var(--color-text-muted)">Your company story and team details go here.</p>', "../"),
        description: "About page"
      });
      files.push({
        path: "pages/contact.html",
        content: buildSimplePage(title, "Contact Us", '<p style="color:var(--color-text-muted)">Contact form goes here.</p>', "../"),
        description: "Contact page"
      });
      files.push({
        path: "pages/register.html",
        content: buildSimplePage(title, "Sign Up", '<p style="color:var(--color-text-muted);margin-bottom:24px;">Create your account.</p><a href="../index.html" class="btn btn-primary">Back to Home</a>', "../"),
        description: "Registration page stub"
      });
      files.push({
        path: "pages/login.html",
        content: buildSimplePage(title, "Sign In", '<p style="color:var(--color-text-muted);margin-bottom:24px;">Welcome back!</p><a href="../index.html" class="btn btn-primary">Back to Home</a>', "../"),
        description: "Login page stub"
      });
      break;
    }
  }

  files.push({ path: pageCssPath, content: pageCssContent, description: `${pageType} page–specific styles` });

  // ── index.html ────────────────────────────────────────────────────────────
  const indexHtml = buildHtmlDoc(title, pageType, indexHtmlBody, conditions.hasValidation, pageCssPath);
  files.push({ path: "index.html", content: indexHtml, description: "Main HTML entry point" });

  // ── Combined HTML (for validation scoring) ────────────────────────────────
  const allCss = [
    buildVariablesCss(rules),
    buildBaseCss(),
    buildComponentsCss(),
    pageCssContent,
  ].join("\n\n");

  const allJs = [
    buildUtilsJs(),
    ...(conditions.hasValidation ? [buildValidationJs()] : []),
    buildMainJs(pageType, conditions),
  ].join("\n\n");

  const combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${allCss}</style>
</head>
<body>
${indexHtmlBody}
<script>${allJs}</script>
</body>
</html>`;

  return { files, entryPoint: "index.html", pageType, title, combinedHtml };
}

const pageTitleMap: Record<string, string> = {
  login: "Sign In",
  dashboard: "Dashboard",
  index: "Home",
  register: "Create Account",
  form: "Contact Us",
  profile: "My Profile",
  gallery: "Gallery",
};
