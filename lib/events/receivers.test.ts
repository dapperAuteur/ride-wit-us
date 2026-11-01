/**
 * The three CentenarianOS → RideWitUS receivers (CentOS plan 70 R-3, contract E5 to E7), driven
 * through `receiveEvents` with signed requests, a pinned clock and an in-memory store. No database
 * and no network: the store fake applies the same "newer or equal replaces, older is ignored" rule
 * the SQL applies, and a separate test reads the SQL itself (lib/events/projections.test.ts).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { signedHeaders } from "@/lib/signed/signature";
import { MAX_EVENTS_PER_REQUEST, receiveEvents, type EventTypeSpec, type ProjectionWriter } from "./inbound";
import { calendarActivitySpec, envelopeBalanceSpec, financeMatchSpec } from "./projections";

const NOW = 1793400000;
const SECRETS = {
  ENVELOPE_BALANCE_EVENTS_SECRET: "test-only-envelope-secret-not-real-0123456789ab",
  CALENDAR_ACTIVITY_EVENTS_SECRET: "test-only-calendar-secret-not-real-0123456789abcd",
  FINANCE_MATCH_EVENTS_SECRET: "test-only-finance-secret-not-real-0123456789abcd",
};
const USER = "11111111-1111-4111-8111-111111111111";
const SUB = "SUB_EXAMPLE";

type Row = { userId: string; eventId: string; occurredAt: Date } & Record<string, unknown>;

/** In-memory projection with the upsert's ordering rule. */
function fakeStore(known: Record<string, string> = { [SUB]: USER }) {
  const rows = new Map<string, Row>();
  const calls = { upserts: 0, lookups: 0 };
  const store: ProjectionWriter<Row> & { rows: Map<string, Row>; calls: typeof calls } = {
    rows,
    calls,
    async userIdsForSubs(subs) {
      calls.lookups += 1;
      return new Map(subs.filter((s) => known[s]).map((s) => [s, known[s]]));
    },
    async upsert(batch) {
      calls.upserts += 1;
      const keys = new Set<string>();
      for (const row of batch) {
        const key = `${row.userId}|${row.eventId}`;
        // Postgres refuses to touch one row twice in a single INSERT ... ON CONFLICT.
        if (keys.has(key)) throw new Error("ON CONFLICT DO UPDATE command cannot affect row a second time");
        keys.add(key);
        const stored = rows.get(key);
        if (!stored || stored.occurredAt.getTime() <= row.occurredAt.getTime()) rows.set(key, { ...row });
      }
    },
  };
  return store;
}

function post(path: string, body: string, opts: { secret?: string; source?: string; now?: number } = {}): Request {
  const headers = signedHeaders({
    secret: opts.secret ?? "unused",
    source: opts.source ?? "centenarianos",
    signed: body,
    nowSeconds: opts.now ?? NOW,
  });
  return new Request(`https://ride.example${path}`, { method: "POST", headers: { ...headers }, body });
}

const envelope = (over: Record<string, unknown> = {}) => ({
  event_id: "envelope:GOAL_1",
  event_type: "envelope.balance",
  schema_version: 1,
  witus_sub: SUB,
  occurred_at: "2026-10-31T14:00:00.000Z",
  is_active: true,
  envelope_id: "GOAL_1",
  link_type: "trip",
  link_id: "TRIP_1",
  link_source: "centenarian-os",
  label: "Chicago trip",
  goal_kind: "trip",
  balance: "240.00",
  target_amount: "600.00",
  target_date: "2026-12-10",
  currency: "USD",
  status: "active",
  as_of: "2026-10-31T14:00:00.000Z",
  deep_link: "https://centos.example/dashboard/finance/savings",
  ...over,
});

const calendar = (over: Record<string, unknown> = {}) => ({
  event_id: "cal:abc123",
  event_type: "calendar.activity",
  schema_version: 1,
  witus_sub: SUB,
  occurred_at: "2026-10-31T14:00:00.000Z",
  starts_at: "2026-11-02T09:00:00-05:00",
  ends_at: "2026-11-02T10:00:00-05:00",
  all_day: false,
  time_zone: "America/Indiana/Indianapolis",
  title: "Practice",
  location: "Lucas Oil Stadium",
  calendar_label: "Work",
  status: "confirmed",
  trip_token: { distance_miles: 6.2, mode: "bike", duration_min: 34 },
  is_active: true,
  ...over,
});

