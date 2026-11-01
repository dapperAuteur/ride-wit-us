/**
 * The drain against a mocked CentenarianOS (injected fetch), a pinned clock and an in-memory
 * outbox. Covers batching, the answer shapes CentenarianOS returns (object and string rejections),
 * the backoff ladder, unknown_subject waiting forever, and "not configured = rows stay pending".
 */
import { describe, expect, it } from "vitest";
import { verifyWitusSignature } from "@/lib/signed/signature";
import type { FetchLike } from "@/lib/signed/client";
import { BACKOFF_MS, BATCH_SIZE, backoff, drainOutbox, type OutboxRow, type OutboxStore, type RowUpdate } from "./drain";

const NOW = new Date("2026-10-31T13:00:00.000Z");
const ENV = {
  MOBILITY_ACTIVITY_EVENTS_URL: "https://centos.example/api/events/mobility-activity",
  MOBILITY_ACTIVITY_EVENTS_SECRET: "test-only-activity-secret-not-real-0123456789ab",
  MOBILITY_COST_EVENTS_URL: "https://centos.example/api/events/mobility-cost",
  MOBILITY_COST_EVENTS_SECRET: "test-only-cost-secret-not-real-0123456789abcdef",
};

function row(i: number, receiver: OutboxRow["receiver"] = "centos.mobility_activity", attempts = 0): OutboxRow {
  return { id: `row-${receiver}-${i}`, receiver, eventId: `trip:T${i}`, payload: { event_id: `trip:T${i}`, n: i }, occurredAt: NOW, attempts };
}

function store(rows: OutboxRow[]) {
  const applied: RowUpdate[] = [];
  const s: OutboxStore & { applied: RowUpdate[] } = {
    applied,
    async due() {
      return rows;
    },
    async apply(u) {
      applied.push(...u);
    },
  };
  return s;
}

interface Call {
  url: string;
  body: { events: { event_id: string }[] };
  headers: Record<string, string>;
}

function centos(answer: (call: Call) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const call = { url, body: JSON.parse(init.body ?? "{}"), headers: init.headers };
    calls.push(call);
    const { status, body } = answer(call);
    return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), headers: { get: () => null } };
  };
  return { fetchImpl, calls };
}

const accepted = (call: Call) => ({ status: 200, body: { accepted: call.body.events.length, rejected: [] } });

