import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { episodesBySeason } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS, seasonOf } from "@/lib/curriculum/season-colors";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

export function generateStaticParams() {
  return SEASONS.map((s) => ({ n: String(s.number) }));
}

interface PageProps { params: Promise<{ n: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { n } = await params;
  const num = Number(n);
  const meta = SEASONS.find((s) => s.number === num);
  if (!meta) return {};
  return { title: `Season ${meta.number} — ${meta.title}`, description: meta.description };
}

export default async function SeasonPage({ params }: PageProps) {
  const { n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > 4) notFound();
  const meta = seasonOf(num);
  const eps = episodesBySeason(num);
  const stickerColor = STICKER_COLORS[(num - 1) % 4];

  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <header className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-1deg] inline-block mb-4" style={{ background: stickerColor }}>Season {num}</span>
            <h1 className="font-display text-6xl sm:text-7xl tracking-tight text-[#221E1B] leading-[0.95]">{meta.title}</h1>
            <p className="font-display text-xl mt-3" style={{ color: APRON_COLORS[meta.apronLevels[0]] }}>{meta.tagline}</p>
            <p className="mt-6 max-w-2xl text-[#221E1B] leading-relaxed">{meta.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {meta.apronLevels.map((lvl) => (
                <span
                  key={lvl}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border-2"
                  style={{ color: APRON_COLORS[lvl], borderColor: APRON_COLORS[lvl] }}
                >
                  {APRON_LABELS[lvl]}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section>
          <div className="max-w-5xl mx-auto px-6 py-12">
            <ul className="grid sm:grid-cols-2 gap-4">
              {eps.map((e, i) => (
                <li key={e.slug}>
                  <Link
                    href={`/episodes/${e.slug}`}
                    className="block border-2 border-[#221E1B] bg-[#fff8e8] p-5 hover:translate-y-[-3px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                    style={{ boxShadow: `4px 4px 0 ${STICKER_COLORS[i % 4]}` }}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] text-[#221E1B]/60">E{String(e.ep).padStart(2, "0")}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: APRON_COLORS[e.apronLevel] }}>{APRON_LABELS[e.apronLevel]}</span>
                    </div>
                    <p className="font-display text-2xl font-bold text-[#221E1B] leading-tight">{e.title}</p>
                    {e.subtitle && <p className="text-sm text-[#221E1B]/70 mt-2">{e.subtitle}</p>}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex justify-between text-sm">
              <Link href={num > 1 ? `/seasons/${num - 1}` : "/episodes"} className="font-bold text-[#221E1B] hover:text-[#D33E2D] underline underline-offset-4 decoration-[#D33E2D] decoration-2">
                {num > 1 ? `← Season ${num - 1}` : "← All episodes"}
              </Link>
              <Link href={num < 4 ? `/seasons/${num + 1}` : "/episodes"} className="font-bold text-[#221E1B] hover:text-[#D33E2D] underline underline-offset-4 decoration-[#D33E2D] decoration-2">
                {num < 4 ? `Season ${num + 1} →` : "All episodes →"}
              </Link>
            </div>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
