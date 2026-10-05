import { notFound } from "next/navigation";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { getJourney, listPlaces } from "@/lib/mobility/queries";
import { createStay } from "@/app/app/journeys/actions";
import { StayForm } from "@/app/app/journeys/journey-forms";

export const metadata = { title: "Add a stay" };

export default async function NewStayPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const loaded = await safeLoad("load stay form", () => Promise.all([getJourney(ctx.user.id, id), listPlaces(ctx.user.id)]));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [found, placeRows] = loaded.data;
  if (!found) notFound();
  const j = found.journey;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title="Add a stay" intro={`Part of ${j.name}.`} back={{ href: `/app/journeys/${j.id}`, label: j.name }} showUnits={false} />
      <StayForm
        action={createStay.bind(null, j.id)}
        initial={null}
        places={placeRows.filter((p) => p.kind !== "home").map((p) => ({ id: p.id, label: p.label }))}
        defaultCheckIn={j.startDate}
        defaultCheckOut={j.endDate ?? j.startDate}
        homeCurrency={ctx.settings.homeCurrency}
        submitLabel="Add stay"
      />
    </UnitsProvider>
  );
}
