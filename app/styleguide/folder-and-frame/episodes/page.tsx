import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS } from "@/lib/curriculum/season-colors";

const BASE = "/styleguide/folder-and-frame";

export const metadata = { title: "Catalog · Folder & Frame" };

export default function FolderAndFrameEpisodes() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.frame} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#5A6571] mb-3">Catalog</p>
          <h1 className="font-display text-5xl text-[#0f0f10]">Episode index.</h1>
          <p className="text-[#5A6571] mt-3 max-w-2xl">Sorted by season. Sorted within season by release order. Tabular figures for length and tagging.</p>

          {SEASONS.map((s) => (
            <section key={s.number} id={`season-${s.number}`} className="mt-14 scroll-mt-24">
              <header className="border-b border-[#0f0f10] pb-2 mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-2xl text-[#0f0f10]">
                  <span className="font-mono text-[11px] text-[#5A6571] mr-3">S{String(s.number).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <span className="text-xs accent">{s.tagline}</span>
              </header>

              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-[#5A6571] border-b border-[#0f0f10]/30">
                  <tr>
                    <th className="text-left py-2 w-20">Episode</th>
                    <th className="text-left py-2">Title</th>
                    <th className="text-left py-2 w-32">Apron</th>
                  </tr>
                </thead>
                <tbody>
                  {EPISODES.filter((e) => e.season === s.number).map((e) => (
                    <tr key={e.slug} className="border-b border-[#0f0f10]/15 hover:bg-[#0f0f10] hover:text-[#f5f0e6] transition-colors">
                      <td className="py-3 font-mono text-[11px] text-[#5A6571] tabular-nums">E{String(e.ep).padStart(2, "0")}</td>
                      <td className="py-3">
                        <Link href={`${BASE}/episodes/${e.slug}`} className="block focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f10] focus-visible:bg-[#0f0f10] focus-visible:text-[#f5f0e6]">
                          <p className="font-display text-base">{e.title}</p>
                          {e.subtitle && <p className="text-xs opacity-70">{e.subtitle}</p>}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: APRON_COLORS[e.apronLevel] }}>
                          {APRON_LABELS[e.apronLevel]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.frame} basePath={BASE} />
    </>
  );
}
