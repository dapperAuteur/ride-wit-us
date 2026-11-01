#!/usr/bin/env node
/**
 * Width check: no public page may scroll sideways at phone or tablet widths.
 *
 * Opens each page at each width in headless Chromium and fails when the document is wider than the
 * viewport (`scrollWidth > innerWidth`), naming the text that sticks out. Written after the home
 * page scrolled sideways at 320px (338px wide) and 640px (650px) because a season card's title
 * could not fit its grid column (2026-11-01).
 *
 * Usage (against a running server; a production build is the honest test):
 *   pnpm build && pnpm start            # in one terminal
 *   pnpm check:width                    # in another; BASE_URL defaults to http://localhost:3000
 *   BASE_URL=https://ride.witus.online pnpm check:width
 *
 * Browser: PAGE_WIDTH_BROWSER (a Chromium executable) when set; otherwise the newest Playwright
 * headless shell cached in ~/Library/Caches/ms-playwright or ~/.cache/ms-playwright; otherwise
 * Playwright's default (`pnpm exec playwright-core install chromium-headless-shell` fetches one).
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

export const WIDTHS = [320, 375, 640, 768, 1024];
export const PAGES = [
  "/",
  "/episodes",
  "/episodes/tires-tubes-flats",
  "/seasons/1",
  "/seasons/2",
  "/seasons/3",
  "/seasons/4",
  "/about",
  "/tune-in",
  "/waitlist",
  "/signin",
];

function cachedHeadlessShell() {
  const caches = [join(homedir(), "Library", "Caches", "ms-playwright"), join(homedir(), ".cache", "ms-playwright")];
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    const dirs = readdirSync(cache)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const dir of dirs) {
      for (const sub of ["chrome-headless-shell-mac-x64", "chrome-headless-shell-mac-arm64", "chrome-headless-shell-linux64"]) {
        const exe = join(cache, dir, sub, "chrome-headless-shell");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

async function main() {
  const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const executablePath = process.env.PAGE_WIDTH_BROWSER || cachedHeadlessShell() || undefined;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const failures = [];
  try {
    for (const path of PAGES) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const res = await page.goto(base + path, { waitUntil: "networkidle" });
        if (!res || res.status() >= 400) {
          failures.push(`${path} @${width}: HTTP ${res ? res.status() : "no response"}`);
          await page.close();
          continue;
        }
        const result = await page.evaluate((w) => {
          const scrollWidth = document.documentElement.scrollWidth;
          const culprits = [];
          if (scrollWidth > w) {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode()) && culprits.length < 5) {
              const range = document.createRange();
              range.selectNodeContents(node);
              const box = range.getBoundingClientRect();
              const parent = node.parentElement;
              if (!parent || box.width === 0 || box.right <= w + 0.5) continue;
              if (parent.closest(".sr-only")) continue;
              culprits.push(`<${parent.tagName.toLowerCase()}> "${node.textContent.trim().slice(0, 40)}" ends at ${Math.round(box.right)}px`);
            }
          }
          return { scrollWidth, culprits };
        }, width);
        if (result.scrollWidth > width) {
          failures.push(`${path} @${width}: page is ${result.scrollWidth}px wide\n      ${result.culprits.join("\n      ")}`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(`Sideways scroll on ${failures.length} page/width pair(s):\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`OK: ${PAGES.length} pages x ${WIDTHS.length} widths (${WIDTHS.join(", ")}px) fit with no sideways scroll at ${base}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
