import fs from "fs";
import path from "path";
import axios from "axios";
import { logger } from "../lib/logger.js";

const OUTPUT_BASE = path.resolve(process.cwd(), "output", "extracts");

export interface ExtractAsset {
  originalUrl: string;
  localPath: string;
  type: "css" | "js" | "image" | "font" | "other";
  sizeBytes: number;
  downloaded: boolean;
}

export interface ExtractJob {
  jobId: string;
  url: string;
  status: "running" | "success" | "partial" | "error";
  message: string;
  timestamp: string;
  previewPath: string | null;
  outputDir: string | null;
  assets: ExtractAsset[];
  stats: {
    totalAssets: number;
    downloaded: number;
    failed: number;
    htmlSize: number;
  };
}

const jobStore = new Map<string, ExtractJob>();

export function makeExtractJobId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getAssetType(url: string, contentType = ""): ExtractAsset["type"] {
  const u = url.toLowerCase().split("?")[0];
  if (contentType.includes("text/css") || u.endsWith(".css")) return "css";
  if (
    contentType.includes("javascript") ||
    u.endsWith(".js") ||
    u.endsWith(".mjs") ||
    u.endsWith(".ts")
  )
    return "js";
  if (
    contentType.includes("font") ||
    u.endsWith(".woff") ||
    u.endsWith(".woff2") ||
    u.endsWith(".ttf") ||
    u.endsWith(".eot") ||
    u.endsWith(".otf")
  )
    return "font";
  if (
    contentType.includes("image") ||
    u.endsWith(".png") ||
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".gif") ||
    u.endsWith(".svg") ||
    u.endsWith(".webp") ||
    u.endsWith(".ico") ||
    u.endsWith(".avif") ||
    u.endsWith(".bmp")
  )
    return "image";
  return "other";
}

function typeFolder(type: ExtractAsset["type"]): string {
  const map: Record<ExtractAsset["type"], string> = {
    css: "css",
    js: "js",
    image: "images",
    font: "fonts",
    other: "other",
  };
  return map[type];
}

function safeFilename(url: string, assetType: ExtractAsset["type"], index: number): string {
  try {
    const u = new URL(url);
    let base = path.basename(u.pathname).replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!base || base === "_") base = `asset_${index}`;
    const extMap: Partial<Record<ExtractAsset["type"], string>> = { css: ".css", js: ".js" };
    const forcedExt = extMap[assetType];
    if (forcedExt && !base.endsWith(forcedExt)) base = `${base}${forcedExt}`;
    return base.length > 100 ? `asset_${index}${path.extname(base)}` : base;
  } catch {
    return `asset_${index}`;
  }
}

async function downloadAsset(
  url: string,
  destPath: string
): Promise<{ ok: boolean; sizeBytes: number }> {
  try {
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      maxContentLength: 25 * 1024 * 1024,
    });
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, Buffer.from(resp.data as ArrayBuffer));
    return { ok: true, sizeBytes: (resp.data as ArrayBuffer).byteLength };
  } catch (err) {
    logger.warn({ url, err: (err as Error).message }, "Asset download failed");
    return { ok: false, sizeBytes: 0 };
  }
}

