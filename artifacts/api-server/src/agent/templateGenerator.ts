import type { PageConditions } from "./conditionEngine.js";
import type { ProjectRules } from "./projectRuleEngine.js";
import { generateCssVariables } from "./projectRuleEngine.js";
import type { UrlAnalysis } from "./urlAnalyzer.js";

function baseStyles(rules: ProjectRules): string {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  ${generateCssVariables(rules)}
}
html { font-size: 16px; scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; display: block; }
button {
  cursor: pointer;
  font-family: inherit;
  border: none;
  outline: none;
  transition: all 0.2s ease;
}
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
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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
.form-group { display: flex; flex-direction: column; gap: var(--spacing-2); margin-bottom: var(--spacing-4); }
.form-label { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }
.form-error { font-size: 0.8rem; color: var(--color-error); margin-top: 2px; }
.container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 var(--spacing-5); }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-5); }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-5); }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-5); }
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.animate-in { animation: fadeIn 0.4s ease forwards; }
`.trim();
}

function navbarHtml(rules: ProjectRules, title: string): string {
  return `
<nav style="background:var(--color-surface);border-bottom:1px solid var(--color-border);padding:0 var(--spacing-5);position:sticky;top:0;z-index:100;backdrop-filter:blur(8px);">
  <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px;">
    <a href="/" style="font-size:1.25rem;font-weight:700;color:var(--color-primary);text-decoration:none;">${title}</a>
    <div style="display:flex;align-items:center;gap:var(--spacing-4);">
      <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Home</a>
      <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">Features</a>
      <a href="#" style="color:var(--color-text-muted);font-size:0.9rem;transition:color 0.2s;" onmouseover="this.style.color='var(--color-text)'" onmouseout="this.style.color='var(--color-text-muted)'">About</a>
      <button class="btn btn-primary" style="padding:var(--spacing-2) var(--spacing-4);font-size:0.875rem;">Get Started</button>
    </div>
  </div>
</nav>`.trim();
}

function footerHtml(title: string): string {
  return `
<footer style="background:var(--color-surface);border-top:1px solid var(--color-border);padding:var(--spacing-7) var(--spacing-5);margin-top:var(--spacing-7);">
  <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-4);">
    <span style="font-weight:700;font-size:1.1rem;color:var(--color-primary);">${title}</span>
    <p style="color:var(--color-text-muted);font-size:0.875rem;">&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
    <div style="display:flex;gap:var(--spacing-4);">
      <a href="#" style="color:var(--color-text-muted);font-size:0.875rem;">Privacy</a>
      <a href="#" style="color:var(--color-text-muted);font-size:0.875rem;">Terms</a>
      <a href="#" style="color:var(--color-text-muted);font-size:0.875rem;">Contact</a>
    </div>
  </div>
</footer>`.trim();
}

function wrapHtml(title: string, styles: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
${styles}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function generateLoginPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Sign In";
  const styles = `${baseStyles(rules)}
.login-root { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--color-bg); padding:var(--spacing-5); }
.login-card { width:100%; max-width:420px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:16px; padding:var(--spacing-7) var(--spacing-6); box-shadow:var(--shadow-lg); animation:fadeIn 0.4s ease; }
.login-logo { text-align:center; margin-bottom:var(--spacing-6); }
.login-logo h1 { font-size:1.75rem; font-weight:800; color:var(--color-primary); }
.login-logo p { color:var(--color-text-muted); font-size:0.9rem; margin-top:4px; }
.login-form h2 { font-size:1.25rem; font-weight:700; margin-bottom:var(--spacing-5); text-align:center; }
.divider { display:flex; align-items:center; gap:var(--spacing-3); margin:var(--spacing-4) 0; }
.divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--color-border); }
.divider span { color:var(--color-text-muted); font-size:0.8rem; }
.forgot-link { text-align:right; margin-top:-var(--spacing-2); margin-bottom:var(--spacing-4); }
.forgot-link a { font-size:0.8rem; color:var(--color-primary); }
.signup-link { text-align:center; margin-top:var(--spacing-4); font-size:0.875rem; color:var(--color-text-muted); }
.input-invalid { border-color:var(--color-error) !important; }
.error-msg { color:var(--color-error); font-size:0.8rem; margin-top:4px; display:none; }
`;

  const validationScript = conditions.hasValidation ? `
