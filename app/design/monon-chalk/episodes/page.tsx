import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS } from "@/lib/curriculum/season-colors";

const BASE = "/design/monon-chalk";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

export const metadata = { title: "Episodes · Monon Chalk" };

export default function MononChalkEpisodes() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-1deg]">Catalog</span>
          <h1 className="font-display text-6xl text-[#221E1B] mt-4 leading-[0.95]">All 32 episodes.</h1>
          <p className="text-[#221E1B]/80 mt-3 max-w-2xl">Pinned to a community board. Pick one off the wall.</p>

          {SEASONS.map((s, si) => (
            <section key={s.number} id={`season-${s.number}`} className="mt-14 scroll-mt-24">
              <header className="mb-5">
                <span className="sticker px-3 py-1 text-xs uppercase tracking-wider" style={{ background: STICKER_COLORS[si] }}>
                  Season {s.number}
                </span>
                <h2 className="font-display text-3xl font-bold text-[#221E1B] mt-3">{s.title}</h2>
                <p className="text-sm text-[#221E1B]/70">{s.tagline}</p>
              </header>

              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EPISODES.filter((e) => e.season === s.number).map((e, i) => (
                  <li key={e.slug}>
                    <Link
                      href={`${BASE}/episodes/${e.slug}`}
                      className="block border-2 border-[#221E1B] bg-[#fff8e8] p-4 hover:translate-y-[-3px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                      style={{ boxShadow: `4px 4px 0 ${STICKER_COLORS[(si + i) % 4]}` }}
                    >
                      <p className="font-mono text-[11px] text-[#221E1B]/60">S{e.season}·E{String(e.ep).padStart(2, "0")}</p>
                      <p className="font-display text-xl font-bold text-[#221E1B] mt-2 leading-tight">{e.title}</p>
                      {e.subtitle && <p className="text-xs text-[#221E1B]/70 mt-2">{e.subtitle}</p>}
                      <p className="text-[10px] font-mono uppercase tracking-wider mt-3" style={{ color: APRON_COLORS[e.apronLevel] }}>{APRON_LABELS[e.apronLevel]}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} basePath={BASE} />
    </>
  );
}
