import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// The signup path with the database, Inbox and Mailgun all stood in: nothing leaves the process.
// Checks which follow-ups run for a new signup versus a repeat.

const state = vi.hoisted(() => ({
  row: { id: "row-1", notifiedAt: null as Date | null, createdAt: new Date("2026-10-05T12:00:00Z"), inserted: true },
  pending: [] as Promise<unknown>[],
  confirmations: [] as string[],
  confirmationOutcome: "sent" as "sent" | "skipped_no_mail_config" | "failed",
  inbox: [] as unknown[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => Promise<unknown>) => void state.pending.push(fn()) };
});

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, consumeRateLimit: async () => ({ allowed: true }) };
});

vi.mock("@/db", () => {
  const db = {
    insert: () => ({
      values: () => ({ onConflictDoUpdate: () => ({ returning: async () => [state.row] }) }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(values);
        },
      }),
    }),
  };
  return { getDb: () => db };
});

vi.mock("@/lib/waitlist/confirmation", () => ({
  sendWaitlistConfirmation: async (email: string) => {
    state.confirmations.push(email);
    return state.confirmationOutcome;
  },
}));

vi.mock("@/lib/witus-sender", () => ({
  sendToInbox: async (s: unknown) => {
    state.inbox.push(s);
    return { ok: true, stubbed: true };
  },
}));

import { POST } from "./route";

const saved = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://user:pass@db.invalid/neondb";
  state.row = { id: "row-1", notifiedAt: null, createdAt: new Date("2026-10-05T12:00:00Z"), inserted: true };
  state.pending = [];
  state.confirmations = [];
  state.confirmationOutcome = "sent";
  state.inbox = [];
  state.updates = [];
});

afterEach(() => {
  if (saved === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = saved;
});

async function signup(email = "Rider@Example.com") {
  const res = await POST(
    new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }) as unknown as NextRequest
  );
  await Promise.all(state.pending);
  return res;
}

describe("POST /api/waitlist follow-ups", () => {
  it("a new signup gets one confirmation email and records that it was sent", async () => {
    const res = await signup();
    expect(await res.json()).toEqual({ ok: true, data: { status: "joined" } });
    expect(state.confirmations).toEqual(["rider@example.com"]);
    expect(state.updates.some((u) => "confirmationSentAt" in u)).toBe(true);
    expect(state.inbox).toHaveLength(1);
  });

  it("a repeat signup gets no confirmation email and the same response", async () => {
    state.row = { ...state.row, inserted: false, notifiedAt: new Date() };
    const res = await signup();
    expect(await res.json()).toEqual({ ok: true, data: { status: "joined" } });
    expect(state.confirmations).toEqual([]);
    expect(state.inbox).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it("without Mailgun the signup still succeeds and nothing is recorded as sent", async () => {
    state.confirmationOutcome = "skipped_no_mail_config";
    const res = await signup();
    expect(res.status).toBe(200);
    expect(state.updates.some((u) => "confirmationSentAt" in u)).toBe(false);
  });

  it("a failed send is not recorded as sent", async () => {
    state.confirmationOutcome = "failed";
    expect((await signup()).status).toBe(200);
    expect(state.updates.some((u) => "confirmationSentAt" in u)).toBe(false);
  });
});
