import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { SEASONS, APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";
import { EPISODES } from "@/lib/curriculum/episodes";

const BASE = "/design/folder-and-frame";

export default function FolderAndFrameLanding() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.frame} basePath={BASE} />
      <article className="flex-1">
        {/* Hero */}
        <section className="border-b border-[#0f0f10]">
          <div className="max-w-5xl mx-auto px-6 py-24 grid lg:grid-cols-[1fr,320px] gap-12 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#5A6571] mb-4">Object · System · Curriculum</p>
              <h1 className="font-display text-5xl sm:text-7xl tracking-tight text-[#0f0f10] leading-[0.95]">
                A bike-shop curriculum,<br />in four seasons.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-[#0f0f10] leading-relaxed">
                Thirty-two audio-first episodes on the engineering, the mechanic skill, and the program that puts kids on bikes — single-speed cruiser through foundations, gears in advanced, Brompton when we hit design.
              </p>
              <div className="mt-8 flex items-center gap-6">
                <Link
                  href={`${BASE}/episodes`}
                  className="inline-flex items-center px-5 py-3 bg-[#0f0f10] text-[#f5f0e6] font-semibold hover:bg-[#E25A1C] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f10]"
                >
                  Catalog →
                </Link>
                <Link
                  href="/design"
                  className="text-sm text-[#0f0f10] hover:text-[#E25A1C] underline underline-offset-4"
                >
                  Compare directions
                </Link>
              </div>
            </div>
            <div className="keyline bg-white p-6 aspect-square">
              <BromptonIso />
            </div>
          </div>
        </section>

        {/* Spec table */}
        <section className="border-b border-[#0f0f10]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#5A6571] mb-6">Specifications</p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-12 font-mono text-sm">
              <Spec label="Episodes" value="32" />
              <Spec label="Seasons" value="4" />
              <Spec label="Duration" value="35–40 min" />
              <Spec label="Bikes" value="Cruiser → Brompton" />
              <Spec label="Format" value="Audio · Cut-points" />
              <Spec label="Companion class" value="CentOS Academy" />
              <Spec label="Companion deck" value="FlashLearnAI" />
              <Spec label="Companion tour" value="Wanderlearn 360°" />
            </dl>
          </div>
        </section>

        {/* Seasons grid */}
        <section className="border-b border-[#0f0f10]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl text-[#0f0f10] mb-8">Four-season arc.</h2>
            <ol className="grid sm:grid-cols-2 gap-px bg-[#0f0f10]">
              {SEASONS.map((s) => (
                <li key={s.number} className="bg-[#f5f0e6] p-8">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-mono text-[11px] text-[#5A6571]">S{String(s.number).padStart(2, "0")}</span>
                    <div className="flex gap-1">
                      {s.apronLevels.map((lvl) => (
                        <span key={lvl} className="size-2.5 rounded-full" style={{ background: APRON_COLORS[lvl] }} aria-hidden="true" />
                      ))}
                    </div>
                  </div>
                  <h3 className="font-display text-2xl text-[#0f0f10] leading-tight">{s.title}</h3>
                  <p className="text-sm accent mt-1">{s.tagline}</p>
                  <p className="text-sm text-[#5A6571] mt-3 leading-relaxed">{s.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Recent episodes */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-3xl text-[#0f0f10]">Catalog excerpt</h2>
              <Link href={`${BASE}/episodes`} className="text-sm accent hover:underline">All 32 →</Link>
            </div>
            <ul>
              {EPISODES.slice(0, 6).map((e) => (
                <li key={e.slug} className="border-t border-[#0f0f10] last:border-b">
                  <Link
                    href={`${BASE}/episodes/${e.slug}`}
                    className="grid grid-cols-[80px,1fr,auto] gap-6 items-baseline py-4 hover:bg-[#0f0f10] hover:text-[#f5f0e6] transition-colors px-2 -mx-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f10] [&:hover_.muted]:text-[#f5f0e6]/70 [&:hover_.muted-stripe]:text-[#f5f0e6]"
                  >
                    <span className="font-mono text-[11px] text-[#5A6571] muted-stripe">S{e.season}·E{String(e.ep).padStart(2, "0")}</span>
                    <div>
                      <p className="font-display text-lg text-[#0f0f10] leading-tight group-hover:text-current">{e.title}</p>
                      {e.subtitle && <p className="text-sm text-[#5A6571] muted mt-0.5">{e.subtitle}</p>}
                    </div>
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: APRON_COLORS[e.apronLevel] }}
                    >
                      {APRON_LABELS[e.apronLevel]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Ecosystem schematic */}
        <section className="border-t border-[#0f0f10]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl text-[#0f0f10] mb-8">Ecosystem schematic.</h2>
            <div className="keyline bg-white p-8">
              <div className="grid sm:grid-cols-3 gap-px bg-[#0f0f10]">
                {[
                  { tag: "01", title: "Classes", body: "CentOS Academy" },
                  { tag: "02", title: "Routes", body: "Wanderlearn 360°" },
                  { tag: "03", title: "Vocabulary", body: "FlashLearnAI" },
                  { tag: "04", title: "Forms", body: "WitUS Inbox" },
                  { tag: "05", title: "Posts", body: "WitUS Outbox" },
                  { tag: "06", title: "Rides", body: "CentOS Travel" },
                ].map((b) => (
                  <div key={b.tag} className="bg-white p-5">
                    <p className="font-mono text-[10px] text-[#5A6571]">{b.tag}</p>
                    <p className="font-display text-xl text-[#0f0f10] mt-1">{b.title}</p>
                    <p className="text-xs accent mt-1">{b.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.frame} basePath={BASE} />
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-[#5A6571]">{label}</dt>
      <dd className="text-[#0f0f10] mt-1 tabular-nums">{value}</dd>
    </div>
  );
}

function BromptonIso() {
  return (
    <svg viewBox="0 0 320 320" className="w-full h-auto" aria-hidden="true">
      <defs>
        <pattern id="dot" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.6" fill="#0f0f10" opacity="0.2" />
        </pattern>
      </defs>
      <rect width="320" height="320" fill="url(#dot)" />
      <g fill="none" stroke="#0f0f10" strokeWidth="1.4" strokeLinecap="round">
        {/* isometric ground line */}
        <line x1="20" y1="240" x2="300" y2="240" strokeOpacity="0.3" />
        {/* wheels */}
        <ellipse cx="100" cy="225" rx="45" ry="14" />
        <ellipse cx="240" cy="225" rx="45" ry="14" />
        <circle cx="100" cy="225" r="4" fill="#0f0f10" />
        <circle cx="240" cy="225" r="4" fill="#0f0f10" />
        {/* tubes */}
        <line x1="100" y1="225" x2="170" y2="170" />
        <line x1="170" y1="170" x2="240" y2="225" />
        <line x1="170" y1="170" x2="180" y2="100" />
        <line x1="180" y1="100" x2="220" y2="90" strokeWidth="2.2" />
        {/* hinge accent */}
        <rect x="160" y="160" width="14" height="14" fill="#E25A1C" stroke="#0f0f10" />
        {/* seat post */}
        <line x1="170" y1="170" x2="135" y2="125" />
        <line x1="120" y1="120" x2="155" y2="118" strokeWidth="2.2" />
      </g>
      <g fontFamily="monospace" fontSize="9" fill="#0f0f10">
        <text x="170" y="158">FIG. 1 — HINGE</text>
        <text x="80" y="270" opacity="0.5">FRONT WHEEL</text>
        <text x="220" y="270" opacity="0.5">REAR WHEEL</text>
      </g>
    </svg>
  );
}
