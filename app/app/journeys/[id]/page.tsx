import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { EmptyState, Notice, PageHeader } from "@/components/mobility/page-header";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { Subtotals } from "@/components/mobility/subtotals";
import { StatusBadge, TripLine } from "@/components/mobility/trip-line";
import { Measurement } from "@/components/units/measurement";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { buildItinerary, totalDistanceM } from "@/lib/mobility/grouping";
import { nightsBetween } from "@/lib/mobility/journey-form";
import { safeLoad } from "@/lib/mobility/load";
import { formatAmount, subtotalsByCurrency } from "@/lib/mobility/money";
import { getJourney, listVehicles } from "@/lib/mobility/queries";
import { formatDate } from "@/lib/mobility/zoned-time";
import { deleteJourney } from "../actions";

export const metadata = { title: "Itinerary" };

const NOTICES: Record<string, string> = {
  journey: "Trip saved.",
  leg: "Leg saved.",
  stay: "Stay saved.",
};

export default async function JourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const loaded = await safeLoad("load journey", () => Promise.all([getJourney(ctx.user.id, id), listVehicles(ctx.user.id)]));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [found, vehicleRows] = loaded.data;
  if (!found) notFound();
  const { journey, legs, stays } = found;
  const vehicleNames = new Map(vehicleRows.map((v) => [v.id, v.nickname]));
  const itinerary = buildItinerary(legs, stays);
  const subtotals = subtotalsByCurrency([...legs.filter((l) => l.status !== "cancelled"), ...stays]);
  const dates =
    formatDate(journey.startDate) +
    (journey.endDate && journey.endDate !== journey.startDate ? ` to ${formatDate(journey.endDate)}` : "");

  const actions = (
    <>
      <Link href={`/app/trips/new?journey=${journey.id}`} className={BTN_PRIMARY}>
        Add a leg
      </Link>
      <Link href={`/app/journeys/${journey.id}/stays/new`} className={BTN_SECONDARY}>
        Add a stay
      </Link>
      <Link href={`/app/journeys/${journey.id}/edit`} className={BTN_SECONDARY}>
        Edit details
      </Link>
    </>
  );

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title={journey.name} intro={dates} back={{ href: "/app/trips", label: "Trips" }} actions={actions} />
      {sp.saved && NOTICES[sp.saved] ? <Notice>{NOTICES[sp.saved]}</Notice> : null}
      {sp.deleted ? <Notice>{sp.deleted === "stay" ? "Stay deleted." : "Leg deleted."}</Notice> : null}

      <section aria-labelledby="summary-heading" className={`${CARD} mb-8`} style={{ boxShadow: "4px 4px 0 #F4B44A" }}>
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={journey.status} />
          <span className={`text-sm ${MUTED}`}>
            {legs.length} {legs.length === 1 ? "leg" : "legs"} · {stays.length} {stays.length === 1 ? "stay" : "stays"}
          </span>
        </div>
        <p className="mt-2 text-[#221E1B]">
          <span className={MUTED}>Distance, done legs: </span>
          <span className="font-semibold">
            <Measurement value={totalDistanceM(legs.filter((l) => l.status === "completed"))} dimension="distance" />
          </span>
        </p>
        <div className="mt-1">
          <Subtotals subtotals={subtotals} label="Costs" />
        </div>
      </section>

      <section aria-labelledby="itinerary-heading">
        <h2 id="itinerary-heading" className="font-display text-2xl text-[#221E1B] mb-3">
          Itinerary
        </h2>
        {itinerary.length === 0 ? (
          <EmptyState
            title="Nothing on the itinerary yet"
            body="Add each leg (the flight out, the train, the ride back) and where you're staying."
            action={actions}
          />
        ) : (
          <ol className="space-y-4">
            {itinerary.map((entry, i) => {
              const heading = i === 0 || itinerary[i - 1].date !== entry.date ? formatDate(entry.date) : null;
              return (
                <li key={entry.type === "leg" ? entry.leg.id : entry.stay.id}>
                  {heading ? <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-[#221E1B]/80">{heading}</h3> : null}
                  {entry.type === "leg" ? (
                    <div className={CARD}>
                      <TripLine
                        trip={entry.leg}
                        showDate={false}
                        vehicleName={entry.leg.vehicleId ? vehicleNames.get(entry.leg.vehicleId) : null}
                      />
                    </div>
                  ) : (
                    <div className={`${CARD} border-dashed`}>
                      <Link
                        href={`/app/journeys/${journey.id}/stays/${entry.stay.id}`}
                        className={`${TEXT_LINK} font-semibold min-h-11 inline-flex items-center`}
                      >
                        Stay · {entry.stay.name}
                      </Link>
                      <p className="text-[#221E1B]">
                        {formatDate(entry.stay.checkInDate)} to {formatDate(entry.stay.checkOutDate)} ·{" "}
                        {nightsBetween(entry.stay.checkInDate, entry.stay.checkOutDate)}{" "}
                        {nightsBetween(entry.stay.checkInDate, entry.stay.checkOutDate) === 1 ? "night" : "nights"}
                      </p>
                      <p className={`text-sm ${MUTED}`}>
                        {[
                          entry.stay.address,
                          entry.stay.confirmationNumber ? `Confirmation ${entry.stay.confirmationNumber}` : null,
                          formatAmount(entry.stay.costAmount, entry.stay.costCurrency),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No details yet"}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {journey.packingNotes || journey.notes ? (
        <section aria-labelledby="notes-heading" className="mt-10 max-w-2xl">
          <h2 id="notes-heading" className="font-display text-2xl text-[#221E1B]">
            Notes
          </h2>
          {journey.packingNotes ? (
            <>
              <h3 className="mt-3 font-semibold text-[#221E1B]">Packing</h3>
              <p className="whitespace-pre-line text-[#221E1B]">{journey.packingNotes}</p>
            </>
          ) : null}
          {journey.notes ? <p className="mt-3 whitespace-pre-line text-[#221E1B]">{journey.notes}</p> : null}
        </section>
      ) : null}

      <section aria-labelledby="danger-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="danger-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Delete
        </h2>
        <DeleteButton
          action={deleteJourney.bind(null, journey.id)}
          label="Delete this trip"
          warning="Delete this trip with all its legs and stays? This can't be undone."
        />
      </section>
    </UnitsProvider>
  );
}
