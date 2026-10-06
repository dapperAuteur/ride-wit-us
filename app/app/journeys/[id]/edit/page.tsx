import { notFound } from "next/navigation";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { getJourney } from "@/lib/mobility/queries";
import { updateJourney } from "../../actions";
import { JourneyForm } from "../../journey-forms";

export const metadata = { title: "Edit trip details" };

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const loaded = await safeLoad("load journey", () => getJourney(ctx.user.id, id));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  if (!loaded.data) notFound();
  const { journey: j } = loaded.data;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title="Edit trip details" back={{ href: `/app/journeys/${j.id}`, label: j.name }} showUnits={false} />
      <JourneyForm
        action={updateJourney.bind(null, j.id)}
        initial={{ name: j.name, status: j.status, startDate: j.startDate, endDate: j.endDate, packingNotes: j.packingNotes, notes: j.notes }}
        defaultDate={j.startDate}
        submitLabel="Save changes"
      />
    </UnitsProvider>
  );
}
