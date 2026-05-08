import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SEASONS } from "@/lib/curriculum/season-colors";
import { EPISODES } from "@/lib/curriculum/episodes";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">A WitUS ecosystem product</p>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white max-w-3xl">
              A bike-shop curriculum, in podcast form.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              RideWitUS is an audio-first bicycle-mechanic curriculum. 32 episodes across four seasons — single-speed foundations, the gears chapter, folding-bike engineering on a Brompton, and program operations. Modeled on the BetterViceClub format.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/episodes"
                className="inline-flex items-center px-5 py-3 rounded-md bg-white text-slate-950 font-semibold hover:bg-amber-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Browse all 32 episodes
              </Link>
              <Link
                href="/design"
                className="inline-flex items-center px-5 py-3 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-900 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Compare three design directions →
              </Link>
            </div>
          </div>
        </section>

        {/* Seasons */}
        <section className="border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-semibold text-white mb-2">The four seasons</h2>
            <p className="text-slate-400 mb-8">Apron-first, because the apron is what the job teaches. Bike progression matches: simplest bike first, complexity earned.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {SEASONS.map((s) => (
                <Link
                  key={s.number}
                  href={`/seasons/${s.number}`}
                  className="block rounded-lg border border-slate-800 bg-slate-900/40 p-6 hover:border-amber-300 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <p className="text-xs uppercase tracking-wider text-slate-500">Season {s.number}</p>
                  <h3 className="text-xl font-semibold text-white mt-1">{s.title}</h3>
                  <p className="text-sm text-amber-200 mt-1">{s.tagline}</p>
                  <p className="mt-3 text-sm text-slate-400">{s.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem fit */}
        <section className="border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-semibold text-white mb-2">How RideWitUS fits the ecosystem</h2>
            <p className="text-slate-400 mb-8">RideWitUS doesn't rebuild what already works. It plugs in.</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-slate-300">
              <li><strong className="text-white">Classes</strong> — taught in CentOS Academy. Lessons, blocks, quizzes, completion.</li>
              <li><strong className="text-white">Routes</strong> — captured 360° in Wanderlearn. Indianapolis trails, then beyond.</li>
              <li><strong className="text-white">Vocabulary</strong> — drilled in FlashLearnAI. One spaced-rep set per lesson.</li>
              <li><strong className="text-white">Contact forms</strong> — triaged in WitUS Inbox. One queue, signed webhook.</li>
              <li><strong className="text-white">Episode launches</strong> — scheduled via WitUS Outbox. One social pipeline.</li>
              <li><strong className="text-white">Rides</strong> — logged in CentOS Travel. Where they always were.</li>
            </ul>
          </div>
        </section>

        {/* Latest episodes */}
        <section>
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Recent episodes</h2>
              <Link href="/episodes" className="text-sm text-amber-300 hover:underline">All 32 →</Link>
            </div>
            <ul className="divide-y divide-slate-800 border-y border-slate-800">
              {EPISODES.slice(0, 6).map((e) => (
                <li key={e.slug}>
                  <Link href={`/episodes/${e.slug}`} className="flex items-baseline gap-4 py-4 hover:bg-slate-900/40 px-2 -mx-2 rounded transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    <span className="font-mono text-xs text-slate-500 w-20 shrink-0">S{e.season}·E{e.ep}</span>
                    <span className="font-semibold text-white">{e.title}</span>
                    <span className="text-sm text-slate-400 hidden sm:inline">— {e.subtitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </article>
      <SiteFooter />
    </>
  );
}