const match = (over: Record<string, unknown> = {}) => ({
  event_id: "match:fuel:FUEL_1",
  event_type: "cost.matched",
  schema_version: 1,
  witus_sub: SUB,
  occurred_at: "2026-10-31T14:05:00.000Z",
  is_active: true,
  source_type: "fuel",
  source_id: "FUEL_1",
  matched: true,
  transaction_amount: "48.12",
  transaction_currency: "USD",
  transaction_date: "2026-10-30",
  deep_link: "https://centos.example/dashboard/finance/transactions/TX_1",
  ...over,
});

interface Case {
  name: string;
  path: string;
  secretEnv: keyof typeof SECRETS;
  spec: EventTypeSpec<unknown, Row>;
  make: (over?: Record<string, unknown>) => Record<string, unknown>;
}

const CASES: Case[] = [
  {
    name: "envelope.balance",
    path: "/api/events/envelope-balance",
    secretEnv: "ENVELOPE_BALANCE_EVENTS_SECRET",
    spec: envelopeBalanceSpec as unknown as EventTypeSpec<unknown, Row>,
    make: envelope,
  },
  {
    name: "calendar.activity",
    path: "/api/events/calendar-activity",
    secretEnv: "CALENDAR_ACTIVITY_EVENTS_SECRET",
    spec: calendarActivitySpec as unknown as EventTypeSpec<unknown, Row>,
    make: calendar,
  },
  {
    name: "cost.matched",
    path: "/api/events/finance-match",
    secretEnv: "FINANCE_MATCH_EVENTS_SECRET",
    spec: financeMatchSpec as unknown as EventTypeSpec<unknown, Row>,
    make: match,
  },
];

