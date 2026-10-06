import type { FieldErrors } from "./form-kit";

/**
 * What every mobility server action returns: the ecosystem `{ ok, error, code }` envelope, plus
 * per-field messages for the form. Successful creates redirect instead of returning.
 */
export type FormState =
  | null
  | { ok: true; message: string }
  | { ok: false; error: string; code: string; fieldErrors?: FieldErrors };

export const INVALID = (fieldErrors: FieldErrors): FormState => ({
  ok: false,
  error: "Check the highlighted fields.",
  code: "invalid_input",
  fieldErrors,
});
