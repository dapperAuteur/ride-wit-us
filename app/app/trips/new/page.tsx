import { notFound } from "next/navigation";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { localDate } from "@/lib/mobility/dates";
import { safeLoad } from "@/lib/mobility/load";
import { getJourney, tripFormChoices } from "@/lib/mobility/queries";
import { createTrip } from "../actions";
import { TripForm } from "../trip-form";

export const metadata = { title: "Log a trip" };

/** `?journey=<id>` adds a leg to that multi-leg trip; the id is checked against the owner. */
export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ journey?: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { journey: journeyParam } = await searchParams;
  const loaded = await safeLoad("load trip form", () =>
    Promise.all([tripFormChoices(ctx.user.id), journeyParam ? getJourney(ctx.user.id, journeyParam) : Promise.resolve(null)])
  );
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [choices, journey] = loaded.data;
  if (journeyParam && !journey) notFound();

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader
        title={journey ? "Add a leg" : "Log a trip"}
        intro={journey ? `Part of ${journey.journey.name}.` : "A ride, a drive, a flight: any way you got somewhere."}
        back={journey ? { href: `/app/journeys/${journey.journey.id}`, label: journey.journey.name } : { href: "/app/trips", label: "Trips" }}
      />
      <TripForm
        action={createTrip}
        initial={null}
        vehicles={choices.vehicles}
        places={choices.places}
        journeyId={journey?.journey.id ?? null}
        defaultTimeZone={ctx.settings.timeZone}
        defaultDate={journey ? journey.journey.startDate : localDate(new Date(), ctx.settings.timeZone)}
        homeCurrency={ctx.settings.homeCurrency}
        submitLabel={journey ? "Add leg" : "Log trip"}
      />
    </UnitsProvider>
  );
}
