import Link from "next/link";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { trips, vehicles } from "@/db/schema";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/mobility/styles";
import { Measurement } from "@/components/units/measurement";
import { UnitsProvider } from "@/components/units/units-provider";
import { UnitsToggle } from "@/components/units/units-toggle";
import { getMobilityContext } from "@/lib/mobility/context";
import { monthBounds } from "@/lib/mobility/dates";

export const metadata = { title: "Dashboard" };

async function loadSummary(userId: string, timeZone: string | null) {
  const db = getDb();
  const { start, nextStart } = monthBounds(new Date(), timeZone);
  const [[v], [t]] = await Promise.all([
    db.select({ n: count() }).from(vehicles).where(and(eq(vehicles.userId, userId), eq(vehicles.isActive, true))),
    db
      // A round trip is stored one way and counts twice (lib/mobility/grouping.ts effectiveDistanceM).
      .select({
        n: count(),
        meters: sql<string | null>`sum(case when ${trips.isRoundTrip} then ${trips.distanceM} * 2 else ${trips.distanceM} end)`,
      })
      .from(trips)
      .where(
        and(
          eq(trips.userId, userId),
          eq(trips.status, "completed"),
          gte(trips.startDate, start),
          lt(trips.startDate, nextStart)
        )
      ),
  ]);
  return { vehicles: v?.n ?? 0, tripsThisMonth: t?.n ?? 0, metersThisMonth: Number(t?.meters ?? 0) };
}

export default async function MobilityDashboardPage() {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;

  let summary: Awaited<ReturnType<typeof loadSummary>> | null = null;
  try {
    summary = await loadSummary(ctx.user.id, ctx.settings.timeZone);
  } catch (err) {
    console.error("[mobility] dashboard summary failed err=%s", err instanceof Error ? err.name : "UnknownError");
  }
  if (!summary) return <MobilityGate state="database_error" />;

  const name = ctx.user.displayName || ctx.user.email;
  const cards = [
    { label: "Trips this month", value: <>{summary.tripsThisMonth}</> },
    { label: "Distance this month", value: <Measurement value={summary.metersThisMonth} dimension="distance" /> },
    { label: "Active vehicles", value: <>{summary.vehicles}</> },
  ];

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <section aria-labelledby="dash-heading">
        <p className="font-mono text-xs uppercase tracking-wider text-[#221E1B]/80">Signed in as {name}</p>
        <h1 id="dash-heading" className="mt-2 font-display text-4xl sm:text-5xl tracking-tight text-[#221E1B]">
          Your mobility
        </h1>
        <div className="mt-6">
          <UnitsToggle />
        </div>

        <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="border-2 border-[#221E1B] bg-[#fff8e8] p-5" style={{ boxShadow: "4px 4px 0 #5C8AA5" }}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/80">{c.label}</dt>
              <dd className="mt-2 font-display text-3xl text-[#221E1B]">{c.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/app/trips/new" className={BTN_PRIMARY}>
            Log a trip
          </Link>
          <Link href="/app/journeys/new" className={BTN_SECONDARY}>
            Plan a multi-leg trip
          </Link>
          <Link href="/app/vehicles/new" className={BTN_SECONDARY}>
            Add a vehicle
          </Link>
        </div>

        {summary.tripsThisMonth === 0 && summary.vehicles === 0 ? (
          <div className="mt-10 border-2 border-dashed border-[#221E1B] bg-[#fff8e8] p-6 max-w-2xl">
            <h2 className="font-display text-2xl text-[#221E1B]">Nothing logged yet</h2>
            <p className="mt-2 text-[#221E1B] leading-relaxed">
              Start with your units and currency so every distance and cost shows up the way you read it. Then add
              the vehicles you use, save a few places (home stays private), and log a trip.
            </p>
            <Link href="/app/settings" className={`mt-4 ${BTN_PRIMARY}`}>
              {ctx.hasSavedSettings ? "Review settings" : "Set your units"}
            </Link>
          </div>
        ) : null}
      </section>
    </UnitsProvider>
  );
}
