import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { SEASONS } from "@/lib/curriculum/season-colors";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

export const metadata = {
  title: "About",
  description: "What RideWitUS is, the community it's built around, and the long arc of staying upright.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg] inline-block mb-4">About the school</span>
            <h1 className="font-display text-6xl sm:text-7xl tracking-tight text-[#221E1B] leading-[0.95]">
              <span className="block">Why we ride</span>
              <span className="block" style={{ color: "#D33E2D" }}>together.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg text-[#221E1B] leading-relaxed">
              RideWitUS is a community bike school in podcast form. Built around three things — bikes, the people who ride them, and the long arc of staying upright through every decade we get.
            </p>
          </div>
        </section>

        <section>
          <div className="max-w-3xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-4">The show.</h2>
            <p className="text-lg text-[#221E1B] leading-relaxed">
              Audio-first. 35 to 40 minutes per episode. Modular cut-points so an instructor can pull a single skill clip and play it in class. Modeled on the BetterViceClub format developed at <a href="https://centenarianos.com/academy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]">CentenarianOS Academy</a>. Every episode has a companion class, a flashcard deck, and (where the route applies) a 360° ride tour in <a href="https://wanderlearn.witus.online" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]">Wanderlearn</a>.
            </p>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[1deg] inline-block mb-4" style={{ background: "#5C8AA5", color: "#f4ecd8" }}>Indianapolis</span>
            <h2 className="font-display text-4xl text-[#221E1B] mb-4">The community.</h2>
            <p className="text-lg text-[#221E1B] leading-relaxed mb-4">
              The curriculum is built around <strong>FreeWheelin&apos; Community Bikes</strong> in Indianapolis — a youth-employment-and-mechanic-training nonprofit that teaches through a tiered apron system: Green, Red, Purple, Black. Apprentices in the YEET program earn the bikes they learn on. Wednesday open-shop nights, Saturday community rides, donation days that keep the donation bay full.
            </p>
            <p className="text-lg text-[#221E1B] leading-relaxed">
              RideWitUS makes the apron-tier curriculum portable: anyone with headphones gets the same instruction the YEET apprentices get on the bench, taught at a pace and on a bike that makes sense to people who don&apos;t already own a wrench.
            </p>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-2">The four seasons.</h2>
            <p className="text-[#5b4d2c] mb-10 max-w-2xl">Simplest bike first. Complexity earned. The bike progression matches the apron tiers.</p>
            <ol className="grid sm:grid-cols-2 gap-4">
              {SEASONS.map((s, i) => (
                <li key={s.number} className="border-2 border-[#221E1B] bg-[#fff8e8] p-5" style={{ boxShadow: `4px 4px 0 ${STICKER_COLORS[i]}` }}>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/60">Season {s.number}</p>
                  <p className="font-display text-2xl font-bold text-[#221E1B] mt-1 leading-tight">{s.title}</p>
                  <p className="text-sm text-[#221E1B]/80 mt-2 leading-relaxed">{s.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <h2 className="font-display text-4xl text-[#221E1B] mb-4">The host.</h2>
            <p className="text-lg text-[#221E1B] leading-relaxed">
              Brand Anthony McDonald — operator of the WitUS ecosystem, scholar of the apron, and the voice you&apos;ll hear on every episode. Indianapolis-based. The full bio (and the rest of the work) lives at <a href="https://brandanthonymcdonald.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]">brandanthonymcdonald.com</a>.
            </p>
          </div>
        </section>

        <section className="border-t-4 border-dashed border-[#221E1B]">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <p className="text-[#5b4d2c] mb-4 max-w-2xl mx-auto">Now that you know what we&apos;re doing —</p>
            <Link
              href="/tune-in"
              className="sticker inline-block px-6 py-4 text-lg font-bold uppercase tracking-wide rotate-[-1deg] hover:rotate-[1deg] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
            >
              Tune in →
            </Link>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
