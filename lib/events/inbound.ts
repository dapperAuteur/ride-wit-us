/**
 * The shared core of every event receiver CentenarianOS posts to (contract E5 to E7,
 * centenarian-os docs/integrations/ridewitus-contract.md §1 and §2). One route per event type, one
 * secret each (lib/signed/receiver.ts RECEIVERS); everything after the signature check is here:
 *
 *   1. Body: one event or `{ "events": [...] }`, at most 500. Not JSON, not that shape, or an event
 *      without a string `event_id` = 400 `invalid_body`; more than 500 = 400 `too_many_events`.
 *   2. Per event: the common fields (`event_id`, `event_type`, `schema_version`, `witus_sub`,
 *      `occurred_at`, `is_active`), then the type's own fields. A refusal names the event:
 *      `unsupported_schema_version` (major other than 1), `invalid_event:<field>`, `unknown_subject`
 *      (no RideWitUS user with that WitUS sub yet: the sender keeps the row pending).
 *   3. Identity: `witus_sub` → `users.id`, one query per batch.
 *   4. Upsert the latest state per `(user_id, event_id)`; an older `occurred_at` is accepted and
 *      ignored (lib/events/projections.ts). Two copies of one event in a batch collapse to the newer.
 *   5. Answer 200 `{ accepted, rejected: [{ event_id, reason }] }`. Rows not named are accepted.
 *
 * Unknown fields are ignored (CentenarianOS may add one at schema_version 1, such as `travel_hint`).
 * Logs carry counts and reasons only, never bodies, subs, secrets or signatures.
 */
import { errorEnvelope, receiveSigned, type Envelope, type ReceiverName } from "@/lib/signed/receiver";

export const MAX_EVENTS_PER_REQUEST = 500;
export const SUPPORTED_SCHEMA_MAJOR = 1;

/** Fields every event carries (contract §1, PRD §6.4). */
export interface CommonEvent {
  eventId: string;
  witusSub: string;
  occurredAt: Date;
  isActive: boolean;
}

/** A type's own parser: the parsed fields, or the first field that failed. */
export type FieldParse<T> = { ok: true; value: T } | { ok: false; field: string };

export interface EventTypeSpec<T, Row> {
  /** The receiver (secret and sender) this route serves. */
  receiver: ReceiverName;
  eventType: string;
  /** Checks the type's own fields. `common` is already valid. */
  parse(raw: Record<string, unknown>, common: CommonEvent): FieldParse<T>;
  /** The projection row for one accepted event. */
  toRow(event: CommonEvent & T, userId: string): Row;
}

export interface ProjectionWriter<Row> {
  /** `witus_sub` → RideWitUS `users.id`, for the subs that have one. */
  userIdsForSubs(subs: string[]): Promise<Map<string, string>>;
  /** Insert or replace, keeping the newer `occurred_at` (see lib/events/projections.ts). */
  upsert(rows: Row[]): Promise<void>;
}

export interface Rejection {
  event_id: string;
  reason: string;
}

export interface BatchAnswer {
  accepted: number;
  rejected: Rejection[];
}

// ---------------------------------------------------------------------------------------------
// Field checks, shared by the type parsers
// ---------------------------------------------------------------------------------------------

const DECIMAL = /^-?\d{1,12}(\.\d{1,2})?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const MAX_TEXT = 500;

/** Thrown inside a parser to name the field that failed; caught by `fields`. */
class FieldError extends Error {
  constructor(readonly field: string) {
    super(field);
  }
}

/** Reads a parser's fields; any `need*` that fails names its field. */
export function fields<T>(build: () => T): FieldParse<T> {
  try {
    return { ok: true, value: build() };
  } catch (err) {
    if (err instanceof FieldError) return { ok: false, field: err.field };
    throw err;
  }
}

/** Inside a `fields` parser: refuse the event, naming `field`. */
export function failField(field: string): never {
  throw new FieldError(field);
}

/** A non-empty string up to `max` characters. */
export function needText(raw: Record<string, unknown>, field: string, max = MAX_TEXT): string {
  const v = raw[field];
  if (typeof v !== "string" || v.trim() === "" || v.length > max) failField(field);
  return v;
}

/** A string up to `max` characters, or null when absent or null. */
export function optText(raw: Record<string, unknown>, field: string, max = MAX_TEXT): string | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || v.length > max) failField(field);
  return v;
}

