"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { LinkVendorResult, VendorSearchResult } from "@/app/app/vendors/actions";
import type { VendorChoice } from "@/lib/centos/vendors";
import { BTN_SECONDARY, ERROR_TEXT, INPUT, MUTED, TEXT_LINK } from "./styles";

/** Typing waits this long before searching (contract E1: RideWitUS debounces at 300 ms). */
export const VENDOR_SEARCH_DEBOUNCE_MS = 300;

/**
 * Pick a vendor from CentenarianOS. Searches as you type (debounced), lists matches with each
 * location as its own choice, and links the one picked (a `vendor_refs` row). RideWitUS never
 * creates vendors: "Not listed?" opens CentenarianOS's own new-vendor form.
 *
 * In a form, pass `name`: the picked ref id goes in a hidden input of that name. On the Vendors
 * page, `link` is the add action, which opens the new vendor's page.
 *
 * `onLinked` hears each successful pick, with what CentenarianOS says about the vendor, so the trip
 * form can fill its empty fields from it (lib/mobility/vendor-fill.ts).
 */
export function VendorPicker({
  name,
  label,
  initial,
  search,
  link,
  onLinked,
  error,
}: {
  name?: string;
  label: string;
  initial: { refId: string; label: string } | null;
  search: (q: string) => Promise<VendorSearchResult>;
  link: (contactId: string, locationId: string | null) => Promise<LinkVendorResult>;
  onLinked?: (linked: Extract<LinkVendorResult, { ok: true }>) => void;
  error?: string;
}) {
  const id = useId();
  const inputId = `${id}-q`;
  const statusId = `${id}-status`;
  const [picked, setPicked] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<VendorSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, startLinking] = useTransition();
  const latest = useRef(0);

  useEffect(() => {
    if (!open) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const answer = await search(query);
        if (ticket === latest.current) setResult(answer);
      } catch {
        if (ticket === latest.current) {
          setResult({ ok: false, title: "CentenarianOS isn't reachable right now", body: "Try again in a few minutes.", code: "unavailable" });
        }
      } finally {
        if (ticket === latest.current) setSearching(false);
      }
    }, VENDOR_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, query, search]);

  const choose = (choice: VendorChoice) => {
    setLinkError(null);
    startLinking(async () => {
      const linked = await link(choice.contactId, choice.locationId);
      if (!linked.ok) {
        setLinkError(linked.error);
        return;
      }
      setPicked({ refId: linked.refId, label: linked.label });
      setOpen(false);
      setQuery("");
      onLinked?.(linked);
    });
  };

  const status = searching
    ? "Searching CentenarianOS…"
    : result?.ok
      ? result.choices.length
        ? `${result.choices.length} vendor${result.choices.length === 1 ? "" : "s"} found${result.more ? ", type more to narrow it down" : ""}.`
        : "No vendors match."
      : "";

  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold text-[#221E1B]">
        {label} <span className="font-normal text-[#221E1B]/80">(optional)</span>
      </legend>
      {name ? <input type="hidden" name={name} value={picked?.refId ?? ""} /> : null}

      {picked ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-[#221E1B]">
            <span className="font-semibold">{picked.label}</span> <span className={MUTED}>from CentenarianOS</span>
          </p>
          <div className="flex gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(true)}>
              Change
            </button>
            {name ? (
              <button type="button" className={BTN_SECONDARY} onClick={() => setPicked(null)}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!picked && !open ? (
        <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(true)}>
          Pick a vendor from CentenarianOS
        </button>
      ) : null}

      {open ? (
        <div className="space-y-3 border-2 border-[#221E1B] bg-[#fff8e8] p-4">
          <label htmlFor={inputId} className="block font-semibold text-[#221E1B]">
            Search your CentenarianOS vendors
          </label>
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            autoFocus
            maxLength={100}
            className={INPUT}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter must not submit the surrounding trip form.
              if (e.key === "Enter") e.preventDefault();
              if (e.key === "Escape") setOpen(false);
            }}
            aria-describedby={statusId}
          />
          <p id={statusId} role="status" aria-live="polite" className={`text-sm ${MUTED}`}>
            {status}
          </p>

          {result && !result.ok ? (
            <div role="alert" className="text-[#221E1B]">
              <p className="font-semibold">{result.title}</p>
              <p className="text-sm">{result.body}</p>
            </div>
          ) : null}

          {result?.ok && result.choices.length ? (
            <ul className="space-y-2" aria-label="Matching vendors">
              {result.choices.map((c) => (
                <li key={`${c.contactId}:${c.locationId ?? ""}`}>
                  <button
                    type="button"
                    disabled={linking}
                    onClick={() => choose(c)}
                    className="w-full min-h-11 text-left px-3 py-2 border-2 border-[#221E1B] bg-white rounded-lg hover:bg-[#F4B44A]/30 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B] disabled:opacity-60"
                  >
                    <span className="block font-semibold text-[#221E1B]">{c.label}</span>
                    {c.detail ? <span className={`block text-sm ${MUTED}`}>{c.detail}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {linkError ? (
            <p role="alert" className={ERROR_TEXT}>
              {linkError}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {result?.ok ? (
              <a href={result.createVendorUrl} target="_blank" rel="noopener noreferrer" className={`${TEXT_LINK} inline-flex items-center min-h-11 text-sm`}>
                Not listed? Add it in CentenarianOS<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
