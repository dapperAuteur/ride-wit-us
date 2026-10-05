import { sql } from "drizzle-orm";
import { index, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const placeKind = pgEnum("place_kind", ["home", "work", "gym", "venue", "other"]);

/**
 * Saved places (PRD §5.8). `aliases` lets "Blue Note" and "Blue Note Jazz Club, 131 W 3rd St"
 * resolve to one place when matching calendar locations. The home place is never sent to
 * CentenarianOS, and events carry no coordinates (PRD §6.1, §14).
 */
export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: placeKind("kind").notNull().default("other"),
    address: text("address"),
    lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }),
    lng: numeric("lng", { precision: 9, scale: 6, mode: "number" }),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("places_user_idx").on(t.userId), unique("places_user_label_key").on(t.userId, t.label)]
);
