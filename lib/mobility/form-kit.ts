/**
 * Small zod builders shared by the mobility form parsers. Every builder treats a blank string as
 * "not given", so an empty optional input stores NULL rather than "". Pure.
 */
import { z } from "zod";

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors };

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isIsoDate(v: string): boolean {
  const m = ISO_DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export const blank = (v: unknown): unknown => {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  return v;
};

export const optText = (max: number) =>
  z.preprocess(blank, z.string().max(max, `Keep this under ${max} characters.`).nullable());

export const reqText = (max: number, required: string) =>
  z.preprocess(blank, z.string({ error: required }).min(1, required).max(max, `Keep this under ${max} characters.`));

export const reqEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blank, z.enum(values, { error: message }));

export const optEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blank, z.enum(values, { error: message }).nullable());

export const optUuid = (message: string) => z.preprocess(blank, z.string().regex(UUID_RE, message).nullable());

export const reqDate = (required: string) =>
  z.preprocess(blank, z.string({ error: required }).refine(isIsoDate, "Use a date like 2026-10-05."));

export const optDate = () => z.preprocess(blank, z.string().refine(isIsoDate, "Use a date like 2026-10-05.").nullable());

const toNumber = (v: unknown): unknown => {
  const b = blank(v);
  if (b == null) return null;
  return typeof b === "string" ? Number(b.replace(/,/g, "")) : b;
};

export const optNumber = (min: number, max: number, message: string) =>
  z.preprocess(toNumber, z.number({ error: message }).min(min, message).max(max, message).nullable());

export const optInt = (min: number, max: number, message: string) =>
  z.preprocess(toNumber, z.number({ error: message }).int(message).min(min, message).max(max, message).nullable());

export const checkbox = () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** numeric(12,2): up to ten whole digits and two decimals, kept as a string so no float error. */
export const optAmount = () =>
  z.preprocess(
    (v) => {
      const b = blank(v);
      return typeof b === "string" ? b.replace(/,/g, "") : b;
    },
    z
      .string()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Use an amount like 12.50.")
      .nullable()
  );

export const optCurrency = () =>
  z.preprocess(
    blank,
    z
      .string()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, for example USD or MXN."))
      .nullable()
  );

/** First message per field, keyed by the top-level field name. */
export function collectErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData → plain record of its string values (files are ignored; these forms have none). */
export function formToRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !(k in out)) out[k] = v;
  }
  return out;
}
