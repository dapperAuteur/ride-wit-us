"use client";

import { useRef, useState, type FormEvent } from "react";
import { NOTE_MAX } from "@/lib/waitlist/constants";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "joined" }
  | { kind: "error"; message: string; field?: "email" | "note" };

const INPUT =
  "mt-1 block w-full min-h-11 px-3 py-2 border-2 border-[#221E1B] bg-white text-[#221E1B] rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B] aria-[invalid=true]:border-[#D33E2D]";

/**
 * The mobility-app waitlist form. Posts JSON to /api/waitlist. The `website` field is a honeypot:
 * hidden from people and assistive tech, filled by bots.
 */
export function WaitlistForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const emailRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    // Quick check for UX only; the server validates for real.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({
        kind: "error",
        field: "email",
        message: email ? "Enter an email address like name@example.com." : "Enter your email address.",
      });
      emailRef.current?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          note: String(form.get("note") ?? ""),
          website: String(form.get("website") ?? ""),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error: string; field?: "email" | "note" }
        | null;
      if (json?.ok) {
        setStatus({ kind: "joined" });
        return;
      }
      const field = json && !json.ok ? json.field : undefined;
      setStatus({ kind: "error", message: json && !json.ok ? json.error : "Couldn't send that. Try again.", field });
      (field === "note" ? noteRef : emailRef).current?.focus();
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach RideWitUS. Check your connection and try again." });
    }
  }

  if (status.kind === "joined") {
    return (
      <div role="status" aria-live="polite" className="border-2 border-[#221E1B] bg-[#fff8e8] p-5" style={{ boxShadow: "4px 4px 0 #3E7C3A" }}>
        <p className="font-display text-2xl text-[#221E1B]">You&apos;re on the list.</p>
        <p className="mt-2 text-[#221E1B]">We&apos;ll write when the mobility app opens to more people.</p>
      </div>
    );
  }

  const emailError = status.kind === "error" && status.field === "email" ? status.message : null;
  const noteError = status.kind === "error" && status.field === "note" ? status.message : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 max-w-xl">
      <div>
        <label htmlFor="waitlist-email" className="font-semibold text-[#221E1B]">
          Email
        </label>
        <input
          ref={emailRef}
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "waitlist-email-error" : undefined}
          className={INPUT}
        />
        {emailError ? (
          <p id="waitlist-email-error" role="alert" className="mt-2 text-sm font-semibold text-[#A3271A]">
            {emailError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="waitlist-note" className="font-semibold text-[#221E1B]">
          What would you use it for? <span className="font-normal text-[#221E1B]/80">(optional)</span>
        </label>
        <textarea
          ref={noteRef}
          id="waitlist-note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "waitlist-note-hint waitlist-note-error" : "waitlist-note-hint"}
          className={INPUT}
        />
        <p id="waitlist-note-hint" className="mt-1 text-sm text-[#221E1B]/80">
          Bike commuting, a family car, travel budgets. Up to {NOTE_MAX} characters.
        </p>
        {noteError ? (
          <p id="waitlist-note-error" role="alert" className="mt-2 text-sm font-semibold text-[#A3271A]">
            {noteError}
          </p>
        ) : null}
      </div>

      {/* Honeypot. Off-screen, out of the tab order, hidden from assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="waitlist-website">Website</label>
        <input id="waitlist-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="inline-flex items-center justify-center w-full sm:w-auto min-h-12 px-6 border-2 border-[#221E1B] bg-[#F4B44A] text-[#221E1B] font-semibold rounded-lg disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
      >
        {status.kind === "sending" ? "Joining…" : "Join the waitlist"}
      </button>
      {status.kind === "error" && !status.field ? (
        <p role="alert" className="text-sm font-semibold text-[#A3271A]">
          {status.message}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {status.kind === "sending" ? "Joining the waitlist" : ""}
      </p>
    </form>
  );
}
