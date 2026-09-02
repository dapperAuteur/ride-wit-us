import { afterEach, describe, expect, it } from "vitest";
import { GET, HEAD } from "./route";

// The one thing these tests are for: prove the uptime probe answers honestly and
// that nothing this app holds in its environment can ride out in the response.

const SECRET_VARS = [
  "MAILGUN_API_KEY",
  "INBOX_INGEST_URL",
  "INBOX_INGEST_SECRET",
  "INBOX_SOURCE_SLUG",
  "OUTBOX_INGEST_URL",
  "OUTBOX_INGEST_SECRET",
  "OUTBOX_SOURCE_SLUG",
  "WITUS_OIDC_CLIENT_ID",
  "WITUS_OIDC_CLIENT_SECRET",
  "WITUS_SESSION_SECRET",
] as const;

const saved = new Map<string, string | undefined>();

function setEnv(name: string, value: string | undefined) {
  if (!saved.has(name)) saved.set(name, process.env[name]);
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  saved.clear();
});

describe("GET /api/health", () => {
  it("returns 200 with ok:true while the app is serving", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("ride-wit-us");
  });

  it("is never cached", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("reports configuration as booleans, not values", async () => {
    for (const name of SECRET_VARS) setEnv(name, "unit-test-value-do-not-leak");
    const res = await GET();
    const body = await res.json();
    expect(body.config).toEqual({ mailgun: true, inbox: true, outbox: true, witus_sso: true });
  });

  it("leaks no environment value in the serialized response", async () => {
    for (const name of SECRET_VARS) setEnv(name, "unit-test-value-do-not-leak");
    const res = await GET();
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("unit-test-value-do-not-leak");
  });

  it("reports false rather than throwing when credentials are absent", async () => {
    for (const name of SECRET_VARS) setEnv(name, undefined);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config).toEqual({ mailgun: false, inbox: false, outbox: false, witus_sso: false });
  });

  it("treats an empty-string credential as unconfigured", async () => {
    setEnv("MAILGUN_API_KEY", "");
    const res = await GET();
    const body = await res.json();
    expect(body.config.mailgun).toBe(false);
  });
});

describe("HEAD /api/health", () => {
  it("returns 200 with an empty, uncached body", async () => {
    const res = await HEAD();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).toBe("");
  });
});