for (const c of CASES) {
  const secret = SECRETS[c.secretEnv];
  const env = { [c.secretEnv]: secret };
  const send = async (body: unknown, store = fakeStore(), opts: { secret?: string; source?: string; now?: number; env?: Record<string, string | undefined> } = {}) => {
    const text = typeof body === "string" ? body : JSON.stringify(body);
    const res = await receiveEvents(post(c.path, text, { secret, ...opts }), c.spec, {
      store,
      env: opts.env ?? env,
      nowSeconds: NOW,
    });
    return { ...res, store };
  };

  describe(`${c.name} receiver (${c.path})`, () => {
    describe("signature", () => {
      it("accepts a signed batch and stores the row", async () => {
        const { status, body, store } = await send({ events: [c.make()] });
        expect(status).toBe(200);
        expect(body).toEqual({ accepted: 1, rejected: [] });
        expect(store.rows.size).toBe(1);
        expect([...store.rows.values()][0]).toMatchObject({ userId: USER, eventId: c.make().event_id, isActive: true });
      });

      it("accepts a single event without the events wrapper", async () => {
        const { status, body } = await send(c.make());
        expect(status).toBe(200);
        expect(body).toEqual({ accepted: 1, rejected: [] });
      });

      it("answers 401 for a wrong secret, a stale or future timestamp, and a wrong or Inbox-style source", async () => {
        for (const opts of [
          { secret: "a-different-secret-0123456789abcdef0123456789" },
          { now: NOW - 301 },
          { now: NOW + 301 },
          { source: "ride-witus" },
          { source: "centenarian-os" },
        ]) {
          const { status, body, store } = await send({ events: [c.make()] }, fakeStore(), opts);
          expect(status, JSON.stringify(opts)).toBe(401);
          expect(body).toEqual({ ok: false, error: "Unauthorized", code: "unauthorized" });
          expect(store.calls.lookups).toBe(0);
        }
      });

      it("answers 401 when the body was changed after signing", async () => {
        const signedBody = JSON.stringify({ events: [c.make()] });
        const headers = signedHeaders({ secret, source: "centenarianos", signed: signedBody, nowSeconds: NOW });
        const edited = signedBody.replace("2026-10-31", "2026-10-30");
        const req = new Request(`https://ride.example${c.path}`, { method: "POST", headers: { ...headers }, body: edited });
        const { status } = await receiveEvents(req, c.spec, { store: fakeStore(), env, nowSeconds: NOW });
        expect(status).toBe(401);
      });

      it("answers 503 not_configured when the secret is unset, before reading the body", async () => {
        const { status, body } = await send("not json", fakeStore(), { env: {} });
        expect(status).toBe(503);
        expect(body).toEqual({ ok: false, error: "Not configured", code: "not_configured" });
      });

      it("answers 503 not_configured when there is no database", async () => {
        const res = await receiveEvents(post(c.path, JSON.stringify(c.make()), { secret }), c.spec, {
          store: null,
          env,
          nowSeconds: NOW,
        });
        expect(res.status).toBe(503);
        expect(res.body).toMatchObject({ code: "not_configured" });
      });
    });

    describe("body", () => {
      it("answers 400 invalid_body for non-JSON, an array, a non-array events, or an event without event_id", async () => {
        for (const body of ["not json", "[]", JSON.stringify({ events: "x" }), JSON.stringify({ events: [{ ...c.make(), event_id: 7 }] })]) {
          const { status, body: answer } = await send(body);
          expect(status, body).toBe(400);
          expect(answer).toMatchObject({ ok: false, code: "invalid_body" });
        }
      });

      it(`answers 400 too_many_events above ${MAX_EVENTS_PER_REQUEST}`, async () => {
        const events = Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, () => c.make());
        const { status, body } = await send({ events });
        expect(status).toBe(400);
        expect(body).toMatchObject({ code: "too_many_events" });
      });

      it(`takes exactly ${MAX_EVENTS_PER_REQUEST}`, async () => {
        const events = Array.from({ length: MAX_EVENTS_PER_REQUEST }, () => c.make());
        const { status, body } = await send({ events });
        expect(status).toBe(200);
        expect(body).toEqual({ accepted: MAX_EVENTS_PER_REQUEST, rejected: [] });
      });

      it("accepts an empty batch without touching the store", async () => {
        const { status, body, store } = await send({ events: [] });
        expect(status).toBe(200);
        expect(body).toEqual({ accepted: 0, rejected: [] });
        expect(store.calls.upserts).toBe(0);
      });
    });

    describe("per-event refusals, by event_id", () => {
      it("refuses an unknown major version as unsupported_schema_version", async () => {
        const { body } = await send({ events: [c.make({ schema_version: 2 })] });
        expect(body).toEqual({ accepted: 0, rejected: [{ event_id: c.make().event_id, reason: "unsupported_schema_version" }] });
      });

      it("names the field for a bad common field", async () => {
        for (const [field, value] of [
          ["event_type", "something.else"],
          ["schema_version", "1"],
          ["witus_sub", ""],
          ["occurred_at", "yesterday"],
          ["is_active", "yes"],
        ] as const) {
          const { body } = await send({ events: [c.make({ [field]: value })] });
          expect(body, field).toEqual({ accepted: 0, rejected: [{ event_id: c.make().event_id, reason: `invalid_event:${field}` }] });
        }
      });

      it("refuses unknown_subject for a sub with no RideWitUS user, and stores the rest", async () => {
        const store = fakeStore();
        const other = c.make({ witus_sub: "SUB_NOBODY" });
        const { body } = await send({ events: [c.make(), other] }, store);
        expect(body).toEqual({ accepted: 1, rejected: [{ event_id: other.event_id, reason: "unknown_subject" }] });
        expect(store.rows.size).toBe(1);
      });

      it("ignores unknown fields", async () => {
        const { body, store } = await send({ events: [c.make({ travel_hint: "home", something_new: { a: 1 } })] });
        expect(body).toEqual({ accepted: 1, rejected: [] });
        expect(JSON.stringify([...store.rows.values()])).not.toContain("travel_hint");
      });
    });

    describe("ordering and idempotency", () => {
      it("stores the same event twice as one row", async () => {
        const store = fakeStore();
        await send({ events: [c.make()] }, store);
        await send({ events: [c.make()] }, store);
        expect(store.rows.size).toBe(1);
      });

      it("accepts an older occurred_at but keeps the newer row", async () => {
        const store = fakeStore();
        await send({ events: [c.make({ occurred_at: "2026-10-31T15:00:00.000Z", is_active: true })] }, store);
        const { body } = await send({ events: [c.make({ occurred_at: "2026-10-31T14:00:00.000Z", is_active: false })] }, store);
        expect(body).toEqual({ accepted: 1, rejected: [] });
        const row = [...store.rows.values()][0];
        expect(row.isActive).toBe(true);
        expect(row.occurredAt.toISOString()).toBe("2026-10-31T15:00:00.000Z");
      });

      it("retires the row with is_active: false and keeps it, so an older copy cannot revive it", async () => {
        const store = fakeStore();
        await send({ events: [c.make({ occurred_at: "2026-10-31T14:00:00.000Z" })] }, store);
        await send({ events: [c.make({ occurred_at: "2026-10-31T16:00:00.000Z", is_active: false })] }, store);
        await send({ events: [c.make({ occurred_at: "2026-10-31T15:00:00.000Z", is_active: true })] }, store);
        expect(store.rows.size).toBe(1);
        expect([...store.rows.values()][0].isActive).toBe(false);
      });

      it("collapses duplicates inside one batch to the newest (later wins on a tie)", async () => {
        const store = fakeStore();
        const { body } = await send(
          {
            events: [
              c.make({ occurred_at: "2026-10-31T16:00:00.000Z", is_active: false }),
              c.make({ occurred_at: "2026-10-31T14:00:00.000Z", is_active: true }),
            ],
          },
          store
        );
        expect(body).toEqual({ accepted: 2, rejected: [] });
        expect(store.calls.upserts).toBe(1);
        expect([...store.rows.values()][0].isActive).toBe(false);
      });

      it("answers 500 lookup_failed when the database errors, so the sender retries", async () => {
        const store = fakeStore();
        store.upsert = async () => {
          throw new Error("connection reset");
        };
        const { status, body } = await send({ events: [c.make()] }, store);
        expect(status).toBe(500);
        expect(body).toEqual({ ok: false, error: "Lookup failed", code: "lookup_failed" });
      });
    });
  });
}

