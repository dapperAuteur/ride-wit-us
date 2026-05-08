import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EPISODES } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS } from "@/lib/curriculum/season-colors";

export const metadata = {
  title: "All episodes",
  description: "Every episode in the RideWitUS curriculum, organized by season.",
};

export default function EpisodesPage() {
  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">Catalog</p>
          <h1 className="text-4xl font-semibold text-white">All 32 episodes</h1>
          <p className="text-slate-400 mt-3 max-w-2xl">Four seasons, ~7 episodes each plus a synthesis episode. Audio-first, 35–40 minutes each, with cut-point markers so instructors can extract per-skill clips.</p>

          {SEASONS.map((s) => (
            <section key={s.number} id={`season-${s.number}`} className="mt-12 scroll-mt-24">
              <header className="flex items-baseline justify-between gap-4 mb-4 border-b border-slate-800 pb-2">
                <h2 className="text-xl font-semibold text-white">
                  <Link href={`/seasons/${s.number}`} className="hover:text-amber-300">
                    Season {s.number} — {s.title}
                  </Link>
                </h2>
                <span className="text-xs text-slate-500">{s.tagline}</span>
              </header>
              <ul className="grid sm:grid-cols-2 gap-3">
                {EPISODES.filter((e) => e.season === s.number).map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/episodes/${e.slug}`}
                      className="block rounded-md border border-slate-800 bg-slate-900/40 p-4 hover:border-amber-300 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] text-slate-500">S{e.season}·E{String(e.ep).padStart(2, "0")}</span>
                        <span
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                          style={{ color: APRON_COLORS[e.apronLevel], borderColor: APRON_COLORS[e.apronLevel] }}
                        >
                          {APRON_LABELS[e.apronLevel]}
                        </span>
                      </div>
                      <p className="font-semibold text-white">{e.title}</p>
                      {e.subtitle && <p className="text-sm text-slate-400 mt-1">{e.subtitle}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