<script>
function validateLogin(e) {
  e.preventDefault();
  let valid = true;
  const email = document.getElementById('email');
  const emailErr = document.getElementById('email-err');
  const password = document.getElementById('password');
  const passErr = document.getElementById('pass-err');
  if (!email.value || !/^[^@]+@[^@]+\\.[^@]+$/.test(email.value)) {
    email.classList.add('input-invalid');
    emailErr.style.display = 'block';
    valid = false;
  } else {
    email.classList.remove('input-invalid');
    emailErr.style.display = 'none';
  }
  if (!password.value || password.value.length < 6) {
    password.classList.add('input-invalid');
    passErr.style.display = 'block';
    valid = false;
  } else {
    password.classList.remove('input-invalid');
    passErr.style.display = 'none';
  }
  if (valid) {
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Signing in...';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Sign In'; btn.disabled = false; }, 2000);
  }
}
</script>` : "";

  const body = `
<div class="login-root">
  <div class="login-card">
    <div class="login-logo">
      <h1>${title}</h1>
      <p>Welcome back! Please sign in to continue.</p>
    </div>
    <div class="login-form">
      <form onsubmit="${conditions.hasValidation ? 'validateLogin(event)' : 'return false'}">
        <div class="form-group">
          <label class="form-label" for="email">Email Address</label>
          <input type="email" id="email" placeholder="you@example.com" autocomplete="email">
          <span class="error-msg" id="email-err">Please enter a valid email address.</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input type="password" id="password" placeholder="••••••••" autocomplete="current-password">
          <span class="error-msg" id="pass-err">Password must be at least 6 characters.</span>
        </div>
        ${conditions.hasValidation ? '<div class="forgot-link"><a href="#">Forgot password?</a></div>' : ''}
        <button type="submit" id="login-btn" class="btn btn-primary" style="width:100%;margin-top:var(--spacing-3);padding:var(--spacing-4);">Sign In</button>
      </form>
      <div class="divider"><span>or</span></div>
      <button class="btn btn-secondary" style="width:100%;">Continue with Google</button>
      <p class="signup-link">Don't have an account? <a href="#">Sign up free</a></p>
    </div>
  </div>
</div>
${validationScript}`;

  return wrapHtml(title, styles, body);
}

function generateDashboardPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Dashboard";
  const styles = `${baseStyles(rules)}