function rewriteAllUrls(content: string, assetMap: Map<string, string>): string {
  // Sort by descending URL length to avoid partial replacement
  const entries = [...assetMap.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = content;
  for (const [orig, local] of entries) {
    result = result.split(orig).join(local);
    try {
      const encoded = encodeURI(orig);
      if (encoded !== orig) result = result.split(encoded).join(local);
    } catch {
      // ignore malformed URLs
    }
  }
  return result;
}

function injectOfflineMeta(html: string, sourceUrl: string): string {
  const banner = `<!-- Extracted by AGENT_OS Full Page Extract — source: ${sourceUrl} -->`;
  const baseMeta = `  <base href="./">`;
  return html
    .replace(/<head([^>]*)>/i, `<head$1>\n  ${banner}\n${baseMeta}`)
    .replace(/<base\s[^>]*>/gi, ""); // remove existing base tags after inserting ours
}

function ensureDirs(jobDir: string): void {
  for (const sub of ["css", "js", "images", "fonts", "other"]) {
    fs.mkdirSync(path.join(jobDir, sub), { recursive: true });
  }
}

export function registerJob(job: ExtractJob): void {
  jobStore.set(job.jobId, job);
}

export async function runFullExtract(
  url: string,
  opts: { waitForNetworkIdle?: boolean; executeJs?: boolean } = {},
  existingJobId?: string
): Promise<ExtractJob> {
  const jobId = existingJobId ?? makeExtractJobId();
  const timestamp = new Date().toISOString();
  const outDir = path.join(OUTPUT_BASE, jobId);

  const job: ExtractJob = {
    jobId,
    url,
    status: "running",
    message: "Launching browser…",
    timestamp,
    previewPath: null,
    outputDir: outDir,
    assets: [],
    stats: { totalAssets: 0, downloaded: 0, failed: 0, htmlSize: 0 },
  };
  jobStore.set(jobId, job);

  try {
    ensureDirs(outDir);

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--no-first-run",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1440, height: 900 });

    // Capture all network responses for assets
    const intercepted = new Map<string, { contentType: string; buffer: Buffer }>();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const blockedPatterns = [
        "googlesyndication",
        "doubleclick",
        "adservice",
        "googletagmanager",
        "hotjar",
        "analytics",
        "fullstory",
        "intercom",
      ];
      if (blockedPatterns.some((p) => req.url().includes(p))) {
        req.abort();
        return;
      }
      req.continue();
    });

    page.on("response", async (resp) => {
      try {
        const respUrl = resp.url();
        if (respUrl.startsWith("data:")) return;
        const rt = resp.request().resourceType();
        if (!["stylesheet", "script", "image", "font", "media"].includes(rt)) return;
        const ct = resp.headers()["content-type"] ?? "";
        const buf = await resp.buffer().catch(() => null);
        if (buf && buf.length > 0 && buf.length < 15 * 1024 * 1024) {
          intercepted.set(respUrl, { contentType: ct, buffer: buf });
        }
      } catch {
        // swallow interception errors — page may have navigated away
      }
    });

    job.message = "Rendering page (this may take 15–30 s)…";
    jobStore.set(jobId, { ...job });

    await page.goto(url, {
      waitUntil: opts.waitForNetworkIdle !== false ? "networkidle2" : "domcontentloaded",
      timeout: 45000,
    });

    // Lazy-load trigger: scroll slowly
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const step = 300;
        const id = setInterval(() => {
          window.scrollBy(0, step);
          y += step;
          if (y >= document.body.scrollHeight) {
            clearInterval(id);
            resolve();
          }
        }, 120);
      });
    });
    await new Promise((r) => setTimeout(r, 1200));

    job.message = "Extracting final DOM…";
    jobStore.set(jobId, { ...job });

    const finalHtml = await page.content();

    // Collect additional asset URLs directly from DOM (catches srcset, data-src, etc.)
    const domAssets = await page.evaluate(() => {
      const found: { url: string; declaredType: string }[] = [];
      const add = (u: string, t: string) => {
        if (u && u.startsWith("http")) found.push({ url: u, declaredType: t });
      };

      document
        .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"],link[rel="preload"][as="style"]')
        .forEach((el) => add(el.href, "css"));

      document
        .querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="font"],link[rel="preload"][as="script"]')
        .forEach((el) => add(el.href, el.as === "font" ? "font" : "js"));

      document
        .querySelectorAll<HTMLLinkElement>('link[rel*="icon"],link[rel="apple-touch-icon"]')
        .forEach((el) => add(el.href, "image"));

      document
        .querySelectorAll<HTMLScriptElement>("script[src]")
        .forEach((el) => add(el.src, "js"));

      document.querySelectorAll<HTMLImageElement>("img[src],img[data-src]").forEach((el) => {
        add(el.src || el.dataset.src || "", "image");
        (el.srcset || "").split(",").forEach((s) => add(s.trim().split(" ")[0], "image"));
      });

      document.querySelectorAll<HTMLSourceElement>("source[srcset]").forEach((el) => {
        (el.srcset || "").split(",").forEach((s) => add(s.trim().split(" ")[0], "image"));
      });

      document.querySelectorAll<HTMLVideoElement>("video[poster]").forEach((el) => {
        add(el.poster, "image");
      });

      return found;
    });

    await browser.close();

    // Merge DOM-discovered + intercepted into a single URL set
    const allUrls = new Map<string, string>(); // url → declaredType
    domAssets.forEach(({ url: u, declaredType }) => allUrls.set(u, declaredType));
    intercepted.forEach((_, u) => {
      if (!allUrls.has(u)) allUrls.set(u, "");
    });

    const downloadQueue = [...allUrls.entries()].filter(([u]) => !u.startsWith("data:"));
    job.stats.totalAssets = downloadQueue.length;
    jobStore.set(jobId, { ...job });

    job.message = `Downloading ${downloadQueue.length} assets…`;

    const assetMap = new Map<string, string>(); // originalUrl → relative local path

    let idx = 0;
    for (const [assetUrl, declaredType] of downloadQueue) {
      idx++;
      const cached = intercepted.get(assetUrl);
      const ct = cached?.contentType ?? "";
      const assetType =
        (declaredType as ExtractAsset["type"]) || getAssetType(assetUrl, ct);
      const folder = typeFolder(assetType);
      const filename = safeFilename(assetUrl, assetType, idx);
      const localRelPath = `${folder}/${filename}`;
      const destPath = path.join(outDir, localRelPath);

      let downloaded = false;
      let sizeBytes = 0;

      if (cached?.buffer) {
        try {
          fs.writeFileSync(destPath, cached.buffer);
          downloaded = true;
          sizeBytes = cached.buffer.length;
        } catch {
          downloaded = false;
        }
      } else {
        const result = await downloadAsset(assetUrl, destPath);
        downloaded = result.ok;
        sizeBytes = result.sizeBytes;
      }

      const entry: ExtractAsset = {
        originalUrl: assetUrl,
        localPath: localRelPath,
        type: assetType,
        sizeBytes,
        downloaded,
      };
      job.assets.push(entry);
      if (downloaded) assetMap.set(assetUrl, localRelPath);

      // Update job in store periodically
      if (idx % 5 === 0) {
        job.stats.downloaded = job.assets.filter((a) => a.downloaded).length;
        job.stats.failed = idx - job.stats.downloaded;
        jobStore.set(jobId, { ...job, assets: [...job.assets] });
      }
    }

    // Rewrite url() references inside CSS files
    for (const asset of job.assets) {
      if (asset.type === "css" && asset.downloaded) {
        const cssPath = path.join(outDir, asset.localPath);
        try {
          const cssContent = fs.readFileSync(cssPath, "utf-8");
          const rewritten = rewriteAllUrls(cssContent, assetMap);
          if (rewritten !== cssContent) fs.writeFileSync(cssPath, rewritten, "utf-8");
        } catch {
          // ignore — file might be binary
        }
      }
    }

    // Rewrite HTML
    job.message = "Writing offline index.html…";
    let rewrittenHtml = rewriteAllUrls(finalHtml, assetMap);
    rewrittenHtml = injectOfflineMeta(rewrittenHtml, url);

    const indexPath = path.join(outDir, "index.html");
    fs.writeFileSync(indexPath, rewrittenHtml, "utf-8");

    const totalDl = job.assets.filter((a) => a.downloaded).length;
    const totalFail = job.assets.length - totalDl;

    job.stats = {
      totalAssets: job.assets.length,
      downloaded: totalDl,
      failed: totalFail,
      htmlSize: Buffer.byteLength(rewrittenHtml, "utf-8"),
    };

    job.status =
      totalDl === 0 && job.assets.length > 0
        ? "error"
        : totalFail > 0
        ? "partial"
        : "success";

    job.previewPath = `/api/extract-static/${jobId}/index.html`;

    job.message =
      job.status === "success"
        ? `Complete — ${totalDl} assets saved, offline copy ready.`
        : job.status === "partial"
        ? `Partial — ${totalDl}/${job.assets.length} assets saved. Some external resources may not load.`
        : "Extraction failed — could not download any assets.";

    // Write manifest
    fs.writeFileSync(
      path.join(outDir, "manifest.json"),
      JSON.stringify(
        { jobId, url, timestamp, stats: job.stats, assets: job.assets },
        null,
        2
      ),
      "utf-8"
    );

    logger.info({ jobId, url, stats: job.stats }, "Full extraction complete");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ jobId, url, err: msg }, "Full extraction error");
    job.status = "error";
    job.message = `Extraction failed: ${msg}`;
  }

  jobStore.set(jobId, { ...job, assets: [...job.assets] });
  return job;
}

export function getExtractJob(jobId: string): ExtractJob | undefined {
  return jobStore.get(jobId);
}

export function listExtractJobs(): ExtractJob[] {
  return [...jobStore.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getExtractsOutputBase(): string {
  return OUTPUT_BASE;
}
