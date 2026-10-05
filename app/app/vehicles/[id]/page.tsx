import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { getVehicle } from "@/lib/mobility/queries";
import { deleteVehicle, updateVehicle } from "../actions";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const loaded = await safeLoad("load vehicle", () => getVehicle(ctx.user.id, id));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const v = loaded.data;
  if (!v) notFound();

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title={v.nickname} back={{ href: "/app/vehicles", label: "Vehicles" }} />
      <VehicleForm
        action={updateVehicle.bind(null, v.id)}
        initial={{
          kind: v.kind,
          nickname: v.nickname,
          make: v.make,
          model: v.model,
          year: v.year,
          color: v.color,
          ownership: v.ownership,
          energy: v.energy,
          defaultTripMode: v.defaultTripMode,
          odometerOffsetM: v.odometerOffsetM,
          purchasePrice: v.purchasePrice,
          purchaseCurrency: v.purchaseCurrency,
          purchaseDate: v.purchaseDate,
          expectedLifeYears: v.expectedLifeYears,
          expectedLifeM: v.expectedLifeM,
          salvageValue: v.salvageValue,
          isActive: v.isActive,
        }}
        homeCurrency={ctx.settings.homeCurrency}
        submitLabel="Save changes"
      />
      <section aria-labelledby="danger-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="danger-heading" className="font-display text-2xl text-[#221E1B]">
          Delete
        </h2>
        <p className="mt-1 mb-3 text-sm text-[#221E1B]/80">
          To stop seeing it in the trip form, retire it instead: clear &quot;In use&quot; above.
        </p>
        <DeleteButton
          action={deleteVehicle.bind(null, v.id)}
          label="Delete vehicle"
          warning="Delete this vehicle? Its trips stay logged without a vehicle. This can't be undone."
        />
      </section>
    </UnitsProvider>
  );
}
