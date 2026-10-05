"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { DISPLAY_UNITS, SPOKEN_UNITS, fromCanonical, toCanonical, type UnitSystem } from "@/lib/units/convert";
import type { FormState } from "@/lib/mobility/form-state";
import { useUnits } from "@/components/units/units-provider";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, ERROR_TEXT, INPUT, MUTED } from "./styles";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wires a form to a server action without React's automatic form reset, so a validation error
 * keeps everything the user typed. After an error, focus moves to the first invalid field (or the
 * form-level alert) so keyboard and screen-reader users land on the problem.
 */
export function useMobilityForm(action: Action) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state.ok || !formRef.current) return;
    const target =
      formRef.current.querySelector<HTMLElement>("[aria-invalid='true']") ??
      formRef.current.querySelector<HTMLElement>("[data-form-error]");
    target?.focus();
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return { state, pending, onSubmit, formRef, errors };
}

function describedBy(name: string, hint?: ReactNode, error?: string): string | undefined {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

interface FieldShellProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label, hint, control, and an error announced with role="alert". */
export function FieldShell({ name, label, hint, error, optional, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="font-semibold text-[#221E1B]">
        {label}
        {optional ? <span className={`font-normal ${MUTED}`}> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className={`text-sm ${MUTED}`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${name}-error`} role="alert" className={`mt-1 ${ERROR_TEXT}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  name: string;
  label: ReactNode;
  defaultValue?: string | number | null;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  type?: "text" | "date" | "datetime-local" | "url" | "number";
  inputMode?: "text" | "decimal" | "numeric" | "url";
  maxLength?: number;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
  list?: string;
  step?: string;
}

export function TextField({
  name,
  label,
  defaultValue,
  error,
  hint,
  optional,
  type = "text",
  inputMode,
  maxLength,
  autoComplete = "off",
  className,
  inputClassName,
  list,
  step,
}: TextFieldProps) {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        list={list}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${INPUT} ${inputClassName ?? ""}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  error,
  hint,
  rows = 3,
  maxLength,
}: {
  name: string;
  label: ReactNode;
  defaultValue?: string | null;
  error?: string;
  hint?: ReactNode;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} optional>
      <textarea
        id={name}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${INPUT} py-2`}
      />
    </FieldShell>
  );
}

export interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps extends Pick<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  name: string;
  label: ReactNode;
  options: readonly Option[];
  defaultValue?: string | null;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  /** Label of the empty choice, shown when the field is optional. */
  emptyLabel?: string;
  className?: string;
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  error,
  hint,
  optional,
  emptyLabel = "None",
  className,
  onChange,
  value,
}: SelectFieldProps) {
  const controlled = value !== undefined;
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select
        id={name}
        name={name}
        {...(controlled ? { value } : { defaultValue: defaultValue ?? "" })}
        onChange={onChange}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={INPUT}
      >
        {optional ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="mt-3 h-5 w-5 shrink-0 accent-[#221E1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
      />
      <div>
        <label htmlFor={name} className="inline-flex items-center min-h-11 font-semibold text-[#221E1B]">
          {label}
        </label>
        {hint ? (
          <p id={`${name}-hint`} className={`text-sm ${MUTED}`}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** An amount and the currency it was paid in, side by side. The currency pre-fills from settings. */
export function MoneyFields({
  amountName,
  currencyName,
  label,
  defaultAmount,
  defaultCurrency,
  errors,
  hint = "Enter it in the currency you paid in. RideWitUS keeps it as entered and never converts.",
}: {
  amountName: string;
  currencyName: string;
  label: string;
  defaultAmount?: string | null;
  defaultCurrency?: string | null;
  errors: Record<string, string>;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="font-semibold text-[#221E1B]">
        {label} <span className={`font-normal ${MUTED}`}>(optional)</span>
      </legend>
      <p id={`${amountName}-hint`} className={`text-sm ${MUTED}`}>
        {hint}
      </p>
      <div className="mt-1 flex flex-col sm:flex-row gap-3">
        <TextField
          name={amountName}
          label="Amount"
          optional
          inputMode="decimal"
          maxLength={16}
          defaultValue={defaultAmount}
          error={errors[amountName]}
          className="flex-1"
        />
        <TextField
          name={currencyName}
          label="Currency"
          optional
          maxLength={3}
          defaultValue={defaultCurrency}
          error={errors[currencyName]}
          hint="USD, MXN, EUR…"
          className="sm:w-40"
          inputClassName="uppercase"
        />
      </div>
    </fieldset>
  );
}

/** The unit system the distance fields were showing when the form was sent. Render once per form. */
export function UnitsHiddenInput() {
  const { system } = useUnits();
  return <input type="hidden" name="inputUnits" value={system} />;
}

function roundForInput(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

function convertText(text: string, from: UnitSystem, to: UnitSystem): string {
  const n = Number(text.replace(/,/g, ""));
  if (!text.trim() || !Number.isFinite(n)) return text;
  return roundForInput(fromCanonical(toCanonical(n, "distance", from), "distance", to));
}

/**
 * A distance typed in the page's current units. Flipping the page's units toggle converts what is
 * already typed, so the number always matches the unit shown beside it. Stored as meters.
 */
export function DistanceField({
  name,
  label,
  defaultMeters,
  error,
  hint,
}: {
  name: string;
  label: string;
  defaultMeters?: number | null;
  error?: string;
  hint?: ReactNode;
}) {
  const { system } = useUnits();
  const [field, setField] = useState(() => ({
    text: defaultMeters == null ? "" : roundForInput(fromCanonical(defaultMeters, "distance", system)),
    system,
  }));
  if (field.system !== system) {
    // Adjusting state from a changed input during render (React's documented pattern).
    setField({ text: convertText(field.text, field.system, system), system });
  }
  const unit = DISPLAY_UNITS.distance[system];
  return (
    <FieldShell
      name={name}
      label={
        <>
          {label} <span aria-hidden="true">({unit})</span>
          <span className="sr-only">in {SPOKEN_UNITS.distance[system]}</span>
        </>
      }
      hint={hint}
      error={error}
      optional
    >
      <input
        id={name}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        maxLength={16}
        value={field.text}
        onChange={(e) => setField({ text: e.target.value, system })}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${INPUT} max-w-[12rem]`}
      />
    </FieldShell>
  );
}

/** Submit button, a polite success line, and the form-level error. */
export function FormFooter({ pending, state, submitLabel }: { pending: boolean; state: FormState; submitLabel: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-[#221E1B]">
          {state?.ok ? state.message : ""}
        </p>
      </div>
      {state && !state.ok ? (
        <p role="alert" tabIndex={-1} data-form-error className={ERROR_TEXT}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Delete in two steps without a browser confirm() dialog (zero-alert policy): the first press
 * reveals "Yes, delete" and "Keep it", and focus moves to the safe choice.
 */
export function DeleteButton({
  action,
  label,
  warning,
}: {
  action: () => Promise<FormState>;
  label: string;
  warning: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, dispatch, pending] = useActionState<FormState, void>(() => action(), null);
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <button type="button" className={BTN_DANGER} onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <p className="text-sm text-[#221E1B]">{warning}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" disabled={pending} className={BTN_DANGER} onClick={() => startTransition(() => dispatch())}>
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button ref={keepRef} type="button" className={BTN_SECONDARY} onClick={() => setConfirming(false)}>
          Keep it
        </button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className={ERROR_TEXT}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
