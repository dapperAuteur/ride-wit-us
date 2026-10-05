import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings, users } from "@/db/schema";
import { isAdminEmail } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/dal";
import type { SessionUser } from "@/lib/auth/session";
import { databaseConfigured } from "@/lib/db/config";
import { canUseMobility, resolveAccess, type MobilityAccess } from "./access";
import { DEFAULT_SETTINGS, type MobilitySettings } from "./settings-schema";

export interface MobilityUser {
  id: string;
  witusSub: string;
  email: string;
  displayName: string | null;
  access: MobilityAccess;
  isDemo: boolean;
}

/**
 * Everything a /app page needs to decide what to render. Pages switch on `state` and render
 * <MobilityGate> for anything but "ok", so a missing database or a waitlisted user never reaches a
 * query (PRD §14: mobility routes fail closed).
 */
export type MobilityContext =
  | { state: "no_database"; session: SessionUser }
  | { state: "database_error"; session: SessionUser }
  | { state: "waitlisted"; session: SessionUser }
  | { state: "ok"; session: SessionUser; user: MobilityUser; settings: MobilitySettings; hasSavedSettings: boolean };

/** Upsert the signed-in identity, keyed by witus_sub, and return the row with today's access. */
async function upsertUser(session: SessionUser): Promise<MobilityUser> {
  const db = getDb();
  const existing = await db
    .select({ access: users.access })
    .from(users)
    .where(eq(users.witusSub, session.sub))
    .limit(1);
  const access = resolveAccess(existing[0]?.access, isAdminEmail(session.email));
  const [row] = await db
    .insert(users)
    .values({ witusSub: session.sub, email: session.email, displayName: session.name ?? null, access, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: users.witusSub,
      set: {
        email: session.email,
        displayName: session.name ?? null,
        access,
        lastSeenAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return {
    id: row.id,
    witusSub: row.witusSub,
    email: row.email,
    displayName: row.displayName,
    access: row.access,
    isDemo: row.isDemo,
  };
}

/** Memoized per request: the layout and the page share one lookup. Redirects to /signin if signed out. */
export const getMobilityContext = cache(async (): Promise<MobilityContext> => {
  const session = await requireUser();
  if (!databaseConfigured()) return { state: "no_database", session };
  try {
    const user = await upsertUser(session);
    if (!canUseMobility(user.access)) return { state: "waitlisted", session };
    const [saved] = await getDb().select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
    const settings: MobilitySettings = saved
      ? { unitSystem: saved.unitSystem as MobilitySettings["unitSystem"], homeCurrency: saved.homeCurrency, timeZone: saved.timeZone }
      : DEFAULT_SETTINGS;
    return { state: "ok", session, user, settings, hasSavedSettings: !!saved };
  } catch (err) {
    // Class name only: Drizzle errors carry query parameters, which include the email.
    console.error("[mobility] context failed err=%s", err instanceof Error ? err.name : "UnknownError");
    return { state: "database_error", session };
  }
});