describe("drainOutbox", () => {
  it("signs each batch as ride-witus with the receiver's own secret, over the exact bytes", async () => {
    const s = store([row(1), row(2, "centos.mobility_cost")]);
    const peer = centos(accepted);
    await drainOutbox(s, { env: ENV, fetchImpl: peer.fetchImpl, now: NOW, nowSeconds: 1793400000 });
    expect(peer.calls.map((c) => c.url)).toEqual([ENV.MOBILITY_ACTIVITY_EVENTS_URL, ENV.MOBILITY_COST_EVENTS_URL]);
    const [activity, cost] = peer.calls;
    for (const [call, secret] of [
      [activity, ENV.MOBILITY_ACTIVITY_EVENTS_SECRET],
      [cost, ENV.MOBILITY_COST_EVENTS_SECRET],
    ] as const) {
      const verdict = verifyWitusSignature({
        signed: JSON.stringify(call.body),
        signatureHeader: call.headers["X-Witus-Signature"],
        timestampHeader: call.headers["X-Witus-Timestamp"],
        sourceHeader: call.headers["X-Witus-Source"],
        secret,
        nowSeconds: 1793400000,
      });
      expect(verdict).toEqual({ ok: true, source: "ride-witus" });
    }
    expect(s.applied.every((u) => u.status === "sent" && u.sentAt?.getTime() === NOW.getTime())).toBe(true);
  });

  it(`sends at most ${BATCH_SIZE} events per request`, async () => {
    const s = store(Array.from({ length: BATCH_SIZE * 2 + 1 }, (_, i) => row(i)));
    const peer = centos(accepted);
    const [report] = await drainOutbox(s, { env: ENV, fetchImpl: peer.fetchImpl, now: NOW });
    expect(peer.calls.map((c) => c.body.events.length)).toEqual([BATCH_SIZE, BATCH_SIZE, 1]);
    expect(report).toMatchObject({ sent: BATCH_SIZE * 2 + 1, failed: 0 });
  });

  it("marks the rows CentenarianOS names: unknown_subject waits, anything else fails, the rest are sent", async () => {
    const s = store([row(1), row(2), row(3)]);
    const peer = centos(() => ({
      status: 200,
      body: { accepted: 1, rejected: [{ event_id: "trip:T2", reason: "unknown_subject" }, { event_id: "trip:T3", reason: "invalid_event:mode" }] },
    }));
    const [report] = await drainOutbox(s, { env: ENV, fetchImpl: peer.fetchImpl, now: NOW });
    const byId = new Map(s.applied.map((u) => [u.id, u]));
    expect(byId.get("row-centos.mobility_activity-1")).toMatchObject({ status: "sent" });
    expect(byId.get("row-centos.mobility_activity-2")).toMatchObject({ status: "pending", lastReason: "unknown_subject", attempts: 1 });
    expect(byId.get("row-centos.mobility_activity-2")!.nextAttemptAt.getTime()).toBe(NOW.getTime() + BACKOFF_MS[0]);
    expect(byId.get("row-centos.mobility_activity-3")).toMatchObject({ status: "failed", lastReason: "invalid_event:mode" });
    expect(report).toMatchObject({ sent: 1, waiting: 1, failed: 1, retrying: 0 });
  });

  it("reads CentenarianOS's older string-form rejections too", async () => {
    const s = store([row(1), row(2)]);
    const peer = centos(() => ({ status: 200, body: { accepted: 1, rejected: ["trip:T2: unknown_subject"] } }));
    await drainOutbox(s, { env: ENV, fetchImpl: peer.fetchImpl, now: NOW });
    expect(s.applied.find((u) => u.id.endsWith("-2"))).toMatchObject({ status: "pending", lastReason: "unknown_subject" });
  });

  it("retries 5xx, 401, 503 and timeouts on the backoff, then fails after the last step", async () => {
    for (const status of [500, 401, 503, 0]) {
      const s = store([row(1, "centos.mobility_activity", 0), row(2, "centos.mobility_activity", BACKOFF_MS.length)]);
      const peer = centos(() => ({ status, body: status === 503 ? { ok: false, code: "not_configured" } : null }));
      const fetchImpl: FetchLike = status === 0 ? async () => { throw new Error("network down"); } : peer.fetchImpl;
      await drainOutbox(s, { env: ENV, fetchImpl, now: NOW });
      const [first, last] = s.applied;
      expect(first, String(status)).toMatchObject({ status: "pending", attempts: 1 });
      expect(first.nextAttemptAt.getTime()).toBe(NOW.getTime() + BACKOFF_MS[0]);
      expect(last, String(status)).toMatchObject({ status: "failed", attempts: BACKOFF_MS.length + 1 });
      if (status === 503) expect(first.lastReason).toBe("not_configured");
    }
  });

  it("fails the batch on 400 (the same body cannot succeed)", async () => {
    const s = store([row(1)]);
    const peer = centos(() => ({ status: 400, body: { ok: false, code: "too_many_events" } }));
    await drainOutbox(s, { env: ENV, fetchImpl: peer.fetchImpl, now: NOW });
    expect(s.applied[0]).toMatchObject({ status: "failed", lastReason: "too_many_events", lastStatus: 400 });
  });

  it("skips a receiver whose URL or secret is unset, leaving its rows untouched", async () => {
    const s = store([row(1), row(2, "centos.mobility_cost")]);
    const peer = centos(accepted);
    const reports = await drainOutbox(s, {
      env: { ...ENV, MOBILITY_COST_EVENTS_SECRET: undefined },
      fetchImpl: peer.fetchImpl,
      now: NOW,
    });
    expect(peer.calls).toHaveLength(1);
    expect(reports.find((r) => r.receiver === "centos.mobility_cost")).toMatchObject({ skipped: 1, sent: 0 });
    expect(s.applied.map((u) => u.id)).toEqual(["row-centos.mobility_activity-1"]);
  });

  it("refuses a non-http URL as not configured", async () => {
    const s = store([row(1)]);
    const peer = centos(accepted);
    await drainOutbox(s, { env: { ...ENV, MOBILITY_ACTIVITY_EVENTS_URL: "ftp://centos.example/x" }, fetchImpl: peer.fetchImpl, now: NOW });
    expect(peer.calls).toHaveLength(0);
  });

  it("guards every update with the payload's occurred_at", async () => {
    const s = store([row(1)]);
    await drainOutbox(s, { env: ENV, fetchImpl: centos(accepted).fetchImpl, now: NOW });
    expect(s.applied[0].occurredAt).toBe(NOW);
  });
});

describe("backoff", () => {
  it("walks 1 min, 5 min, 30 min, 2 h, 12 h, then fails", () => {
    let attempts = 0;
    for (const delay of BACKOFF_MS) {
      const next = backoff(attempts, NOW);
      expect(next).toMatchObject({ status: "pending", attempts: attempts + 1 });
      expect(next.next.getTime() - NOW.getTime()).toBe(delay);
      attempts = next.attempts;
    }
    expect(backoff(attempts, NOW).status).toBe("failed");
  });

  it("never fails unknown_subject: it waits 12 h at a time", () => {
    const next = backoff(BACKOFF_MS.length + 10, NOW, true);
    expect(next.status).toBe("pending");
    expect(next.next.getTime() - NOW.getTime()).toBe(BACKOFF_MS[BACKOFF_MS.length - 1]);
  });
});
