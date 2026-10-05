import Link from "next/link";
import type { MobilityContext } from "@/lib/mobility/context";

const COPY: Record<Exclude<MobilityContext["state"], "ok">, { title: string; body: string }> = {
  no_database: {
    title: "Mobility isn't switched on here yet",
    body: "This deployment has no mobility database configured, so there is nothing to show. The podcast and every episode page work as usual.",
  },
  database_error: {
    title: "We couldn't load your mobility data",
    body: "The database didn't answer. Nothing was lost. Try again in a minute.",
  },
  waitlisted: {
    title: "You're signed in, and the mobility app isn't open yet",
    body: "RideWitUS mobility is in a private trial. Join the waitlist and you'll hear when it opens.",
  },
};

/** What a /app page renders instead of its content when the context is not "ok". */
export function MobilityGate({ state }: { state: Exclude<MobilityContext["state"], "ok"> }) {
  const copy = COPY[state];
  return (
    <section aria-labelledby="gate-heading" className="max-w-xl">
      <h1 id="gate-heading" className="font-display text-4xl tracking-tight text-[#221E1B]">
        {copy.title}
      </h1>
      <p className="mt-4 text-lg text-[#221E1B] leading-relaxed">{copy.body}</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {state === "waitlisted" ? (
          <Link
            href="/waitlist"
            className="inline-flex items-center justify-center min-h-12 px-5 border-2 border-[#221E1B] bg-[#F4B44A] text-[#221E1B] font-semibold rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
          >
            Join the waitlist
          </Link>
        ) : null}
        <Link
          href="/episodes"
          className="inline-flex items-center justify-center min-h-12 px-5 border-2 border-[#221E1B] bg-[#fff8e8] text-[#221E1B] font-semibold rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
        >
          Browse the episodes
        </Link>
      </div>
    </section>
  );
}