describe("envelope.balance fields", () => {
  const env = { ENVELOPE_BALANCE_EVENTS_SECRET: SECRETS.ENVELOPE_BALANCE_EVENTS_SECRET };
  const send = async (event: Record<string, unknown>, store = fakeStore()) =>
    receiveEvents(post("/api/events/envelope-balance", JSON.stringify(event), { secret: env.ENVELOPE_BALANCE_EVENTS_SECRET }), envelopeBalanceSpec as unknown as EventTypeSpec<unknown, Row>, { store, env, nowSeconds: NOW });

  it("keys one row per envelope: event_id must be envelope:<envelope_id>", async () => {
    const { body } = await send(envelope({ event_id: "envelope:GOAL_2" }));
    expect(body).toEqual({ accepted: 0, rejected: [{ event_id: "envelope:GOAL_2", reason: "invalid_event:event_id" }] });
  });

  it("stores amounts as sent, never converted, and the link to show it beside", async () => {
    const store = fakeStore();
    await send(envelope({ currency: "EUR", balance: "12.50" }), store);
    expect([...store.rows.values()][0]).toMatchObject({ balance: "12.50", currency: "EUR", linkType: "trip", linkId: "TRIP_1", targetDate: "2026-12-10" });
  });

  it("refuses a bad balance, currency, date or a non-http deep link", async () => {
    for (const [field, value] of [
      ["balance", "12.345"],
      ["balance", null],
      ["currency", "usd"],
      ["target_date", "12/10/2026"],
      ["deep_link", "javascript:alert(1)"],
      ["label", ""],
    ] as const) {
      const { body } = await send(envelope({ [field]: value }));
      expect(body, `${field}=${String(value)}`).toEqual({ accepted: 0, rejected: [{ event_id: "envelope:GOAL_1", reason: `invalid_event:${field}` }] });
    }
  });
});

