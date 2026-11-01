import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * The outbox for facts RideWitUS sends to CentenarianOS (PRD §6.7, CentenarianOS plan 70 R-4,
 * contract E8 and E9). Every write that changes an emitted fact queues its event in the SAME
 * database transaction (lib/outbox/enqueue.ts, `db.batch`), so a trip is never saved without its
 * event and an event never names a write that rolled back.
 *
 * One row per `(receiver, event_id)`: the latest state of that fact. Queuing it again replaces the
 * payload and makes it due now, unless the stored payload is newer (`occurred_at`). The drain
 * (lib/outbox/drain.ts) sends due rows in batches of up to 500 per receiver.
 *
 *   status    pending (due at next_attempt_at), sent, failed (gave up; needs a person)
 *   attempts  failed sends so far; the backoff is 1 min, 5 min, 30 min, 2 h, 12 h, then failed.
 *             `unknown_subject` (the person has not signed in to CentenarianOS yet) waits on the
 *             same ladder at 12 h and never fails.
 */
export const outboundEvents = pgTable(
  "outbound_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `centos.mobility_activity` or `centos.mobility_cost` (lib/outbox/receivers.ts). */
    receiver: text("receiver").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    /** HTTP status of the last try (0 = no answer). */
    lastStatus: integer("last_status"),
    /** Short reason of the last refusal or failure: a code, never a body. */
    lastReason: text("last_reason"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("outbound_events_receiver_event_key").on(t.receiver, t.eventId),
    index("outbound_events_due_idx").on(t.status, t.nextAttemptAt),
    index("outbound_events_user_idx").on(t.userId),
    check("outbound_events_status_known", sql`${t.status} IN ('pending', 'sent', 'failed')`),
  ]
);
