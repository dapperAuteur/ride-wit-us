/**
 * Who may use the mobility app (PRD §5.12, owner answer §13 Q11: BAM alone at first).
 *
 * The owner is whoever ADMIN_EMAIL names, decided per request (lib/auth/admin.ts), never a stored
 * flag: if ADMIN_EMAIL changes, the old owner loses access on their next request. `member` is the
 * only access that is granted by a stored value, and only the owner can grant it (a later phase).
 * Everyone else signed in is `waitlisted`.
 */
export type MobilityAccess = "owner" | "member" | "waitlisted";

/** The access value to store for this user on this request. Pure. */
export function resolveAccess(stored: MobilityAccess | null | undefined, isAdmin: boolean): MobilityAccess {
  if (isAdmin) return "owner";
  return stored === "member" ? "member" : "waitlisted";
}

export function canUseMobility(access: MobilityAccess): boolean {
  return access === "owner" || access === "member";
}
