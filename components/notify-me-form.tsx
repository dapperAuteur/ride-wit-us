"use client";

import { useMemo, useState } from "react";
import { EPISODES } from "@/lib/curriculum/episodes";
import { SEASONS } from "@/lib/curriculum/season-colors";
import { cn } from "@/lib/utils";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; summary: string }
  | { kind: "err"; message: string };

export function NotifyMeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [allEpisodes, setAllEpisodes] = useState(false);
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const episodesBySeason = useMemo(() => {
    const map = new Map<number, typeof EPISODES>();
    for (const ep of EPISODES) {
      const list = map.get(ep.season) ?? [];
      list.push(ep);
      map.set(ep.season, list);
    }
    return map;
  }, []);

  function toggleAll(next: boolean) {
    setAllEpisodes(next);
    if (next) {
      setSelectedSeasons(new Set(SEASONS.map((s) => s.number)));
      setSelectedEpisodes(new Set(EPISODES.map((e) => e.slug)));
    } else {
      setSelectedSeasons(new Set());
      setSelectedEpisodes(new Set());
    }
  }

  function toggleSeason(seasonNum: number, next: boolean) {
    const newSeasons = new Set(selectedSeasons);
    const newEpisodes = new Set(selectedEpisodes);
    const seasonEps = episodesBySeason.get(seasonNum) ?? [];
    if (next) {
      newSeasons.add(seasonNum);
      for (const ep of seasonEps) newEpisodes.add(ep.slug);
    } else {
      newSeasons.delete(seasonNum);
      for (const ep of seasonEps) newEpisodes.delete(ep.slug);
      setAllEpisodes(false);
    }
    setSelectedSeasons(newSeasons);
    setSelectedEpisodes(newEpisodes);
  }

  function toggleEpisode(slug: string, seasonNum: number, next: boolean) {
    const newEpisodes = new Set(selectedEpisodes);
    if (next) {
      newEpisodes.add(slug);
    } else {
      newEpisodes.delete(slug);
      // If the user un-checks any episode in a fully-checked season, the
      // season-level checkbox becomes indeterminate; track that by removing
      // it from selectedSeasons.
      const newSeasons = new Set(selectedSeasons);
      newSeasons.delete(seasonNum);
      setSelectedSeasons(newSeasons);
      setAllEpisodes(false);
    }
    setSelectedEpisodes(newEpisodes);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (selectedEpisodes.size === 0 && !allEpisodes && selectedSeasons.size === 0) {
      setStatus({ kind: "err", message: "Pick at least one episode or season to subscribe to." });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/inbox-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form_type: "class_notify_signup",
          email,
          name: name || undefined,
          selected_all: allEpisodes,
          selected_seasons: [...selectedSeasons].sort((a, b) => a - b),
          selected_episodes: [...selectedEpisodes],
        }),
      });
      if (!res.ok) {
        setStatus({ kind: "err", message: `Form failed (${res.status}). Try again or email bam@awews.com.` });
        return;
      }
      const summary = allEpisodes
        ? "every new episode"
        : selectedSeasons.size > 0 && selectedEpisodes.size === [...selectedSeasons].reduce((acc, n) => acc + (episodesBySeason.get(n)?.length ?? 0), 0)
          ? `Season ${[...selectedSeasons].sort((a, b) => a - b).map((n) => n).join(" + Season ")}`
          : `${selectedEpisodes.size} episode${selectedEpisodes.size === 1 ? "" : "s"}`;
      setStatus({ kind: "ok", summary });
    } catch {
      setStatus({ kind: "err", message: "Network hiccup. Try again." });
    }
  }

  if (status.kind === "ok") {
    return (
      <div className="border-2 border-[#221E1B] bg-[#fff8e8] p-6" style={{ boxShadow: "6px 6px 0 #3E7C3A" }}>
        <p className="sticker inline-block px-3 py-1 text-xs uppercase tracking-wider mb-3" style={{ background: "#3E7C3A", color: "#f4ecd8" }}>Confirmed</p>
        <p className="font-display text-2xl text-[#221E1B] font-bold">We&apos;ll let you know when {status.summary} {allEpisodes ? "drops" : status.summary.includes("episode") ? (selectedEpisodes.size === 1 ? "drops" : "drop") : "drops"}.</p>
        <p className="text-sm text-[#221E1B]/70 mt-2">Confirmation went to {email}. You can re-submit any time to update your picks.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border-2 border-[#221E1B] bg-[#fff8e8] p-6" style={{ boxShadow: "6px 6px 0 #221E1B" }}>
      <fieldset className="grid sm:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">Email *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">First name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
            autoComplete="given-name"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend className="font-display text-2xl text-[#221E1B] font-bold mb-1">Notify me about</legend>
        <p className="text-xs text-[#221E1B]/70 mb-4">Pick everything, or pick whole seasons, or pick individual episodes — any combination.</p>

        <label className="sticker inline-flex items-center gap-2 px-3 py-2 text-sm uppercase tracking-wider mb-6 cursor-pointer" style={{ background: allEpisodes ? "#F4B44A" : "#fff8e8" }}>
          <input
            type="checkbox"
            checked={allEpisodes}
            onChange={(e) => toggleAll(e.target.checked)}
            className="size-4 accent-[#221E1B]"
          />
          Every new episode
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          {SEASONS.map((s, si) => {
            const seasonEps = episodesBySeason.get(s.number) ?? [];
            const seasonChecked = selectedSeasons.has(s.number);
            return (
              <div key={s.number} className="border-2 border-[#221E1B] bg-white p-4">
                <label className="sticker inline-flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-wider mb-3 cursor-pointer" style={{ background: seasonChecked ? STICKER_COLORS[si] : "#fff8e8" }}>
                  <input
                    type="checkbox"
                    checked={seasonChecked}
                    onChange={(e) => toggleSeason(s.number, e.target.checked)}
                    className="size-4 accent-[#221E1B]"
                  />
                  All of Season {s.number}
                </label>
                <p className="font-display text-sm font-bold text-[#221E1B] mb-2">{s.title}</p>
                <ul className="space-y-1.5">
                  {seasonEps.map((ep) => (
                    <li key={ep.slug}>
                      <label className="flex items-baseline gap-2 text-xs text-[#221E1B] cursor-pointer hover:text-[#D33E2D]">
                        <input
                          type="checkbox"
                          checked={selectedEpisodes.has(ep.slug)}
                          onChange={(e) => toggleEpisode(ep.slug, s.number, e.target.checked)}
                          className="size-3.5 mt-0.5 accent-[#221E1B] shrink-0"
                        />
                        <span><span className="font-mono text-[10px] text-[#221E1B]/60 mr-1.5">E{String(ep.ep).padStart(2, "0")}</span>{ep.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </fieldset>

      {status.kind === "err" && (
        <p className="mt-4 text-sm text-[#A8302A] font-mono" role="alert">{status.message}</p>
      )}

      <button
        type="submit"
        disabled={status.kind === "submitting"}
        className={cn(
          "sticker mt-6 px-5 py-3 text-base font-bold uppercase tracking-wide rotate-[-1deg] hover:rotate-[1deg] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]",
          status.kind === "submitting" && "opacity-60 cursor-not-allowed"
        )}
      >
        {status.kind === "submitting" ? "Sending…" : "Send my picks →"}
      </button>
    </form>
  );
}
