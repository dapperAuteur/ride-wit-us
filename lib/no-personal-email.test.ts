import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * This repository is public. No person's email address may sit in tracked code: the contact address
 * comes from NEXT_PUBLIC_CONTACT_EMAIL, the alert address from BAM_NOTIFY_EMAIL, the admin from
 * ADMIN_EMAIL, all set on Vercel, never in a file (the same rule witus-learn adopted in its task 394).
 * Documents that name a reporting contact on purpose (SECURITY.md, CODE_OF_CONDUCT.md) are the
 * owner's call and are listed here until a role mailbox replaces the address in them.
 */
const PERSONAL_DOMAIN = /[A-Za-z0-9._%+-]+@awews\.com/i;
const CODE = /\.(ts|tsx|mjs|cjs|js|json|yml|yaml|md)$/;
const ALLOWED = new Set(["SECURITY.md", "CODE_OF_CONDUCT.md"]);

describe("no personal email address in tracked files", () => {
  it("finds none outside the two documents the owner still has to decide on", () => {
    const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split("\n")
      .filter((f) => f && CODE.test(f) && !ALLOWED.has(f) && !f.startsWith("plans/"));
    const offenders: string[] = [];
    for (const f of files) {
      let text = "";
      try {
        text = readFileSync(f, "utf8");
      } catch {
        continue;
      }
      if (PERSONAL_DOMAIN.test(text)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
