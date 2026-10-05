import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { WaitlistForm } from "@/components/waitlist-form";

// Public and static: the form posts to /api/waitlist, so this page never touches the database and
// builds on a deploy with no DATABASE_URL (PRD §14).
export const metadata = {
  title: "Mobility app waitlist",
  description:
    "RideWitUS is adding a private app for tracking trips, vehicles, fuel, maintenance, and travel costs. Join the waitlist to hear when it opens.",
};

export default function WaitlistPage() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg] inline-block mb-4">
              Private trial
            </span>
            <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-[#221E1B] leading-[0.95]">
              <span className="block">How you move,</span>
              <span className="block" style={{ color: "#D33E2D" }}>
                and what it costs.
              </span>
            </h1>
            <p className="mt-6 text-lg text-[#221E1B] leading-relaxed">
              RideWitUS is building a private app for trips, rides, flights, vehicles, fuel, and maintenance, with the
              true cost of each mile. It works with CentenarianOS for budgets and health. Right now one person uses
              it. Leave your email and we&apos;ll tell you when it opens to more.
            </p>
            <div className="mt-10">
              <WaitlistForm />
            </div>
            <p className="mt-10 text-sm text-[#221E1B]/80">
              We only use your email to tell you about the mobility app. Already have access?{" "}
              <Link
                href="/signin"
                className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]"
              >
                Sign in with WitUS
              </Link>
              .
            </p>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
