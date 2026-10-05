import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { createPlace } from "../actions";
import { PlaceForm } from "../place-form";

export const metadata = { title: "Add a place" };

export default async function NewPlacePage() {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title="Add a place" back={{ href: "/app/places", label: "Places" }} showUnits={false} />
      <PlaceForm action={createPlace} initial={null} submitLabel="Add place" />
    </UnitsProvider>
  );
}
