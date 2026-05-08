import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { NotifyMeForm } from "@/components/notify-me-form";
import { COMMUNITY_EVENTS } from "@/lib/community-events";
import { EPISODES } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";

interface EcosystemLink {
  label: string;
  body: string;
  href: string;
  color: string;
  rotate: string;
  external?: boolean;
}

const ECOSYSTEM_LINKS: EcosystemLink[] = [
  {
    label: "Take the class",
    body: "Structured lessons with quizzes in CentOS Academy.",
    href: "https://centenarianos.com/academy",
    color: "#F4B44A",
    rotate: "-2deg",
    external: true,
  },
  {
    label: "Drill the vocab",
    body: "Spaced-repetition decks per episode in FlashLearnAI.",
    href: "https://flashlearnai.witus.online",
    color: "#D33E2D",
    rotate: "1.5deg",
    external: true,
  },
  {
    label: "Ride the route",
    body: "360° virtual tours of the routes in Wanderlearn.",
    href: "https://wanderlearn.witus.online",
    color: "#5C8AA5",
    rotate: "-1deg",
    external: true,
  },
  {
    label: "Log your rides",
    body: "Track miles, gear, and rides in CentenarianOS Travel.",
    href: "https://centenarianos.com",
    color: "#3E7C3A",
    rotate: "2deg",
    external: true,
  },
  {
    label: "Browse the umbrella",
    body: "The full WitUS ecosystem, products, and partners.",
    href: "https://witus.online",
    color: "#F4B44A",
    rotate: "-1.5deg",
    external: true,
  },
  {
    label: "Merch + prints",
    body: "AwesomeWebStore — tees, posters, artifacts.",
    href: "https://awesomewebstore.com",
    color: "#5C8AA5",
    rotate: "1deg",
    external: true,
  },
];

export const metadata = { title: "Tune in" };

export default function TuneInPage() {
  const featured = EPISODES.find((e) => e.status === "published") ?? EPISODES[0];

  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg] inline-block mb-4">Tune in</span>
            <h1 className="font-display text-6xl sm:text-8xl tracking-tight text-[#221E1B] leading-[0.9]">
              <span className="block">Pick episodes.</span>
              <span className="block" style={{ color: "#D33E2D" }}>Go deeper.</span>
              <span className="block">Show up.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-[#221E1B] leading-relaxed">
              Tell us which episodes you want a heads-up on. Continue across the ecosystem when you want more. Show up at the open shop on a Wednesday.
            </p>
          </div>
        </section>

        <section>
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Continue across the ecosystem.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">RideWitUS is one piece of the WitUS ecosystem. Each episode threads into siblings that handle classes, decks, routes, ride logs, and the umbrella brand.</p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ECOSYSTEM_LINKS.map((d) => (
                <li key={d.label}>
                  <a
                    href={d.href}
                    target={d.external ? "_blank" : undefined}
                    rel={d.external ? "noopener noreferrer" : undefined}
                    className="block border-2 border-[#221E1B] bg-[#fff8e8] p-4 hover:translate-y-[-3px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
                    style={{ boxShadow: `4px 4px 0 ${d.color}`, transform: `rotate(${d.rotate})` }}
                  >
                    <span className="sticker inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: d.color }}>{d.label}</span>
                    <p className="text-sm text-[#221E1B]/80 mt-3 leading-relaxed">{d.body}</p>
                    {d.external && <span className="sr-only"> (opens in new tab)</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Get notified when an episode drops.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">Pick whole seasons, individual episodes, or every new episode. We email you when the ones you care about go live — and nothing else.</p>
            <NotifyMeForm />
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Latest on the porch.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">{featured.status === "published" ? "Most recent episode." : "Sneak peek at what's coming."}</p>
            <div className="border-2 border-[#221E1B] bg-[#fff8e8] p-6 grid sm:grid-cols-[auto,1fr] gap-6 items-start" style={{ boxShadow: "8px 8px 0 #5C8AA5" }}>
              <div className="size-20 grid place-items-center bg-[#221E1B] text-[#f4ecd8] text-3xl font-bold border-2 border-[#221E1B]">▶</div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/60">S{featured.season}·E{String(featured.ep).padStart(2, "0")}</p>
                <p className="font-display text-3xl font-bold text-[#221E1B] mt-1 leading-tight">{featured.title}</p>
                {featured.subtitle && <p className="font-display text-lg mt-2" style={{ color: APRON_COLORS[featured.apronLevel] }}>{featured.subtitle}</p>}
                <p className="text-sm text-[#221E1B] mt-4 leading-relaxed">{featured.body}</p>
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border-2" style={{ color: APRON_COLORS[featured.apronLevel], borderColor: APRON_COLORS[featured.apronLevel] }}>
                    {APRON_LABELS[featured.apronLevel]}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border-2 border-[#221E1B]/50 text-[#221E1B]/70">
                    {featured.status}
                  </span>
                  <Link href={`/episodes/${featured.slug}`} className="ml-auto text-sm font-bold underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]">
                    Full episode page →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Show up in person.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">The podcast is half the school. The other half is the bench, the trail, and the people you&apos;ll meet there.</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {COMMUNITY_EVENTS.map((e) => (
                <div key={e.kind} className="border-2 border-[#221E1B] p-6 bg-[#fff8e8]" style={{ boxShadow: `6px 6px 0 ${e.color}` }}>
                  <p className="font-mono text-[11px] uppercase tracking-wider mb-1" style={{ color: e.color }}>{e.eyebrow}</p>
                  <p className="font-display text-2xl font-bold text-[#221E1B]">{e.title}</p>
                  <p className="text-sm text-[#221E1B]/80 mt-2">{e.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">Bring this to your block.</h2>
            <p className="text-[#5b4d2c] mb-8 max-w-2xl">A library, a school, a community space, a bike shop — host a listen party or invite us to run a session. Tell us where, we&apos;ll bring the curriculum.</p>
            <HostListenPartyForm />
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}

function HostListenPartyForm() {
  return (
    <form
      action="/api/inbox-ingest"
      method="post"
      className="border-2 border-[#221E1B] bg-[#fff8e8] p-6 grid gap-4"
      style={{ boxShadow: "6px 6px 0 #221E1B" }}
    >
      <input type="hidden" name="form_type" value="host_listen_party" />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">Organization</span>
          <input
            type="text"
            name="org_name"
            required
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">Your name + contact</span>
          <input
            type="text"
            name="contact"
            required
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">Neighborhood / city</span>
          <input
            type="text"
            name="neighborhood"
            required
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">Preferred date (optional)</span>
          <input
            type="date"
            name="preferred_date"
            className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
          />
        </label>
      </div>
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/70">What you&apos;d like to host</span>
        <textarea
          name="notes"
          rows={4}
          className="block w-full mt-1 border-2 border-[#221E1B] bg-white px-3 py-2 text-base text-[#221E1B] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C8AA5]"
        />
      </label>
      <button
        type="submit"
        className="sticker self-start px-5 py-3 text-base font-bold uppercase tracking-wide rotate-[-1deg] hover:rotate-[1deg] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
        style={{ background: "#5C8AA5", color: "#f4ecd8" }}
      >
        Send the invite →
      </button>
    </form>
  );
}
