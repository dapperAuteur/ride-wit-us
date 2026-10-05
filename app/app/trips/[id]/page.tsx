import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { TRIP_MODE_LABELS } from "@/lib/mobility/options";
import { getJourney, getTrip, tripFormChoices } from "@/lib/mobility/queries";
import { tripFormValues } from "@/lib/mobility/trip-values";
import { formatDate } from "@/lib/mobility/zoned-time";
import { deleteTrip, updateTrip } from "../actions";
import { TripForm } from "../trip-form";

export const metadata = { title: "Edit trip" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const loaded = await safeLoad("load trip", async () => {
    const trip = await getTrip(ctx.user.id, id);
    if (!trip) return null;
    const [choices, journey] = await Promise.all([
      tripFormChoices(ctx.user.id, trip.vehicleId),
      trip.journeyId ? getJourney(ctx.user.id, trip.journeyId) : Promise.resolve(null),
    ]);
    return { trip, choices, journey };
  });
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  if (!loaded.data) notFound();
  const { trip, choices, journey } = loaded.data;
  const title = `${TRIP_MODE_LABELS[trip.mode]}, ${formatDate(trip.startDate)}`;

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader
        title={title}
        intro={journey ? `A leg of ${journey.journey.name}.` : undefined}
        back={journey ? { href: `/app/journeys/${journey.journey.id}`, label: journey.journey.name } : { href: "/app/trips", label: "Trips" }}
      />
      <TripForm
        action={updateTrip.bind(null, trip.id)}
        initial={tripFormValues(trip)}
        vehicles={choices.vehicles}
        places={choices.places}
        journeyId={trip.journeyId}
        defaultTimeZone={ctx.settings.timeZone}
        defaultDate={trip.startDate}
        homeCurrency={ctx.settings.homeCurrency}
        submitLabel="Save changes"
      />
      <section aria-labelledby="danger-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="danger-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Delete
        </h2>
        <DeleteButton
          action={deleteTrip.bind(null, trip.id)}
          label={journey ? "Delete leg" : "Delete trip"}
          warning="Delete this trip? This can't be undone."
        />
      </section>
    </UnitsProvider>
  );
}