describe("calendar.activity fields", () => {
  const secret = SECRETS.CALENDAR_ACTIVITY_EVENTS_SECRET;
  const env = { CALENDAR_ACTIVITY_EVENTS_SECRET: secret };
  const spec = calendarActivitySpec as unknown as EventTypeSpec<unknown, Row>;
  const send = async (event: Record<string, unknown>, store = fakeStore()) =>
    receiveEvents(post("/api/events/calendar-activity", JSON.stringify(event), { secret }), spec, { store, env, nowSeconds: NOW });

  it("takes CentenarianOS's retraction, every detail null, as a retired row", async () => {
    const store = fakeStore();
    await send(calendar(), store);
    const retraction = {
      event_id: "cal:abc123",
      event_type: "calendar.activity",
      schema_version: 1,
      witus_sub: SUB,
      occurred_at: "2026-10-31T15:00:00.000Z",
      starts_at: null,
      ends_at: null,
      all_day: null,
      time_zone: null,
      title: null,
      location: null,
      calendar_label: null,
      status: null,
      trip_token: null,
      is_active: false,
    };
    const { body } = await send(retraction, store);
    expect(body).toEqual({ accepted: 1, rejected: [] });
    expect([...store.rows.values()][0]).toMatchObject({ isActive: false, title: null, location: null });
  });

  it("keeps the #trip token's three known keys only", async () => {
    const store = fakeStore();
    await send(calendar({ trip_token: { distance_miles: 3, mode: "walk", duration_min: null, extra: "x" } }), store);
    expect([...store.rows.values()][0].tripToken).toEqual({ distance_miles: 3, mode: "walk", duration_min: null });
  });

  it("refuses a bad status, time, or token", async () => {
    for (const [field, value, reason] of [
      ["status", "tentative", "status"],
      ["starts_at", "soon", "starts_at"],
      ["trip_token", [1], "trip_token"],
      ["trip_token", { distance_miles: -1 }, "trip_token.distance_miles"],
      ["event_id", "evt:1", "event_id"],
    ] as const) {
      const { body } = await send(calendar({ [field]: value }));
      const id = field === "event_id" ? value : "cal:abc123";
      expect(body, field).toEqual({ accepted: 0, rejected: [{ event_id: id, reason: `invalid_event:${reason}` }] });
    }
  });

  it("accepts the shared signing vector's calendar batch byte for byte", async () => {
    const file = JSON.parse(readFileSync(new URL("../../tests/fixtures/witus-signing-vectors.json", import.meta.url), "utf8")) as {
      vectors: { name: string; request: { body: string; path_and_query: string; headers: Record<string, string> }; receiver: { secret: string; now: number } }[];
    };
    const v = file.vectors.find((x) => x.name === "post-calendar-activity");
    expect(v).toBeTruthy();
    const req = new Request(`https://ride.example${v!.request.path_and_query}`, { method: "POST", headers: v!.request.headers, body: v!.request.body });
    const store = fakeStore();
    const res = await receiveEvents(req, spec, { store, env: { CALENDAR_ACTIVITY_EVENTS_SECRET: v!.receiver.secret }, nowSeconds: v!.receiver.now });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accepted: 1, rejected: [] });
    expect([...store.rows.values()][0]).toMatchObject({ title: "Café meeting", location: "100 Main St", status: "confirmed" });
  });
});

describe("cost.matched fields", () => {
  const secret = SECRETS.FINANCE_MATCH_EVENTS_SECRET;
  const env = { FINANCE_MATCH_EVENTS_SECRET: secret };
  const spec = financeMatchSpec as unknown as EventTypeSpec<unknown, Row>;
  const send = async (event: Record<string, unknown>, store = fakeStore()) =>
    receiveEvents(post("/api/events/finance-match", JSON.stringify(event), { secret }), spec, { store, env, nowSeconds: NOW });

  it("keys one row per cost item: event_id must be match:<source_type>:<source_id>", async () => {
    const { body } = await send(match({ event_id: "match:fuel:OTHER" }));
    expect(body).toEqual({ accepted: 0, rejected: [{ event_id: "match:fuel:OTHER", reason: "invalid_event:event_id" }] });
  });

  it("stores an unmatch (matched: false) over the match", async () => {
    const store = fakeStore();
    await send(match(), store);
    await send(match({ occurred_at: "2026-10-31T15:00:00.000Z", matched: false, transaction_amount: null, transaction_currency: null, transaction_date: null, deep_link: null }), store);
    expect([...store.rows.values()][0]).toMatchObject({ matched: false, transactionAmount: null });
  });

  it("requires matched to be a boolean", async () => {
    const { body } = await send(match({ matched: "true" }));
    expect(body).toEqual({ accepted: 0, rejected: [{ event_id: "match:fuel:FUEL_1", reason: "invalid_event:matched" }] });
  });
});