export function optBoolean(raw: Record<string, unknown>, field: string): boolean | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  if (typeof v !== "boolean") failField(field);
  return v;
}

export function needBoolean(raw: Record<string, unknown>, field: string): boolean {
  const v = raw[field];
  if (typeof v !== "boolean") failField(field);
  return v;
}

/** A decimal amount as a string with at most 2 places ("48.12"); a finite number is accepted too. */
export function optDecimal(raw: Record<string, unknown>, field: string): string | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  if (typeof v !== "string" || !DECIMAL.test(v)) failField(field);
  return v;
}

export function needDecimal(raw: Record<string, unknown>, field: string): string {
  return optDecimal(raw, field) ?? failField(field);
}

export function optIsoDate(raw: Record<string, unknown>, field: string): string | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || !ISO_DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) failField(field);
  return v;
}

export function optTimestamp(raw: Record<string, unknown>, field: string): Date | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  const at = typeof v === "string" && v.length <= 64 ? new Date(v) : null;
  if (!at || Number.isNaN(at.getTime())) failField(field);
  return at;
}

export function needCurrency(raw: Record<string, unknown>, field: string): string {
  const v = raw[field];
  if (typeof v !== "string" || !CURRENCY.test(v)) failField(field);
  return v;
}

export function optCurrency(raw: Record<string, unknown>, field: string): string | null {
  const v = raw[field];
  if (v === undefined || v === null) return null;
  return needCurrency(raw, field);
}

/** An absolute http(s) URL, or null. Anything else (a `javascript:` link) is refused, not stored. */
export function optHttpUrl(raw: Record<string, unknown>, field: string): string | null {
  const v = optText(raw, field, 2048);
  if (v === null) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== "https:" && url.protocol !== "http:") failField(field);
  } catch (err) {
    if (err instanceof FieldError) throw err;
    failField(field);
  }
  return v;
}

/** Fails `event_id` unless `ok`. */
export function checkEventId(ok: boolean): void {
  if (!ok) failField("event_id");
}

// ---------------------------------------------------------------------------------------------
// Body and common fields
// ---------------------------------------------------------------------------------------------

export type BodyParse =
  | { ok: true; events: Record<string, unknown>[] }
  | { ok: false; code: "invalid_body" | "too_many_events" };

/** One event, or `{ events: [...] }`. Every element must be an object with a string event_id. */
export function parseBatchBody(text: string | null): BodyParse {
  let body: unknown;
  try {
    body = JSON.parse(text ?? "");
  } catch {
    return { ok: false, code: "invalid_body" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, code: "invalid_body" };
  const list = "events" in body ? (body as { events: unknown }).events : [body];
  if (!Array.isArray(list)) return { ok: false, code: "invalid_body" };
  if (list.length > MAX_EVENTS_PER_REQUEST) return { ok: false, code: "too_many_events" };
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, code: "invalid_body" };
    const id = (item as { event_id?: unknown }).event_id;
    if (typeof id !== "string" || id.length === 0 || id.length > 300) return { ok: false, code: "invalid_body" };
  }
  return { ok: true, events: list as Record<string, unknown>[] };
}

export type CommonParse = { ok: true; common: CommonEvent } | { ok: false; reason: string };

/** The fields every event carries. `is_active` absent = true (PRD §6.4). */
export function parseCommon(raw: Record<string, unknown>, eventType: string): CommonParse {
  const eventId = raw.event_id as string;
  if (raw.event_type !== eventType) return { ok: false, reason: "invalid_event:event_type" };
  const version = raw.schema_version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: "invalid_event:schema_version" };
  }
  if (version !== SUPPORTED_SCHEMA_MAJOR) return { ok: false, reason: "unsupported_schema_version" };
  const sub = raw.witus_sub;
  if (typeof sub !== "string" || sub.trim() === "" || sub.length > 255) return { ok: false, reason: "invalid_event:witus_sub" };
  const occurred = typeof raw.occurred_at === "string" && raw.occurred_at.length <= 64 ? new Date(raw.occurred_at) : null;
  if (!occurred || Number.isNaN(occurred.getTime())) return { ok: false, reason: "invalid_event:occurred_at" };
  const active = raw.is_active;
  if (active !== undefined && typeof active !== "boolean") return { ok: false, reason: "invalid_event:is_active" };
  return { ok: true, common: { eventId, witusSub: sub, occurredAt: occurred, isActive: active ?? true } };
}

