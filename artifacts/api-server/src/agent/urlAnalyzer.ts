import { logger } from "../lib/logger.js";

export interface UrlAnalysis {
  url: string;
  title: string;
  description: string;
  hasNavbar: boolean;
  hasForms: boolean;
  hasHero: boolean;
  hasCards: boolean;
  hasFooter: boolean;
  colorHints: string[];
  fontHints: string[];
  sections: string[];
  domSummary: string;
}

export async function analyzeUrl(url: string): Promise<UrlAnalysis> {
  let puppeteer: typeof import("puppeteer") | null = null;

  try {
    puppeteer = await import("puppeteer");
  } catch {
    logger.warn("Puppeteer not available, returning minimal analysis");
    return buildFallbackAnalysis(url);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const analysis = await page.evaluate(() => {
      const title = document.title || "";
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc ? (metaDesc as HTMLMetaElement).content : "";

      const allText = document.body ? document.body.innerText.slice(0, 2000) : "";

      const navElements = document.querySelectorAll("nav, header, [role='navigation']");
      const hasNavbar = navElements.length > 0;

      const formElements = document.querySelectorAll("form, input, textarea");
      const hasForms = formElements.length > 0;

      const heroElements = document.querySelectorAll(
        ".hero, #hero, [class*='hero'], [class*='banner'], [class*='jumbotron'], section:first-of-type"
      );
      const hasHero = heroElements.length > 0;

      const cardElements = document.querySelectorAll(
        ".card, [class*='card'], .item, [class*='tile']"
      );
      const hasCards = cardElements.length > 0;

      const footerElements = document.querySelectorAll("footer, [role='contentinfo']");
      const hasFooter = footerElements.length > 0;

      const sections: string[] = [];
      document.querySelectorAll("section, main > div, article").forEach((el) => {
        const text = (el as HTMLElement).innerText?.slice(0, 60).trim();
        if (text) sections.push(text);
      });

      const colorHints: string[] = [];
      const styleSheets = Array.from(document.styleSheets);
      try {
        styleSheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.slice(0, 30).forEach((rule) => {
              const text = rule.cssText;
              const colors = text.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)/g) || [];
              colorHints.push(...colors.slice(0, 3));
            });
          } catch {
            /* cross-origin */
          }
        });
      } catch {
        /* ignore */
      }

      const fontHints: string[] = [];
      const linkEls = document.querySelectorAll('link[href*="fonts"]');
      linkEls.forEach((el) => {
        const href = (el as HTMLLinkElement).href;
        const match = href.match(/family=([^&:]+)/);
        if (match) fontHints.push(decodeURIComponent(match[1]));
      });

      return {
        title,
        description,
        hasNavbar,
        hasForms,
        hasHero,
        hasCards,
        hasFooter,
        colorHints: [...new Set(colorHints)].slice(0, 5),
        fontHints: [...new Set(fontHints)].slice(0, 3),
        sections: sections.slice(0, 6),
        domSummary: allText.slice(0, 500),
      };
    });

    return { url, ...analysis };
  } catch (err) {
    logger.error({ err, url }, "URL analysis failed");
    return buildFallbackAnalysis(url);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function buildFallbackAnalysis(url: string): UrlAnalysis {
  return {
    url,
    title: "Page",
    description: "",
    hasNavbar: true,
    hasForms: false,
    hasHero: true,
    hasCards: false,
    hasFooter: true,
    colorHints: [],
    fontHints: [],
    sections: [],
    domSummary: "",
  };
}

export let puppeteerAvailable = false;

export async function checkPuppeteer(): Promise<boolean> {
  try {
    await import("puppeteer");
    puppeteerAvailable = true;
    return true;
  } catch {
    puppeteerAvailable = false;
    return false;
  }
}