.layout { display:grid; grid-template-columns:260px 1fr; min-height:100vh; }
.sidebar { background:var(--color-surface); border-right:1px solid var(--color-border); padding:var(--spacing-5); display:flex; flex-direction:column; gap:var(--spacing-3); position:sticky; top:0; height:100vh; overflow-y:auto; }
.sidebar-logo { font-size:1.2rem; font-weight:800; color:var(--color-primary); margin-bottom:var(--spacing-4); padding-bottom:var(--spacing-4); border-bottom:1px solid var(--color-border); }
.nav-item { display:flex; align-items:center; gap:var(--spacing-3); padding:var(--spacing-3) var(--spacing-4); border-radius:var(--border-radius); color:var(--color-text-muted); font-size:0.9rem; font-weight:500; cursor:pointer; transition:all 0.2s; text-decoration:none; }
.nav-item:hover,.nav-item.active { background:color-mix(in srgb,var(--color-primary) 12%,transparent); color:var(--color-primary); }
.main { background:var(--color-bg); padding:var(--spacing-6); overflow-y:auto; }
.page-header { margin-bottom:var(--spacing-6); }
.page-header h1 { font-size:1.75rem; font-weight:800; }
.page-header p { color:var(--color-text-muted); margin-top:4px; }
.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--spacing-4); margin-bottom:var(--spacing-6); }
.stat-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:var(--spacing-5); }
.stat-label { font-size:0.8rem; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; }
.stat-value { font-size:2rem; font-weight:800; margin-top:4px; color:var(--color-text); }
.stat-delta { font-size:0.8rem; color:var(--color-success); margin-top:4px; }
.table-section { background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; overflow:hidden; }
.table-header { padding:var(--spacing-4) var(--spacing-5); border-bottom:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center; }
.table-header h3 { font-weight:700; }
table { width:100%; border-collapse:collapse; }
th { padding:var(--spacing-3) var(--spacing-5); text-align:left; font-size:0.8rem; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; background:color-mix(in srgb,var(--color-surface) 50%,var(--color-bg)); }
td { padding:var(--spacing-4) var(--spacing-5); border-top:1px solid var(--color-border); font-size:0.9rem; }
tr:hover td { background:color-mix(in srgb,var(--color-primary) 4%,transparent); }
.badge { display:inline-flex; align-items:center; padding:2px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; }
.badge-success { background:color-mix(in srgb,var(--color-success) 15%,transparent); color:var(--color-success); }
.badge-warning { background:color-mix(in srgb,var(--color-warning) 15%,transparent); color:var(--color-warning); }
.badge-error { background:color-mix(in srgb,var(--color-error) 15%,transparent); color:var(--color-error); }
@media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.stats-grid{grid-template-columns:repeat(2,1fr)}}
`;

  const body = `
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">${title}</div>
    <a href="#" class="nav-item active">Overview</a>
    <a href="#" class="nav-item">Analytics</a>
    <a href="#" class="nav-item">Users</a>
    <a href="#" class="nav-item">Projects</a>
    <a href="#" class="nav-item">Reports</a>
    <a href="#" class="nav-item">Settings</a>
    <div style="flex:1"></div>
    <a href="#" class="nav-item" style="margin-top:auto;">Logout</a>
  </aside>
  <main class="main">
    <div class="page-header">
      <h1>Good morning! 👋</h1>
      <p>Here's what's happening with your projects today.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card animate-in">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">12,430</div>
        <div class="stat-delta">+12.5% from last month</div>
      </div>
      <div class="stat-card animate-in" style="animation-delay:0.1s">
        <div class="stat-label">Revenue</div>
        <div class="stat-value">$48.2k</div>
        <div class="stat-delta">+8.3% from last month</div>
      </div>
      <div class="stat-card animate-in" style="animation-delay:0.2s">
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">284</div>
        <div class="stat-delta">+3 new this week</div>
      </div>
      <div class="stat-card animate-in" style="animation-delay:0.3s">
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-value">3.24%</div>
        <div class="stat-delta">+0.4% from last week</div>
      </div>
    </div>
    <div class="table-section">
      <div class="table-header">
        <h3>Recent Activity</h3>
        <button class="btn btn-secondary" style="font-size:0.8rem;padding:6px 16px;">View All</button>
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Action</th><th>Date</th><th>Status</th></tr>
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
</div>`;

  return wrapHtml(title, styles, body);
}

function generateIndexPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Home";
  const desc = analysis?.description || "Build something amazing with our platform.";
  const styles = `${baseStyles(rules)}
