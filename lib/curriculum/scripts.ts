// lib/curriculum/scripts.ts
// Loads the readable narration scripts that ship to the episode pages.
// Scripts live as markdown in content/scripts/SXX-EYY-slug.md and are
// loaded at build time by the episode page Server Component. No markdown
// library is used; the parser handles the small subset of markdown the
// scripts use (paragraphs, ## subheads, [CUT POINT: ...] dividers).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Episode } from "@/types/episode";

export type ScriptBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "cutpoint"; label: string };

function scriptPathFor(e: Pick<Episode, "season" | "ep" | "slug">): string {
  const season = String(e.season).padStart(2, "0");
  const ep = String(e.ep).padStart(2, "0");
  const filename = `S${season}-E${ep}-${e.slug}.md`;
  return join(process.cwd(), "content", "scripts", filename);
}

export function loadScript(e: Pick<Episode, "season" | "ep" | "slug">): ScriptBlock[] | null {
  let raw: string;
  try {
    raw = readFileSync(scriptPathFor(e), "utf8");
  } catch {
    return null;
  }
  return parseScript(raw);
}

function parseScript(raw: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const chunks = raw.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);

  for (const chunk of chunks) {
    if (chunk.startsWith("## ")) {
      blocks.push({ kind: "heading", text: chunk.slice(3).trim() });
      continue;
    }
    const cutMatch = chunk.match(/^\[CUT POINT:\s*(.+?)\s*\]$/);
    if (cutMatch) {
      blocks.push({ kind: "cutpoint", label: cutMatch[1] });
      continue;
    }
    blocks.push({ kind: "paragraph", text: chunk });
  }

  return blocks;
}
