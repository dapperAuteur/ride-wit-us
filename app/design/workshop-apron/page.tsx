import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { SEASONS, APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";
import { EPISODES } from "@/lib/curriculum/episodes";

const BASE = "/design/workshop-apron";

export default function WorkshopApronLanding() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.workshop} basePath={BASE} />
      <article className="flex-1">
        {/* Hero */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#A8302A] mb-3">FIELD MANUAL · S1.E1—E32</p>
            <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] tracking-tight text-[#1a1a1a] max-w-3xl">
              The Bench Manual.
            </h1>
            <p className="font-mono text-xs mt-2 text-[#5b4d2c]">a podcast curriculum · taught from a single bench · simplest bike first</p>
            <p className="mt-8 max-w-2xl text-lg text-[#1a1a1a] leading-relaxed">
              Open the apron. Hang the bike. Pick up the wrench you don&apos;t know yet. Thirty-two episodes of bicycle mechanic instruction — single-speed cruiser through Apron Foundations, gears in Apron Advanced, the Brompton when we get to design.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${BASE}/episodes`}
                className="inline-flex items-center px-5 py-3 bg-[#1a1a1a] text-[#f5ead0] font-bold hover:bg-[#A8302A] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                style={{ boxShadow: "4px 4px 0 #1a1a1a40" }}
              >
                Open the catalog →
              </Link>
              <Link
                href="/design"
                className="inline-flex items-center px-5 py-3 border-2 border-[#1a1a1a] text-[#1a1a1a] font-semibold hover:bg-[#1a1a1a] hover:text-[#f5ead0] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
              >
                Compare directions
              </Link>
            </div>
          </div>
        </section>

        {/* Apron strip */}
        <section>
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SEASONS.map((s) => (
                <Link
                  key={s.number}
                  href={`${BASE}/episodes`}
                  className="paper p-5 hover:translate-y-[-2px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {s.apronLevels.map((lvl) => (
                      <span
                        key={lvl}
                        className="size-3 rounded-sm border border-[#1a1a1a]"
                        style={{ background: APRON_COLORS[lvl] }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#5b4d2c]">Season {s.number}</p>
                  <p className="font-display text-lg font-bold text-[#1a1a1a] leading-tight mt-1">{s.title}</p>
                  <p className="text-xs text-[#5b4d2c] mt-2">{s.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Diagram column + recent episodes */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-20 grid lg:grid-cols-[260px,1fr] gap-12">
            <aside className="paper p-6">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#5b4d2c] mb-3">FIG 1 — THE FOLD</p>
              <BromptonDiagram />
              <p className="font-mono text-[10px] text-[#5b4d2c] mt-3 leading-relaxed">
                Andrew Ritchie&apos;s 1975 hinge. Same load path, fifty years on. See <span className="underline">S3.E18</span>.
              </p>
            </aside>

            <div>
              <h2 className="font-display text-3xl text-[#1a1a1a] mb-1">Recent from the bench</h2>
              <p className="text-sm text-[#5b4d2c] mb-6">Six episodes pulled from the catalog. Ordered as released.</p>
              <ul className="divide-y-2 divide-[#1a1a1a]/20">
                {EPISODES.slice(0, 6).map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`${BASE}/episodes/${e.slug}`}
                      className="grid grid-cols-[64px,1fr,auto] gap-4 items-baseline py-4 hover:bg-[#1a1a1a]/5 px-2 -mx-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                    >
                      <span className="font-mono text-xs text-[#5b4d2c]">S{e.season}·E{String(e.ep).padStart(2, "0")}</span>
                      <div>
                        <p className="font-display text-lg font-bold text-[#1a1a1a] leading-tight">{e.title}</p>
                        {e.subtitle && <p className="text-sm text-[#5b4d2c] mt-0.5">{e.subtitle}</p>}
                      </div>
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border-2"
                        style={{ color: APRON_COLORS[e.apronLevel], borderColor: APRON_COLORS[e.apronLevel] }}
                      >
                        {APRON_LABELS[e.apronLevel]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section>
          <div className="max-w-5xl mx-auto px-6 pb-20">
            <div className="paper p-8">
              <h2 className="font-display text-2xl text-[#1a1a1a]">Where the rest of the work lives.</h2>
              <p className="text-sm text-[#5b4d2c] mt-2">Marginal notes for the systems-curious.</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-[#1a1a1a]">
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ CLASSES</span>CentOS Academy</li>
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ ROUTES</span>Wanderlearn (360°)</li>
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ VOCAB</span>FlashLearnAI</li>
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ FORMS</span>WitUS Inbox</li>
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ POSTS</span>WitUS Outbox</li>
                <li><span className="font-mono text-[10px] text-[#A8302A] mr-2">▸ RIDES</span>CentOS Travel</li>
              </ul>
            </div>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.workshop} basePath={BASE} />
    </>
  );
}

function BromptonDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-auto" aria-hidden="true">
      <g fill="none" stroke="#1a1a1a" strokeWidth="1.5">
        {/* Wheels */}
        <circle cx="40" cy="85" r="22" />
        <circle cx="160" cy="85" r="22" />
        <circle cx="40" cy="85" r="3" fill="#1a1a1a" />
        <circle cx="160" cy="85" r="3" fill="#1a1a1a" />
        {/* Frame */}
        <line x1="40" y1="85" x2="100" y2="55" />
        <line x1="100" y1="55" x2="160" y2="85" />
        <line x1="100" y1="55" x2="105" y2="20" />
        <line x1="105" y1="20" x2="125" y2="20" strokeWidth="2" />
        {/* Hinge */}
        <rect x="92" y="50" width="10" height="10" fill="#A8302A" stroke="#1a1a1a" />
        {/* Seat */}
        <line x1="100" y1="55" x2="80" y2="35" />
        <line x1="72" y1="32" x2="88" y2="32" strokeWidth="2" />
        {/* Pedal */}
        <circle cx="100" cy="85" r="5" />
        <line x1="92" y1="85" x2="108" y2="85" strokeWidth="2" />
      </g>
      <text x="105" y="48" fontFamily="monospace" fontSize="6" fill="#A8302A">HINGE</text>
    </svg>
  );
}
