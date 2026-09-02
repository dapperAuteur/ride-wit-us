/**
 * Who counts as an admin.
 *
 * ONE address, from `ADMIN_EMAIL`, compared case-insensitively against the signed-in session's
 * email. This matches how every other admin-gated app in the ecosystem does it (witus.online's
 * `lib/admin-auth.ts`, VoGoat, Centenarian Coach, WitUS Inbox), deliberately: a second, cleverer
 * scheme here would be one more thing to get wrong in the one place it must not be got wrong.
 *
 * WHY AN ENV VAR AND NOT A ROLE ON THE SESSION. The session is minted from the WitUS IdP's
 * claims, and the IdP does not know or assert anything about who administers THIS app. Trusting a
 * claim for authorization would mean any WitUS account could become an admin here the day the IdP
 * grew a `role` claim for some other purpose. The address is the whole of the trust decision and
 * it lives on this side.
 *
 * FAILS CLOSED. Unset or blank `ADMIN_EMAIL` means NOBODY is an admin, not everybody. An
 * unprovisioned deploy locks the door rather than opening it.
 *
 * There is still no user table. Admin is a property of one configured address, not a stored row.
 */
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./dal";
import type { SessionUser } from "./session";

/** The configured admin address, lowercased, or null when unset/blank. */
export function adminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL;
  const trimmed = raw?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/**
 * Is this address the admin? Pure, so the tests can drive it directly.
 *
 * Both sides are lowercased before comparing. The local part of an email is technically
 * case-sensitive, but no real provider treats it so, and an admin who signs in as `BAM@…` and is
 * refused would be a bug, not a security win.
 */
export function isAdminEmail(email: string | null | undefined, configured = adminEmail()): boolean {
  if (!configured) return false;
  const candidate = email?.trim().toLowerCase();
  return !!candidate && candidate === configured;
}

/** Is the currently signed-in user the admin? False when nobody is signed in. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminEmail(user?.email);
}

/**
 * For pages: return the user when they are the admin, otherwise leave.
 *
 * A signed-in non-admin is sent to "/" rather than to /signin: they are not short of a session,
 * they are short of permission, and bouncing them to a sign-in form they have already completed
 * reads as a broken loop.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isAdminEmail(user.email)) redirect("/");
  return user;
}

/**
 * For Route Handlers: `{ user }`, or a response to return as-is.
 *
 * 401 when unauthenticated, 403 when signed in but not the admin — the distinction matters to a
 * caller, and both bodies match this repo's `{ ok: false, error }` shape.
 */
export async function requireApiAdmin(): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  return { user };
}
