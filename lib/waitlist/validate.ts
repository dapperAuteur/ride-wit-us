/**
 * Waitlist input validation and the WitUS Inbox submission it produces. Pure.
 */
import { z } from "zod";

import { NOTE_MAX } from "./constants";

export { NOTE_MAX };

export interface WaitlistInput {
  email: string;
  note: string | null;
}

const schema = z.object({
  email: z
    .string({ error: "Enter your email address." })
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter an email address like name@example.com.")),
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`).nullable().optional()
  ),
});

export type WaitlistParse =
  | { ok: true; data: WaitlistInput }
  | { ok: false; field: "email" | "note"; error: string };

export function parseWaitlist(input: unknown): WaitlistParse {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const result = schema.safeParse({ email: body.email ?? "", note: body.note ?? null });
  if (result.success) return { ok: true, data: { email: result.data.email, note: result.data.note ?? null } };
  const issue = result.error.issues[0];
  const field = issue?.path[0] === "note" ? "note" : "email";
  return { ok: false, field, error: issue?.message ?? "Check the form and try again." };
}

/**
 * Bots fill every field; people never see this one. A filled honeypot gets the same success
 * response as a real signup and nothing is stored.
 */
export function isHoneypotFilled(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const v = (input as Record<string, unknown>).website;
  return typeof v === "string" && v.trim().length > 0;
}

export const WAITLIST_FORM_TYPE = "ride_waitlist_signup";

/**
 * The submission sent to WitUS Inbox, in the shape its `/api/ingest` validates
 * (claude/witus-inbox app/api/ingest/route.ts): form_type, optional submitter_email, priority,
 * and a `payload` object.
 */
export function buildWaitlistInboxSubmission(entry: WaitlistInput & { joinedAt: Date }) {
  return {
    form_type: WAITLIST_FORM_TYPE,
    submitter_email: entry.email,
    priority: "normal" as const,
    payload: {
      app: "RideWitUS",
      list: "mobility_app_waitlist",
      email: entry.email,
      note: entry.note,
      joined_at: entry.joinedAt.toISOString(),
    },
  };
}
