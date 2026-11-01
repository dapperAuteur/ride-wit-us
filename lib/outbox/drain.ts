/**
 * Send due outbox rows to CentenarianOS (PRD §6.7; contract §1 and §2). Runs from the cron route
 * and right after a write (for that user only). Never throws for a peer problem: every outcome is
 * written back to the row.
 *
 *   2xx                every row the answer does not name is sent; named rows:
 *                        unknown_subject  → pending, on the backoff, never failed (the person has not
 *                                           signed in to CentenarianOS yet)
 *                        anything else    → failed (unsupported_schema_version, invalid_event:<field>)
 *   400                the batch shape is wrong; resending the same body cannot help → failed
 *   401, 5xx, 0, 429   retry on the backoff (1 min, 5 min, 30 min, 2 h, 12 h), then failed
 *   URL or secret unset  the receiver is skipped; rows stay pending and untouched
 *
 * A row is updated only if it still holds the payload that was sent (`occurred_at` unchanged), so a
 * write that re-queued the fact mid-send is not marked sent with the old payload.
 * Logs carry receivers, counts and statuses only: never payloads, subs, secrets or signatures.
 */
import { postSigned, type FetchLike, type SignedResult } from "@/lib/signed/client";
import { rejectedIds } from "@/lib/signed/rejected";
import { SOURCE } from "@/lib/signed/receiver";
import type { OutboundReceiver } from "./events";
import { OUTBOUND_RECEIVERS, outboundTarget } from "./receivers";

export const BATCH_SIZE = 500;
/** Backoff after the 1st, 2nd, ... failed send. After the last, the row fails. */
export const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000];
export const DRAIN_TIMEOUT_MS = 10_000;

export interface OutboxRow {
  id: string;
  receiver: OutboundReceiver;
  eventId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  attempts: number;
}

export interface RowUpdate {
  id: string;
  /** Guard: update only while the row still holds this payload. */
  occurredAt: Date;
  status: "pending" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lastStatus: number;
  lastReason: string | null;
  sentAt: Date | null;
}

export interface OutboxStore {
  /** Pending rows due by `now`, oldest first, optionally one user's. */
  due(now: Date, limit: number, userId?: string): Promise<OutboxRow[]>;
  apply(updates: RowUpdate[]): Promise<void>;
}

export interface DrainReport {
  receiver: OutboundReceiver;
  sent: number;
  retrying: number;
  waiting: number;
  failed: number;
  skipped: number;
}

export interface DrainOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  now?: Date;
  userId?: string;
  /** Rows read per drain (all receivers together). */
  limit?: number;
  nowSeconds?: number;
}

/** The retry decision after a failed attempt: the next time, or failed when the ladder is done. */
export function backoff(attemptsSoFar: number, now: Date, neverFail = false): { status: "pending" | "failed"; attempts: number; next: Date } {
  const attempts = attemptsSoFar + 1;
  const delay = BACKOFF_MS[attempts - 1];
  if (delay === undefined) {
    if (neverFail) return { status: "pending", attempts, next: new Date(now.getTime() + BACKOFF_MS[BACKOFF_MS.length - 1]) };
    return { status: "failed", attempts, next: now };
  }
  return { status: "pending", attempts, next: new Date(now.getTime() + delay) };
}

function errorCode(result: SignedResult): string {
  const body = result.body && typeof result.body === "object" ? (result.body as Record<string, unknown>) : null;
  if (typeof body?.code === "string") return body.code.slice(0, 60);
  return result.error ?? `http_${result.status}`;
}

/** What happens to each row of one sent batch. Pure. */
export function outcomes(batch: OutboxRow[], result: SignedResult, now: Date): RowUpdate[] {
  const base = (row: OutboxRow) => ({ id: row.id, occurredAt: row.occurredAt, lastStatus: result.status });
  if (result.ok) {
    const rejected = rejectedIds(result.body, batch.map((r) => r.eventId));
    return batch.map((row) => {
      const reason = rejected.get(row.eventId);
      if (reason === undefined) {
        return { ...base(row), status: "sent", attempts: row.attempts, nextAttemptAt: now, lastReason: null, sentAt: now };
      }
      if (reason === "unknown_subject") {
        const next = backoff(row.attempts, now, true);
        return { ...base(row), status: "pending", attempts: next.attempts, nextAttemptAt: next.next, lastReason: reason, sentAt: null };
      }
      return { ...base(row), status: "failed", attempts: row.attempts + 1, nextAttemptAt: now, lastReason: reason.slice(0, 120), sentAt: null };
    });
  }
  const code = errorCode(result);
  if (result.status === 400) {
    return batch.map((row) => ({ ...base(row), status: "failed", attempts: row.attempts + 1, nextAttemptAt: now, lastReason: code, sentAt: null }));
  }
  return batch.map((row) => {
    const next = backoff(row.attempts, now);
    return { ...base(row), status: next.status, attempts: next.attempts, nextAttemptAt: next.next, lastReason: code, sentAt: null };
  });
}

/** Send what is due. Returns one report per receiver that had rows. */
export async function drainOutbox(store: OutboxStore, options: DrainOptions = {}): Promise<DrainReport[]> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const rows = await store.due(now, options.limit ?? BATCH_SIZE * 4, options.userId);
  const reports: DrainReport[] = [];

  for (const receiver of Object.keys(OUTBOUND_RECEIVERS) as OutboundReceiver[]) {
    const mine = rows.filter((r) => r.receiver === receiver);
    if (mine.length === 0) continue;
    const report: DrainReport = { receiver, sent: 0, retrying: 0, waiting: 0, failed: 0, skipped: 0 };
    reports.push(report);
    const target = outboundTarget(receiver, env);
    if (!target) {
      report.skipped = mine.length;
      console.warn("[outbox] %s not_configured: %d row(s) stay pending", receiver, mine.length);
      continue;
    }
    for (let i = 0; i < mine.length; i += BATCH_SIZE) {
      const batch = mine.slice(i, i + BATCH_SIZE);
      const result = await postSigned(
        target.url,
        { events: batch.map((r) => r.payload) },
        { secret: target.secret, source: SOURCE.rideWitus, fetchImpl: options.fetchImpl, timeoutMs: DRAIN_TIMEOUT_MS, nowSeconds: options.nowSeconds }
      );
      const updates = outcomes(batch, result, now);
      await store.apply(updates);
      for (const u of updates) {
        if (u.status === "sent") report.sent += 1;
        else if (u.status === "failed") report.failed += 1;
        else if (u.lastReason === "unknown_subject") report.waiting += 1;
        else report.retrying += 1;
      }
    }
    console.info("[outbox] %s sent=%d retrying=%d waiting=%d failed=%d", receiver, report.sent, report.retrying, report.waiting, report.failed);
  }
  return reports;
}
