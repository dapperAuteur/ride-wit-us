/** The outbox store over Drizzle (lib/outbox/drain.ts OutboxStore). */
import "server-only";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { outboundEvents } from "@/db/schema";
import type { OutboundReceiver } from "./events";
import type { OutboxRow, OutboxStore } from "./drain";

export function drizzleOutboxStore(db: Db): OutboxStore {
  return {
    async due(now, limit, userId) {
      const rows = await db
        .select({
          id: outboundEvents.id,
          receiver: outboundEvents.receiver,
          eventId: outboundEvents.eventId,
          payload: outboundEvents.payload,
          occurredAt: outboundEvents.occurredAt,
          attempts: outboundEvents.attempts,
        })
        .from(outboundEvents)
        .where(
          and(
            eq(outboundEvents.status, "pending"),
            lte(outboundEvents.nextAttemptAt, now),
            userId ? eq(outboundEvents.userId, userId) : undefined
          )
        )
        .orderBy(asc(outboundEvents.nextAttemptAt))
        .limit(limit);
      return rows.map((r) => ({ ...r, receiver: r.receiver as OutboundReceiver, payload: r.payload as Record<string, unknown> })) satisfies OutboxRow[];
    },
    async apply(updates) {
      if (updates.length === 0) return;
      const statements = updates.map((u) =>
        db
          .update(outboundEvents)
          .set({
            status: u.status,
            attempts: u.attempts,
            nextAttemptAt: u.nextAttemptAt,
            lastStatus: u.lastStatus,
            lastReason: u.lastReason,
            sentAt: u.sentAt,
            updatedAt: sql`now()`,
          })
          // Only while the row still holds the payload that was sent.
          .where(and(eq(outboundEvents.id, u.id), eq(outboundEvents.occurredAt, u.occurredAt)))
      );
      await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
    },
  };
}
