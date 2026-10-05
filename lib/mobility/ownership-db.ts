import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { journeys, places, vehicles } from "@/db/schema";
import type { OwnedIdLoader, RefKind } from "./ownership";

const TABLES = { vehicle: vehicles, place: places, journey: journeys } as const;

/** The database-backed loader for verifyOwnedRefs: ids of `kind` that `userId` owns. */
export function ownedIdLoader(userId: string): OwnedIdLoader {
  return async (kind: RefKind, ids: string[]) => {
    const table = TABLES[kind];
    const rows = await getDb()
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.userId, userId), inArray(table.id, ids)));
    return new Set(rows.map((r) => r.id));
  };
}