.hero { padding:var(--spacing-7) var(--spacing-5); text-align:center; background:linear-gradient(135deg,color-mix(in srgb,var(--color-primary) 8%,var(--color-bg)),var(--color-bg)); min-height:90vh; display:flex; align-items:center; justify-content:center; }
.hero-inner { max-width:700px; }
.hero-badge { display:inline-flex; align-items:center; gap:6px; background:color-mix(in srgb,var(--color-primary) 12%,transparent); color:var(--color-primary); font-size:0.8rem; font-weight:700; padding:4px 14px; border-radius:20px; margin-bottom:var(--spacing-4); text-transform:uppercase; letter-spacing:0.05em; border:1px solid color-mix(in srgb,var(--color-primary) 25%,transparent); }
.hero h1 { font-size:clamp(2rem,5vw,3.5rem); font-weight:900; line-height:1.15; margin-bottom:var(--spacing-4); }
.hero h1 span { color:var(--color-primary); }
.hero p { font-size:1.15rem; color:var(--color-text-muted); line-height:1.7; margin-bottom:var(--spacing-6); max-width:550px; margin-left:auto; margin-right:auto; }
.hero-buttons { display:flex; gap:var(--spacing-3); justify-content:center; flex-wrap:wrap; }
.features { padding:var(--spacing-7) var(--spacing-5); }
.section-title { text-align:center; margin-bottom:var(--spacing-6); }
.section-title h2 { font-size:2rem; font-weight:800; }
.section-title p { color:var(--color-text-muted); margin-top:var(--spacing-2); }
.features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--spacing-5); max-width:1100px; margin:0 auto; }
.feature-card { padding:var(--spacing-6); background:var(--color-surface); border:1px solid var(--color-border); border-radius:14px; transition:all 0.2s; }
.feature-card:hover { border-color:var(--color-primary); box-shadow:var(--shadow-md); transform:translateY(-4px); }
.feature-icon { width:48px; height:48px; background:color-mix(in srgb,var(--color-primary) 15%,transparent); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:var(--spacing-4); }
.feature-card h3 { font-size:1.1rem; font-weight:700; margin-bottom:var(--spacing-2); }
.feature-card p { color:var(--color-text-muted); font-size:0.9rem; line-height:1.6; }
@media(max-width:768px){.features-grid{grid-template-columns:1fr}.hero-buttons{flex-direction:column;align-items:center}}
`;

  const body = `
${conditions.hasNavbar ? navbarHtml(rules, title) : ""}
<section class="hero">
  <div class="hero-inner animate-in">
    <div class="hero-badge">New Release v2.0</div>
    <h1>Build faster,<br><span>ship smarter</span></h1>
    <p>${desc}</p>
    <div class="hero-buttons">
      <button class="btn btn-primary" style="padding:14px 32px;font-size:1rem;">Get Started Free</button>
      <button class="btn btn-secondary" style="padding:14px 32px;font-size:1rem;">Learn More</button>
    </div>
  </div>
</section>
<section class="features">
  <div class="section-title">
    <h2>Everything you need</h2>
    <p>Powerful features to help you build and scale faster than ever.</p>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">⚡</div>
      <h3>Lightning Fast</h3>
      <p>Optimized for performance from the ground up. Load times under 1 second.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔒</div>
      <h3>Secure by Default</h3>
      <p>Enterprise-grade security with end-to-end encryption and compliance built in.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🎯</div>
      <h3>Smart Analytics</h3>
      <p>Real-time insights and intelligent recommendations to grow your business.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔌</div>
      <h3>Easy Integration</h3>
      <p>Connect with 200+ tools and services in minutes with our plug-and-play APIs.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📱</div>
      <h3>Mobile Ready</h3>
      <p>Responsive design that works perfectly on any device, any screen size.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🚀</div>
      <h3>Scale Instantly</h3>
      <p>Auto-scaling infrastructure that grows with your needs, no configuration needed.</p>
    </div>
  </div>
</section>
${conditions.hasFooter ? footerHtml(title) : ""}`;

  return wrapHtml(title, styles, body);
}

function generateFormPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Contact Us";
  const styles = `${baseStyles(rules)}
