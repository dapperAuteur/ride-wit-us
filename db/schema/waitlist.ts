import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const waitlistStatus = pgEnum("waitlist_status", ["waiting", "invited", "declined"]);

/**
 * Public waitlist for the mobility app (PRD §5.12, owner answer §13 Q11). One row per address,
 * stored lowercased. A repeat signup updates the note and does not notify the owner again;
 * `notified_at` records that the WitUS Inbox accepted the notification.
 */
export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  note: text("note"),
  status: waitlistStatus("status").notNull().default("waiting"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Fixed-window rate-limit counters, shared by any public write endpoint. `key` is a scope plus an
 * HMAC of the client IP (lib/rate-limit.ts), so no raw IP address is stored.
 */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
