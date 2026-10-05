"use client";

import { useRef, useSyncExternalStore } from "react";
import { FieldShell } from "./form-kit";
import { BTN_SECONDARY, INPUT } from "./styles";

const NO_ZONES: readonly string[] = [];
let zoneCache: readonly string[] | null = null;

function browserZones(): readonly string[] {
  if (!zoneCache) {
    try {
      zoneCache = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? NO_ZONES;
    } catch {
      zoneCache = NO_ZONES;
    }
  }
  return zoneCache;
}

const noSubscribe = () => () => {};

/**
 * An IANA time zone, typed with suggestions, plus a button that fills in this device's zone. The
 * device zone is read only on click, so server and client render the same markup.
 */
export function TimeZoneField({
  name,
  label,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Suggestions come from the browser after hydration; the server renders none, so markup matches.
  const zones = useSyncExternalStore(noSubscribe, browserZones, () => NO_ZONES);
  const listId = `${name}-zones`;
  const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell name={name} label={label} hint={hint} error={error} optional>
      <div className="mt-1 flex flex-col sm:flex-row gap-2">
        <input
          ref={ref}
          id={name}
          name={name}
          type="text"
          list={listId}
          autoComplete="off"
          maxLength={64}
          defaultValue={defaultValue ?? ""}
          placeholder="America/Chicago"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT} mt-0 sm:flex-1`}
        />
        <button
          type="button"
          className={BTN_SECONDARY}
          onClick={() => {
            if (ref.current) ref.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }}
        >
          Use this device&apos;s zone
        </button>
      </div>
      <datalist id={listId}>
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </FieldShell>
  );
}