.form-page { min-height:100vh; padding:var(--spacing-7) var(--spacing-5); background:var(--color-bg); }
.form-container { max-width:640px; margin:0 auto; }
.form-container h1 { font-size:2rem; font-weight:800; margin-bottom:var(--spacing-2); }
.form-container p { color:var(--color-text-muted); margin-bottom:var(--spacing-6); }
.form-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:16px; padding:var(--spacing-6); box-shadow:var(--shadow-md); }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-4); }
@media(max-width:600px){.form-row{grid-template-columns:1fr}}
`;
  const body = `
${conditions.hasNavbar ? navbarHtml(rules, title) : ""}
<div class="form-page">
  <div class="form-container animate-in">
    <h1>${title}</h1>
    <p>Fill out the form below and we'll get back to you within 24 hours.</p>
    <div class="form-card">
      <form onsubmit="return false;">
        <div class="form-row">
          <div class="form-group"><label class="form-label">First Name</label><input type="text" placeholder="Rahul"></div>
          <div class="form-group"><label class="form-label">Last Name</label><input type="text" placeholder="Sharma"></div>
        </div>
        <div class="form-group"><label class="form-label">Email Address</label><input type="email" placeholder="rahul@example.com"></div>
        <div class="form-group"><label class="form-label">Subject</label><input type="text" placeholder="How can we help?"></div>
        <div class="form-group"><label class="form-label">Message</label><textarea rows="5" placeholder="Tell us more..."></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:var(--spacing-4);">Send Message</button>
      </form>
    </div>
  </div>
</div>
${conditions.hasFooter ? footerHtml(title) : ""}`;
  return wrapHtml(title, styles, body);
}

function generateRegisterPage(conditions: PageConditions, rules: ProjectRules, analysis?: UrlAnalysis | null): string {
  const title = analysis?.title || "Create Account";
  const styles = `${baseStyles(rules)}
.register-root { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:var(--spacing-5); }
.register-card { width:100%; max-width:460px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:16px; padding:var(--spacing-7) var(--spacing-6); box-shadow:var(--shadow-lg); animation:fadeIn 0.4s ease; }
.register-card h1 { font-size:1.75rem; font-weight:800; text-align:center; margin-bottom:4px; }
.register-card .subtitle { text-align:center; color:var(--color-text-muted); font-size:0.9rem; margin-bottom:var(--spacing-6); }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-3); }
`;
  const body = `
<div class="register-root">
  <div class="register-card">
    <h1>Create your account</h1>
    <p class="subtitle">Join thousands of users today. No credit card required.</p>
    <form onsubmit="return false;">
      <div class="form-row">
        <div class="form-group"><label class="form-label">First Name</label><input type="text" placeholder="Rahul"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" placeholder="Sharma"></div>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input type="email" placeholder="you@example.com"></div>
      <div class="form-group"><label class="form-label">Password</label><input type="password" placeholder="Min 8 characters"></div>
      <div class="form-group"><label class="form-label">Confirm Password</label><input type="password" placeholder="Repeat password"></div>
      <button type="submit" class="btn btn-primary" style="width:100%;margin-top:var(--spacing-3);padding:var(--spacing-4);">Create Account</button>
    </form>
    <p style="text-align:center;margin-top:var(--spacing-4);font-size:0.875rem;color:var(--color-text-muted);">Already have an account? <a href="#">Sign in</a></p>
  </div>
</div>`;
  return wrapHtml(title, styles, body);
}

export function generatePage(
  conditions: PageConditions,
  rules: ProjectRules,
  analysis?: UrlAnalysis | null
): string {
  switch (conditions.pageType) {
    case "login":
      return generateLoginPage(conditions, rules, analysis);
    case "dashboard":
      return generateDashboardPage(conditions, rules, analysis);
    case "register":
      return generateRegisterPage(conditions, rules, analysis);
    case "form":
      return generateFormPage(conditions, rules, analysis);
    case "index":
    default:
      return generateIndexPage(conditions, rules, analysis);
  }
}
