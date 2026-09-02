/**
 * Who counts as an admin. There is no user table, so this comparison IS the authorization — if it
 * says yes to the wrong address, or yes when nothing is configured, the admin surface is open.
 *
 * Offline: pure functions only, no cookies and no Next runtime.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminEmail, isAdminEmail } from "@/lib/auth/admin";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.ADMIN_EMAIL;
});

afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = saved;
});

describe("failing closed", () => {
  it("makes NOBODY an admin when ADMIN_EMAIL is unset", () => {
    // The one that matters. An unprovisioned deploy must lock the door, not open it, and the
    // obvious bug here (an undefined === undefined comparison) would do the opposite.
    delete process.env.ADMIN_EMAIL;
    expect(adminEmail()).toBeNull();
    expect(isAdminEmail("bam@awews.com")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });

  it("treats a blank or whitespace ADMIN_EMAIL as unset", () => {
    for (const blank of ["", "   "]) {
      process.env.ADMIN_EMAIL = blank;
      expect(adminEmail()).toBeNull();
      expect(isAdminEmail("bam@awews.com")).toBe(false);
      // And a session with no email must not match a blank config.
      expect(isAdminEmail("")).toBe(false);
    }
  });

  it("refuses a session with no email even when an admin is configured", () => {
    process.env.ADMIN_EMAIL = "bam@awews.com";
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
  });
});

describe("matching the configured admin", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "bam@awews.com";
  });

  it("admits the configured address", () => {
    expect(isAdminEmail("bam@awews.com")).toBe(true);
  });

  it("is case-insensitive on both sides, and tolerates surrounding whitespace", () => {
    process.env.ADMIN_EMAIL = "  BAM@AweWS.com  ";
    expect(isAdminEmail("bam@awews.com")).toBe(true);
    expect(isAdminEmail("BAM@AWEWS.COM")).toBe(true);
    expect(isAdminEmail(" bam@awews.com ")).toBe(true);
  });

  it("refuses everyone else, including near misses", () => {
    for (const other of [
      "someone@awews.com",
      "bam@awews.com.evil.test",
      "evilbam@awews.com",
      "bam@awews.co",
      "bam@notawews.com",
      "bam+admin@awews.com",
    ]) {
      expect(isAdminEmail(other)).toBe(false);
    }
  });

  it("does not treat the address as a pattern", () => {
    // A substring or regex-ish match would admit these; an equality check must not.
    process.env.ADMIN_EMAIL = "bam@awews.com";
    expect(isAdminEmail("xbam@awews.comx")).toBe(false);
    expect(isAdminEmail(".*")).toBe(false);
  });
});
