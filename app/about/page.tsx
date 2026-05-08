import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "About",
  description: "What RideWitUS is, the bikes it's taught on, and how it ties into the WitUS ecosystem.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16 prose prose-invert prose-slate">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-3">About</p>
          <h1 className="text-4xl font-semibold text-white">A bike-shop curriculum, in podcast form.</h1>

          <p className="text-slate-300 text-lg leading-relaxed mt-6">
            RideWitUS is the audio-first version of a real bicycle-mechanic curriculum. Modeled on the BetterViceClub format — 35 to 40 minute episodes, modular cut-points so instructors can pull per-skill clips, and a companion class in CentOS Academy for every episode.
          </p>

          <h2 className="text-white mt-12">Why apron-first.</h2>
          <p className="text-slate-300">
            FreeWheelin&apos; Community Bikes in Indianapolis teaches mechanic skills through a tiered apron system: Green, Red, Purple, Black. Season 1 maps to the Green and Red Apron entry curriculum. Season 2 covers Purple and Black. Season 3 is the &ldquo;why behind the wrench&rdquo; — bike design and folding-bike engineering. Season 4 is program operations: the Bike Lab, YEET apprenticeship, community rides, partnerships, grants.
          </p>

          <h2 className="text-white mt-12">Why the bike changes by season.</h2>
          <p className="text-slate-300">
            Most listeners don&apos;t own a specialty bike, so the curriculum starts with the simplest one and earns complexity. <strong className="text-white">Season 1</strong> is taught on a single-speed cruiser — the simplest bike at the donation bay, no derailleur, no shift cable. <strong className="text-white">Season 2</strong> introduces gears: cassettes, freewheels, derailleurs, internal hubs. <strong className="text-white">Season 3</strong> brings the Brompton in as the engineering object lesson — the fold, the hinge, the 16-inch wheels, the materials. <strong className="text-white">Season 4</strong> is bike-agnostic: it&apos;s about running the program.
          </p>

          <h2 className="text-white mt-12">How it plugs into the ecosystem.</h2>
          <p className="text-slate-300">
            Classes are authored and played in <a href="https://centenarianos.com/academy" className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer">CentOS Academy</a>. Routes captured for episodes appear as 360° tours in <a href="https://wanderlearn.witus.online" className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer">Wanderlearn</a>. Spaced-repetition flashcards live in <a href="https://flashlearnai.witus.online" className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer">FlashLearnAI</a> with one set per lesson. Contact forms triage through <a href="https://inbox.witus.online" className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer">WitUS Inbox</a>. Episode launches schedule through <a href="https://witus.online" className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer">WitUS Outbox</a>. Rides themselves remain logged in CentOS Travel.
          </p>

          <p className="text-slate-300 mt-8">
            <em>The podcast is what ties it together.</em>
          </p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
