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
    expect(isAdminEmail("admin@example.com")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });

  it("treats a blank or whitespace ADMIN_EMAIL as unset", () => {
    for (const blank of ["", "   "]) {
      process.env.ADMIN_EMAIL = blank;
      expect(adminEmail()).toBeNull();
      expect(isAdminEmail("admin@example.com")).toBe(false);
      // And a session with no email must not match a blank config.
      expect(isAdminEmail("")).toBe(false);
    }
  });

  it("refuses a session with no email even when an admin is configured", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
  });
});

describe("matching the configured admin", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("admits the configured address", () => {
    expect(isAdminEmail("admin@example.com")).toBe(true);
  });

  it("is case-insensitive on both sides, and tolerates surrounding whitespace", () => {
    process.env.ADMIN_EMAIL = "  Admin@Example.COM  ";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
    expect(isAdminEmail(" admin@example.com ")).toBe(true);
  });

  it("refuses everyone else, including near misses", () => {
    for (const other of [
      "someone-else@example.com",
      "admin@example.com.evil.test",
      "editor@example.com",
      "admin@example.co",
      "admin@notexample.com",
      "admin.two@example.com",
    ]) {
      expect(isAdminEmail(other)).toBe(false);
    }
  });

  it("does not treat the address as a pattern", () => {
    // A substring or regex-ish match would admit these; an equality check must not.
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(isAdminEmail("admin@example.comx")).toBe(false);
    expect(isAdminEmail(".*")).toBe(false);
  });
});
