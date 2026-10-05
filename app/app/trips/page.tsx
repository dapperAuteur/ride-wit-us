import Link from "next/link";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { EmptyState, Notice, PageHeader } from "@/components/mobility/page-header";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { Subtotals } from "@/components/mobility/subtotals";
import { StatusBadge, TripLine } from "@/components/mobility/trip-line";
import { Measurement } from "@/components/units/measurement";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { groupTripList, totalDistanceM } from "@/lib/mobility/grouping";
import { safeLoad } from "@/lib/mobility/load";
import { subtotalsByCurrency } from "@/lib/mobility/money";
import { listTripsPage, listVehicles, TRIP_FILTERS, type TripFilter } from "@/lib/mobility/queries";
import { formatDate } from "@/lib/mobility/zoned-time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Trips" };

const FILTER_LABELS: Record<TripFilter, string> = { all: "All", planned: "Planned", done: "Done" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; saved?: string; deleted?: string }>;
}) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const sp = await searchParams;
  const filter: TripFilter = TRIP_FILTERS.includes(sp.show as TripFilter) ? (sp.show as TripFilter) : "all";
  const loaded = await safeLoad("list trips", () => Promise.all([listTripsPage(ctx.user.id, filter), listVehicles(ctx.user.id)]));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [page, vehicleRows] = loaded.data;
  const vehicleNames = new Map(vehicleRows.map((v) => [v.id, v.nickname]));
  const items = groupTripList(page.trips, page.journeys, page.stays);

  const counted = page.trips.filter((t) => t.status !== "cancelled");
  const countedStays = page.stays.filter((s) => page.journeys.find((j) => j.id === s.journeyId)?.status !== "cancelled");
  const subtotals = subtotalsByCurrency([...counted, ...countedStays]);
  const doneDistance = totalDistanceM(page.trips.filter((t) => t.status === "completed"));

  const actions = (
    <>
      <Link href="/app/trips/new" className={BTN_PRIMARY}>
        Log a trip
      </Link>
      <Link href="/app/journeys/new" className={BTN_SECONDARY}>
        Plan a multi-leg trip
      </Link>
    </>
  );

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title="Trips" intro="Every way you got somewhere, flights and hotel stays included." actions={actions} />
      {sp.saved ? <Notice>Trip saved.</Notice> : null}
      {sp.deleted ? <Notice>Trip deleted.</Notice> : null}

      <nav aria-label="Filter trips" className="mb-6 flex flex-wrap gap-2">
        {TRIP_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/app/trips" : `/app/trips?show=${f}`}
            aria-current={f === filter ? "page" : undefined}
            className={cn(BTN_SECONDARY, f === filter && "bg-[#221E1B] text-[#fff8e8]")}
          >
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No trips yet" : `No ${FILTER_LABELS[filter].toLowerCase()} trips`}
          body={
            filter === "all"
              ? "Log your next ride, drive, or flight. For a trip with several legs and a hotel, plan a multi-leg trip."
              : "Switch to All to see everything you've logged."
          }
          action={
            <Link href="/app/trips/new" className={BTN_PRIMARY}>
              Log a trip
            </Link>
          }
        />
      ) : (
        <>
          <section aria-labelledby="totals-heading" className={`${CARD} mb-8`} style={{ boxShadow: "4px 4px 0 #5C8AA5" }}>
            <h2 id="totals-heading" className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/80">
              Shown below
            </h2>
            <p className="mt-2 text-[#221E1B]">
              <span className={MUTED}>Distance, done trips: </span>
              <span className="font-semibold">
                <Measurement value={doneDistance} dimension="distance" />
              </span>
            </p>
            <div className="mt-1">
              <Subtotals subtotals={subtotals} label="Costs, not counting cancelled" />
            </div>
            {page.truncated ? <p className={`mt-2 text-sm ${MUTED}`}>Showing the latest 200 trips.</p> : null}
          </section>

          <ul className="space-y-4">
            {items.map((item) =>
              item.type === "trip" ? (
                <li key={item.trip.id} className={CARD}>
                  <TripLine trip={item.trip} vehicleName={item.trip.vehicleId ? vehicleNames.get(item.trip.vehicleId) : null} />
                </li>
              ) : (
                <li key={item.journey.id} className={CARD} style={{ boxShadow: "4px 4px 0 #F4B44A" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl text-[#221E1B]">
                      <Link href={`/app/journeys/${item.journey.id}`} className={`${TEXT_LINK} inline-flex items-center min-h-11`}>
                        {item.journey.name}
                      </Link>
                    </h2>
                    <StatusBadge status={item.journey.status} />
                  </div>
                  <p className={`text-sm ${MUTED}`}>
                    {formatDate(item.journey.startDate)}
                    {item.journey.endDate && item.journey.endDate !== item.journey.startDate
                      ? ` to ${formatDate(item.journey.endDate)}`
                      : ""}
                    {` · ${item.legs.length} ${item.legs.length === 1 ? "leg" : "legs"}`}
                    {item.stays.length ? ` · ${item.stays.length} ${item.stays.length === 1 ? "stay" : "stays"}` : ""}
                  </p>
                  <div className="mt-1">
                    <Subtotals subtotals={item.subtotals} />
                  </div>
                </li>
              )
            )}
          </ul>
        </>
      )}
    </UnitsProvider>
  );
}
