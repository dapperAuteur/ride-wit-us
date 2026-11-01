/**
 * The home page scrolled sideways at 320px (338px wide) and 640px (650px) because the four season
 * cards sat in two, then four, columns too narrow for "Program Operations & Community" (2026-11-01).
 * The real check is the browser one (`pnpm check:width`, scripts/check-page-width.mjs); this keeps
 * the layout rules that fixed it from quietly coming back in CI, where no browser runs.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

const BASE_MULTI_COLUMN = /(^|\s)grid-cols-[2-9](\s|$)/;

function classesOf(tag: string): string[] {
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
}

describe("home page season cards", () => {
  const html = renderToStaticMarkup(<HomePage />);
  const seasons = html.match(/<h2[^>]*>Four seasons\.<\/h2>[\s\S]*?<div class="grid[^"]*"/)?.[0] ?? "";
  const gridTag = seasons.match(/<div class="grid[^"]*"/)?.[0] ?? "";

  it("is one column on phones, never four below lg", () => {
    expect(gridTag).not.toBe("");
    const classes = classesOf(gridTag);
    expect(classes).toContain("grid-cols-1");
    expect(classes.join(" ")).not.toMatch(BASE_MULTI_COLUMN);
    expect(classes).not.toContain("sm:grid-cols-4");
    expect(classes).not.toContain("md:grid-cols-4");
    expect(classes).toContain("lg:grid-cols-4");
  });

  it("lets a long title wrap inside its card", () => {
    const titles = html.match(/<p class="font-display text-2xl[^"]*"/g) ?? [];
    expect(titles).toHaveLength(4);
    for (const t of titles) expect(classesOf(t)).toContain("[overflow-wrap:anywhere]");
  });
});
