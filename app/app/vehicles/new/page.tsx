import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { createVehicle } from "../actions";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Add a vehicle" };

export default async function NewVehiclePage() {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title="Add a vehicle" back={{ href: "/app/vehicles", label: "Vehicles" }} />
      <VehicleForm action={createVehicle} initial={null} homeCurrency={ctx.settings.homeCurrency} submitLabel="Add vehicle" />
    </UnitsProvider>
  );
}
