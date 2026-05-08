import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DESIGNS } from "@/components/design-switcher";

export const metadata = {
  title: "Design archive",
  description: "Three visual directions explored for RideWitUS. Monon Chalk was chosen; the others remain here as a styleguide reference.",
};

const CHOSEN_SLUG = "monon-chalk";

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
  "monon-chalk": {
    palette: ["#F4ECD8 paper", "#221E1B ink", "#F4B44A sun", "#D33E2D ride-red", "#5C8AA5 chalk-blue", "#3E7C3A grass"],
    type: "Recoleta display serif + Inter body sans",
    motifs: "Riso halftone, hand-painted signs, photo collage, torn-poster edges",
    bestAt: "Community + bikes — feels like a community bike-shop wall in Indianapolis",
  },
};

export default function DesignIndexPage() {
  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">Design archive · decision logged</p>
          <h1 className="text-4xl font-semibold text-white">Three directions explored. One chosen. All preserved.</h1>
          <p className="text-slate-400 mt-4 max-w-2xl">
            Each prototype renders the same canonical 32-episode list. Only the visual language, type stack, motifs, and ecosystem brand variant differ. <strong className="text-white">Monon Chalk</strong> was chosen as the canonical direction; the other two stay here indefinitely as a styleguide reference, not for deletion. Decision log: <Link href="https://github.com/dapperAuteur/ride-wit-us/blob/main/plans/design/CHOSEN.md" className="text-amber-300 underline underline-offset-4 hover:text-amber-200">plans/design/CHOSEN.md</Link>.
          </p>

          <div className="mt-12 grid gap-6">
            {DESIGNS.map((d) => {
              const n = NOTES[d.slug];
              const isChosen = d.slug === CHOSEN_SLUG;
              return (
                <Link
                  key={d.slug}
                  href={`/design/${d.slug}`}
                  className={`group block rounded-lg border p-6 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isChosen ? "border-amber-300 bg-amber-300/5 hover:border-amber-200" : "border-slate-800 bg-slate-900/40 hover:border-amber-300"}`}
                >
                  <div className="flex items-start gap-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/brand/${d.variant}/logomark.svg`} alt="" aria-hidden="true" className="size-16 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <div className="flex items-baseline gap-3">
                          <h2 className="text-2xl font-semibold text-white group-hover:text-amber-300 transition-colors">{d.label}</h2>
                          {isChosen && (
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-950 bg-amber-300 px-2 py-0.5 rounded-full">
                              Chosen
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">brand: {d.variant}</span>
                      </div>
                      <p className={`text-sm mt-1 ${isChosen ? "text-amber-300 font-medium" : "text-amber-200"}`}>{d.ethos}</p>
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
            Use the sticky switcher at the top of any prototype to hop between directions without coming back here.
          </p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
