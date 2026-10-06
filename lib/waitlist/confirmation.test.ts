import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWaitlistConfirmation, sendWaitlistConfirmation } from "./confirmation";

// fetch is stubbed; MAILGUN_API_KEY is a dummy. No real email is sent.

const KEYS = ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_REGION", "EMAIL_FROM", "BAM_NOTIFY_EMAIL"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildWaitlistConfirmation", () => {
  const msg = buildWaitlistConfirmation("rider@example.com", "owner@example.com");

  it("is plain text, untracked, and replies go to a person", () => {
    expect(msg.to).toBe("rider@example.com");
    expect(msg.subject).toBe("You're on the RideWitUS waitlist");
    expect(msg.html).toBeUndefined();
    expect(msg.noTracking).toBe(true);
    expect(msg.replyTo).toBe("owner@example.com");
  });

  it("says what happens next and how to be removed", () => {
    expect(msg.text).toContain("You're on the RideWitUS waitlist");
    expect(msg.text).toContain("What happens next");
    expect(msg.text).toContain("Reply to this email and say so. We'll remove your address");
  });
});

describe("sendWaitlistConfirmation", () => {
  it("skips without Mailgun configured and calls nothing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await sendWaitlistConfirmation("rider@example.com")).toBe("skipped_no_mail_config");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends through Mailgun with tracking off, and logs no address", async () => {
    process.env.MAILGUN_API_KEY = "key-test";
    let sentBody = "";
    let sentUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        sentUrl = url;
        sentBody = String(init.body);
        return new Response(JSON.stringify({ id: "<m@mg>" }), { status: 200 });
      })
    );
    expect(await sendWaitlistConfirmation("rider@example.com")).toBe("sent");
    expect(sentUrl).toBe("https://api.mailgun.net/v3/mg.witus.online/messages");
    const form = new URLSearchParams(sentBody);
    expect(form.get("to")).toBe("rider@example.com");
    expect(form.get("o:tracking")).toBe("no");
    expect(form.get("o:tracking-opens")).toBe("no");
    expect(form.get("o:tracking-clicks")).toBe("no");
    expect(form.get("html")).toBeNull();
  });

  it("reports a Mailgun rejection as failed", async () => {
    process.env.MAILGUN_API_KEY = "key-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    expect(await sendWaitlistConfirmation("rider@example.com")).toBe("failed");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("rider@example.com");
  });
});
