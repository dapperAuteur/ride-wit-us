import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// after() needs a request scope; run the callback inline and remember the promise.
const pending = vi.hoisted(() => ({ list: [] as Promise<unknown>[] }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (fn: () => Promise<unknown>) => {
      pending.list.push(fn());
    },
  };
});

const sent = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("@/lib/witus-sender", () => ({
  sendToInbox: async (s: unknown) => {
    sent.list.push(s);
    return { ok: true, stubbed: true };
  },
}));

import { inboxIngestSchema } from "@/lib/witus-contracts";
import { POST } from "./route";

const saved = process.env.MAILGUN_API_KEY;

beforeEach(() => {
  delete process.env.MAILGUN_API_KEY; // sendMail stubs to stdout: no real email
  pending.list = [];
  sent.list = [];
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  if (saved === undefined) delete process.env.MAILGUN_API_KEY;
  else process.env.MAILGUN_API_KEY = saved;
  vi.restoreAllMocks();
});

function post(body: unknown): NextRequest {
  return new Request("http://localhost/api/inbox-ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/inbox-ingest forwards to the Inbox in its schema", () => {
  it.each([
    { form_type: "class_notify_signup", email: "rider@example.com", selected_all: true },
    { form_type: "host_listen_party", org_name: "Shop", contact: "sam@shop.example", neighborhood: "Downtown" },
    { form_type: "general_contact", name: "A", email: "a@b.co", message: "hi", extra_junk: "dropped" },
  ])("$form_type", async (body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    await Promise.all(pending.list);
    expect(sent.list).toHaveLength(1);
    const submission = sent.list[0] as Record<string, unknown>;
    expect(inboxIngestSchema.safeParse(submission).success).toBe(true);
    expect(submission.form_type).toBe(body.form_type);
    expect(submission.payload).not.toHaveProperty("extra_junk");
  });

  it("does not forward an invalid form", async () => {
    const res = await POST(post({ form_type: "general_contact", name: "A" }));
    expect(res.status).toBe(400);
    expect(sent.list).toHaveLength(0);
  });
});
