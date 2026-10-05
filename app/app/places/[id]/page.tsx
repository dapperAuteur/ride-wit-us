import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { getPlace } from "@/lib/mobility/queries";
import { deletePlace, updatePlace } from "../actions";
import { PlaceForm } from "../place-form";

export const metadata = { title: "Edit place" };

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const loaded = await safeLoad("load place", () => getPlace(ctx.user.id, id));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const p = loaded.data;
  if (!p) notFound();

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title={p.label} back={{ href: "/app/places", label: "Places" }} showUnits={false} />
      <PlaceForm
        action={updatePlace.bind(null, p.id)}
        initial={{ label: p.label, kind: p.kind, address: p.address, lat: p.lat, lng: p.lng, aliases: p.aliases }}
        submitLabel="Save changes"
      />
      <section aria-labelledby="danger-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="danger-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Delete
        </h2>
        <DeleteButton
          action={deletePlace.bind(null, p.id)}
          label="Delete place"
          warning="Delete this place? Trips that went there keep its name as text. This can't be undone."
        />
      </section>
    </UnitsProvider>
  );
}
