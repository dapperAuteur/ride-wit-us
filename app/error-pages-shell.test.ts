import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): the root layout renders no
 * header, so the 404 page and the route error boundary must render SiteHeader (Sign in) and
 * SiteFooter themselves, and global-error must carry its own home and Sign in links.
 */
const read = (rel: string) => readFileSync(join(__dirname, rel), "utf-8");

describe("error pages keep the app shell", () => {
  it.each(["not-found.tsx", "error.tsx"])("%s renders the header, the footer and one h1", (file) => {
    const src = read(file);
    expect(src).toMatch(/<SiteHeader\b/);
    expect(src).toMatch(/<SiteFooter\b/);
    expect(src.match(/<h1/g)).toHaveLength(1);
    expect(src).toMatch(/href="\/"/);
  });

  it("global-error carries its own home and Sign in links", () => {
    const src = read("global-error.tsx");
    expect(src).toMatch(/href="\/"/);
    expect(src).toMatch(/href="\/signin"[^>]*>\s*Sign in\s*</);
  });
});
