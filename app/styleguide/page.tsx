import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DESIGNS } from "@/components/design-switcher";

export const metadata = {
  title: "Styleguide archive",
  description: "Visual directions explored for RideWitUS. Monon Chalk shipped at the root; the two non-chosen prototypes are kept here as a reference.",
  robots: { index: false, follow: false },
};

const NOTES: Record<string, { palette: string[]; type: string; motifs: string; bestAt: string }> = {
  "workshop-apron": {
    palette: ["#C8A977 kraft", "#1A1A1A ink", "#4F7C2A green", "#A8302A red", "#5E3A8C purple"],
    type: "Editorial serif (Source Serif Pro) + IBM Plex Mono for specs",
    motifs: "Torn paper, tape, margin annotations, stamped apron badges, exploded-view diagrams",
    bestAt: "Tinkerer + always-learning — feels like a vocational manual someone has marked up",
  },
  "folder-and-frame": {
    palette: ["#F5F0E6 cream", "#0F0F10 ink", "#E25A1C Brompton orange", "#5A6571 slate"],
    type: "Inter sans + JetBrains Mono for tabular figures",
    motifs: "Blueprint dot-grid, isometric line art, thin keyline rules, generous whitespace",
    bestAt: "Bikes + design rigor — feels like Brompton's own brand or a Dieter Rams catalog",
  },
};

export default function StyleguideIndexPage() {
  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">Styleguide archive · not in main nav</p>
          <h1 className="text-4xl font-semibold text-white">Two non-chosen directions, frozen for reference.</h1>
          <p className="text-slate-400 mt-4 max-w-2xl">
            Three directions were prototyped during the design exploration. <strong className="text-white">Monon Chalk</strong> was chosen and now lives at the <Link href="/" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">root site</Link>. The two non-chosen prototypes stay here as a styleguide reference — same canonical 32-episode list, different visual language. Decision log: <code className="font-mono text-xs text-amber-300">plans/design/CHOSEN.md</code>.
          </p>

          <div className="mt-12 grid gap-6">
            {DESIGNS.map((d) => {
              const n = NOTES[d.slug];
              return (
                <Link
                  key={d.slug}
                  href={`/styleguide/${d.slug}`}
                  className="group block rounded-lg border border-slate-800 bg-slate-900/40 p-6 hover:border-amber-300 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <div className="flex items-start gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/brand/${d.variant}/logomark.svg`} alt="" aria-hidden="true" className="size-16 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <h2 className="text-2xl font-semibold text-white group-hover:text-amber-300 transition-colors">{d.label}</h2>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">brand: {d.variant}</span>
                      </div>
                      <p className="text-amber-200 text-sm mt-1">{d.ethos}</p>
                      <p className="text-slate-400 text-sm mt-2">{n.bestAt}</p>
                      <dl className="mt-4 grid sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <dt className="text-slate-500 uppercase tracking-wider">Palette</dt>
                          <dd className="text-slate-300 mt-0.5">{n.palette.join(" · ")}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 uppercase tracking-wider">Type</dt>
                          <dd className="text-slate-300 mt-0.5">{n.type}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 uppercase tracking-wider">Motifs</dt>
                          <dd className="text-slate-300 mt-0.5">{n.motifs}</dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-sm text-amber-300 group-hover:underline">Open prototype →</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-12 text-sm text-slate-400">
            Use the sticky switcher at the top of any prototype to hop between directions or jump back to the root.
          </p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
