import { index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * A pointer to a vendor that lives in CentenarianOS (`user_contacts` with contact_type 'vendor',
 * and optionally one of its `contact_locations`). PRD §5.11: vendors are READ from CentenarianOS,
 * never duplicated, so this table deliberately has no name, address, phone, or email column.
 * RideWitUS's own service history at a vendor is the set of fuel, maintenance, and trip rows that
 * reference one of these.
 */
export const vendorRefs = pgTable(
  "vendor_refs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    centosContactId: uuid("centos_contact_id").notNull(),
    centosLocationId: uuid("centos_location_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_refs_user_idx").on(t.userId),
    unique("vendor_refs_user_contact_location_key")
      .on(t.userId, t.centosContactId, t.centosLocationId)
      .nullsNotDistinct(),
  ]
);
