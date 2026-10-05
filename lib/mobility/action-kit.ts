import "server-only";
import { getMobilityContext, type MobilityContext } from "./context";
import type { FormState } from "./form-state";
import { REF_MESSAGES, type RefCheck } from "./ownership";

export type OkContext = Extract<MobilityContext, { state: "ok" }>;

/** The signed-in owner or member, or the envelope to return. Every mutation starts here. */
export async function requireMobilityOwner(): Promise<{ ok: true; ctx: OkContext } | { ok: false; state: FormState }> {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") {
    return { ok: false, state: { ok: false, error: "The mobility app isn't available right now.", code: ctx.state } };
  }
  return { ok: true, ctx };
}

/** Log the error class only (Drizzle errors carry query parameters) and return the envelope. */
export function databaseFailure(what: string, err: unknown): FormState {
  console.error("[mobility] %s failed err=%s", what, err instanceof Error ? err.name : "UnknownError");
  return { ok: false, error: "Couldn't save. Try again in a minute.", code: "database_error" };
}

export const NOT_FOUND: FormState = {
  ok: false,
  error: "That record isn't in your account. It may have been deleted.",
  code: "not_found",
};

/** Map a refused reference onto the form field it came from. */
export function refusedReference(check: Exclude<RefCheck, { ok: true }>, field: string): FormState {
  return {
    ok: false,
    error: REF_MESSAGES[check.kind],
    code: "forbidden_reference",
    fieldErrors: { [field]: REF_MESSAGES[check.kind] },
  };
}
