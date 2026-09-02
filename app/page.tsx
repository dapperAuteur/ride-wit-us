import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { SEASONS, APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";
import { EPISODES } from "@/lib/curriculum/episodes";
import { COMMUNITY_EVENTS } from "@/lib/community-events";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

const MONON_SEASON_TAGLINES: Record<number, string> = {
  1: "Foundations — flats, brakes, the first ten tools.",
  2: "Mastery — wheels, hubs, frames, restoration.",
  3: "Design — geometry, hinges, materials, urban folders.",
  4: "Community — Bike Lab, rides, apprentices, partnerships.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        {/* Hero */}
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-start gap-4 mb-4">
              <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg]">Indianapolis</span>
              <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[1.5deg]" style={{ background: "#5C8AA5", color: "#f4ecd8" }}>Open shop · Wednesdays</span>
            </div>
            <h1 className="font-display text-6xl sm:text-8xl tracking-tight text-[#221E1B] leading-[0.9]">
              <span className="block">Community</span>
              <span className="block" style={{ color: "#D33E2D" }}>bike school</span>
              <span className="block">for the rest of us.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-[#221E1B] leading-relaxed">
              Thirty-two episodes about the bikes we ride, the neighbors we ride with, and the long arc of staying upright. Monthly community rides. An open shop you can roll into on a Wednesday.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tune-in"
                className="sticker px-5 py-3 text-base font-bold uppercase tracking-wide rotate-[-1deg] hover:rotate-[1deg] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
              >
                Tune in →
              </Link>
              <Link
                href="/episodes"
                className="inline-flex items-center px-4 py-3 border-2 border-[#221E1B] text-[#221E1B] font-semibold hover:bg-[#221E1B] hover:text-[#f4ecd8] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
              >
                Browse episodes
              </Link>
            </div>
          </div>
        </section>

        {/* Next ride / open shop */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-12 grid sm:grid-cols-2 gap-6">
            {COMMUNITY_EVENTS.map((e) => (
              <div key={e.kind} className="border-2 border-[#221E1B] p-6 bg-[#fff8e8]" style={{ boxShadow: `6px 6px 0 ${e.color}` }}>
                <p className="font-mono text-[11px] uppercase tracking-wider mb-1" style={{ color: e.color }}>{e.eyebrow}</p>
                <p className="font-display text-2xl font-bold text-[#221E1B]">{e.title}</p>
                <p className="text-sm text-[#221E1B]/80 mt-2">{e.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Seasons */}
        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Four seasons.</h2>
            <p className="text-[#5b4d2c] mb-10 max-w-2xl">Apron-first, because the apron is what the job teaches.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SEASONS.map((s, i) => (
                <Link
                  key={s.number}
                  href={`/episodes#season-${s.number}`}
                  className="block border-4 border-[#221E1B] p-5 transition-transform hover:rotate-[-1deg] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                  style={{ background: `${STICKER_COLORS[i]}33`, boxShadow: "6px 6px 0 #221E1B" }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/60">Season {s.number}</p>
                  <p className="font-display text-2xl font-bold text-[#221E1B] leading-[0.95] mt-1">{s.title}</p>
                  <p className="text-xs text-[#221E1B]/80 mt-3">{MONON_SEASON_TAGLINES[s.number]}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent episodes */}
        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h2 className="font-display text-4xl text-[#221E1B]">Recent episodes</h2>
              <Link href="/episodes" className="text-sm font-bold underline underline-offset-4 decoration-[#D33E2D] decoration-2">All 32 →</Link>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EPISODES.slice(0, 6).map((e, i) => (
                <li key={e.slug}>
                  <Link
                    href={`/episodes/${e.slug}`}
                    className="block border-2 border-[#221E1B] bg-[#fff8e8] p-4 hover:translate-y-[-3px] hover:translate-x-[-1px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                    style={{ boxShadow: "4px 4px 0 #221E1B" }}
                  >
                    <span className="sticker px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: STICKER_COLORS[i % 4] }}>S{e.season}·E{String(e.ep).padStart(2, "0")}</span>
                    <p className="font-display text-xl font-bold text-[#221E1B] mt-3 leading-tight">{e.title}</p>
                    {e.subtitle && <p className="text-xs text-[#221E1B]/70 mt-2">{e.subtitle}</p>}
                    <p className="text-[10px] font-mono uppercase tracking-wider mt-3" style={{ color: APRON_COLORS[e.apronLevel] }}>{APRON_LABELS[e.apronLevel]}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Stuck together.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">RideWitUS doesn&apos;t do everything — it sticks to neighbors who do it well.</p>
            <ul className="flex flex-wrap gap-3">
              {[
                { label: "CentOS Academy · classes", color: "#F4B44A", href: "https://centenarianos.com/academy" },
                { label: "Wanderlust · routes", color: "#5C8AA5", href: "https://wanderlust.witus.online" },
                { label: "FlashLearnAI · vocab", color: "#D33E2D", href: "https://flashlearnai.witus.online" },
                { label: "WitUS Inbox · forms", color: "#3E7C3A", href: "https://inbox.witus.online" },
                { label: "WitUS Outbox · posts", color: "#F4B44A", href: "https://witus.online" },
                { label: "CentOS Travel · rides", color: "#5C8AA5", href: "https://centenarianos.com" },
              ].map((b, i) => (
                <a
                  key={i}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sticker inline-block px-4 py-2 text-sm font-bold uppercase tracking-wider hover:translate-y-[-2px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                  style={{ background: b.color, transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
                >
                  {b.label}
                </a>
              ))}
            </ul>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
