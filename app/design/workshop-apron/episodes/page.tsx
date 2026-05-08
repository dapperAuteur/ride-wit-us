import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS } from "@/lib/curriculum/season-colors";

const BASE = "/design/workshop-apron";

export const metadata = { title: "Catalog · Workshop Apron" };

export default function WorkshopApronEpisodes() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.workshop} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#A8302A] mb-3">CATALOG</p>
          <h1 className="font-display text-5xl text-[#1a1a1a]">All thirty-two episodes.</h1>
          <p className="text-[#5b4d2c] mt-4 max-w-2xl">Filed by season. Each card stamped with the apron level that earns it.</p>

          {SEASONS.map((s) => (
            <section key={s.number} id={`season-${s.number}`} className="mt-12 scroll-mt-24">
              <header className="paper px-4 py-2 inline-block mb-4">
                <p className="font-mono text-[11px] text-[#5b4d2c]">SEASON {s.number}</p>
                <p className="font-display text-2xl font-bold text-[#1a1a1a]">{s.title}</p>
                <p className="text-sm text-[#5b4d2c]">{s.tagline}</p>
              </header>

              <ul className="grid sm:grid-cols-2 gap-3">
                {EPISODES.filter((e) => e.season === s.number).map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`${BASE}/episodes/${e.slug}`}
                      className="paper block p-4 hover:translate-y-[-2px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] text-[#5b4d2c]">S{e.season}·E{String(e.ep).padStart(2, "0")}</span>
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border-2"
                          style={{ color: APRON_COLORS[e.apronLevel], borderColor: APRON_COLORS[e.apronLevel] }}
                        >
                          {APRON_LABELS[e.apronLevel]}
                        </span>
                      </div>
                      <p className="font-display text-lg font-bold text-[#1a1a1a]">{e.title}</p>
                      {e.subtitle && <p className="text-sm text-[#5b4d2c] mt-1">{e.subtitle}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.workshop} basePath={BASE} />
    </>
  );
}