// ---------------------------------------------------------------------------------------------
// The batch
// ---------------------------------------------------------------------------------------------

/**
 * Validate, resolve, collapse and write one batch. Throws only when the store throws (the route
 * answers 500 `lookup_failed`, and the sender retries the whole batch).
 */
export async function processBatch<T, Row>(
  spec: EventTypeSpec<T, Row>,
  events: Record<string, unknown>[],
  store: ProjectionWriter<Row>
): Promise<BatchAnswer> {
  const rejected: Rejection[] = [];
  const valid: { index: number; event: CommonEvent & T }[] = [];

  events.forEach((raw, index) => {
    const common = parseCommon(raw, spec.eventType);
    if (!common.ok) {
      rejected.push({ event_id: raw.event_id as string, reason: common.reason });
      return;
    }
    const own = spec.parse(raw, common.common);
    if (!own.ok) {
      rejected.push({ event_id: common.common.eventId, reason: `invalid_event:${own.field}` });
      return;
    }
    valid.push({ index, event: { ...own.value, ...common.common } });
  });

  const subs = [...new Set(valid.map((v) => v.event.witusSub))];
  const userIds = subs.length > 0 ? await store.userIdsForSubs(subs) : new Map<string, string>();

  // Newest copy per (user, event_id). An equal occurred_at goes to the later one in the batch, the
  // same "last write wins" the upsert applies across requests. Postgres also refuses to update one
  // row twice in a single INSERT ... ON CONFLICT, so duplicates must collapse here.
  const latest = new Map<string, { index: number; event: CommonEvent & T; userId: string }>();
  for (const v of valid) {
    const userId = userIds.get(v.event.witusSub);
    if (!userId) {
      rejected.push({ event_id: v.event.eventId, reason: "unknown_subject" });
      continue;
    }
    const key = `${userId}\u0000${v.event.eventId}`;
    const seen = latest.get(key);
    if (!seen || v.event.occurredAt.getTime() >= seen.event.occurredAt.getTime()) {
      latest.set(key, { ...v, userId });
    }
  }

  const rows = [...latest.values()].sort((a, b) => a.index - b.index).map((v) => spec.toRow(v.event, v.userId));
  if (rows.length > 0) await store.upsert(rows);

  return { accepted: events.length - rejected.length, rejected };
}

export interface ReceiveDeps<Row> {
  /** The store, or null when the database is not configured on this deployment. */
  store: ProjectionWriter<Row> | null;
  env?: Record<string, string | undefined>;
  nowSeconds?: number;
}

/**
 * The whole receiver: signature, body, batch. Returns the status and JSON to answer with, so the
 * route stays a two-line wrapper and the tests drive this directly.
 */
export async function receiveEvents<T, Row>(
  request: Request,
  spec: EventTypeSpec<T, Row>,
  deps: ReceiveDeps<Row>
): Promise<{ status: number; body: BatchAnswer | Envelope<never> }> {
  const signed = await receiveSigned(request, spec.receiver, { env: deps.env, nowSeconds: deps.nowSeconds });
  if (!signed.ok) return { status: signed.status, body: signed.envelope };

  const parsed = parseBatchBody(signed.body);
  if (!parsed.ok) {
    const message = parsed.code === "too_many_events" ? `At most ${MAX_EVENTS_PER_REQUEST} events per request` : "Invalid body";
    return { status: 400, body: errorEnvelope(parsed.code, message) };
  }

  if (!deps.store) {
    console.warn("[events] %s not_configured: no database", spec.receiver);
    return { status: 503, body: errorEnvelope("not_configured", "Not configured") };
  }

  try {
    const answer = await processBatch(spec, parsed.events, deps.store);
    const reasons = answer.rejected.reduce<Record<string, number>>((acc, r) => {
      const key = r.reason.split(":")[0];
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    console.info("[events] %s accepted=%d rejected=%j", spec.receiver, answer.accepted, reasons);
    return { status: 200, body: answer };
  } catch (err) {
    console.error("[events] %s lookup_failed: %s", spec.receiver, err instanceof Error ? err.name : "error");
    return { status: 500, body: errorEnvelope("lookup_failed", "Lookup failed") };
  }
}
