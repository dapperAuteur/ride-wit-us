/**
 * Queue events in the same transaction as the write that caused them (PRD §6.7). Callers put the
 * statement this returns into one `db.batch([...])` with their own write; Neon's HTTP driver runs a
 * batch as a single transaction, so both land or neither does.
 *
 * One row per `(receiver, event_id)`: queuing again replaces the payload and makes the row due now
 * (attempts back to 0), unless the stored row is newer (an older `occurred_at` changes nothing).
 */
import "server-only";
import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { outboundEvents } from "@/db/schema";
import type { QueuedEvent } from "./events";

export function enqueueStatement(db: Db, userId: string, events: QueuedEvent[]) {
  if (events.length === 0) return null;
  return db
    .insert(outboundEvents)
    .values(
      events.map((e) => ({
        userId,
        receiver: e.receiver,
        eventId: e.eventId,
        eventType: e.eventType,
        payload: e.payload,
        occurredAt: e.occurredAt,
      }))
    )
    .onConflictDoUpdate({
      target: [outboundEvents.receiver, outboundEvents.eventId],
      set: {
        userId: sql`excluded.user_id`,
        eventType: sql`excluded.event_type`,
        payload: sql`excluded.payload`,
        occurredAt: sql`excluded.occurred_at`,
        status: "pending",
        attempts: 0,
        nextAttemptAt: sql`now()`,
        lastStatus: null,
        lastReason: null,
        sentAt: null,
        updatedAt: sql`now()`,
      },
      setWhere: sql`${outboundEvents.occurredAt} <= excluded.occurred_at`,
    });
}
