import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { episodesBySeason } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS, SEASONS, seasonOf } from "@/lib/curriculum/season-colors";

export function generateStaticParams() {
  return SEASONS.map((s) => ({ n: String(s.number) }));
}

interface PageProps {
  params: Promise<{ n: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { n } = await params;
  const num = Number(n);
  const meta = SEASONS.find((s) => s.number === num);
  if (!meta) return {};
  return {
    title: `Season ${meta.number} — ${meta.title}`,
    description: meta.description,
  };
}

export default async function SeasonPage({ params }: PageProps) {
  const { n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > 4) notFound();
  const meta = seasonOf(num);
  const eps = episodesBySeason(num);
  const accent = APRON_COLORS[meta.apronLevels[0]];

  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <header className="border-b border-slate-800" style={{ background: `linear-gradient(180deg, ${accent}33, transparent)` }}>
          <div className="max-w-5xl mx-auto px-6 py-16">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Season {meta.number}</p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-2">{meta.title}</h1>
            <p className="text-lg mt-3" style={{ color: accent }}>{meta.tagline}</p>
            <p className="mt-6 max-w-2xl text-slate-300">{meta.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {meta.apronLevels.map((lvl) => (
                <span
                  key={lvl}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
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
            <ul className="divide-y divide-slate-800 border-y border-slate-800">
              {eps.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/episodes/${e.slug}`}
                    className="grid grid-cols-[auto,1fr,auto] gap-4 items-baseline py-5 hover:bg-slate-900/40 px-3 -mx-3 rounded transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span className="font-mono text-xs text-slate-500">E{String(e.ep).padStart(2, "0")}</span>
                    <div>
                      <p className="font-semibold text-white">{e.title}</p>
                      {e.subtitle && <p className="text-sm text-slate-400 mt-0.5">{e.subtitle}</p>}
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border"
                      style={{ color: APRON_COLORS[e.apronLevel], borderColor: APRON_COLORS[e.apronLevel] }}
                    >
                      {APRON_LABELS[e.apronLevel]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex justify-between text-sm">
              <Link href={`/seasons/${Math.max(1, num - 1)}`} className="text-slate-400 hover:text-white">
                {num > 1 ? `← Season ${num - 1}` : ""}
              </Link>
              <Link href={`/seasons/${Math.min(4, num + 1)}`} className="text-slate-400 hover:text-white">
                {num < 4 ? `Season ${num + 1} →` : ""}
              </Link>
            </div>
          </div>
        </section>
      </article>
      <SiteFooter />
    </>
  );
}
