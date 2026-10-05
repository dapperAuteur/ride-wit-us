import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { getJourney, getStay, listPlaces } from "@/lib/mobility/queries";
import { deleteStay, updateStay } from "@/app/app/journeys/actions";
import { StayForm } from "@/app/app/journeys/journey-forms";

export const metadata = { title: "Edit stay" };

export default async function EditStayPage({ params }: { params: Promise<{ id: string; stayId: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id, stayId } = await params;
  const loaded = await safeLoad("load stay", () =>
    Promise.all([getJourney(ctx.user.id, id), getStay(ctx.user.id, stayId), listPlaces(ctx.user.id)])
  );
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [found, stay, placeRows] = loaded.data;
  // The stay must belong to this journey as well as to this owner.
  if (!found || !stay || stay.journeyId !== found.journey.id) notFound();
  const j = found.journey;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader title={stay.name} intro={`A stay on ${j.name}.`} back={{ href: `/app/journeys/${j.id}`, label: j.name }} showUnits={false} />
      <StayForm
        action={updateStay.bind(null, stay.id)}
        initial={{
          name: stay.name,
          placeId: stay.placeId,
          address: stay.address,
          checkInDate: stay.checkInDate,
          checkOutDate: stay.checkOutDate,
          confirmationNumber: stay.confirmationNumber,
          roomType: stay.roomType,
          costAmount: stay.costAmount,
          costCurrency: stay.costCurrency,
          notes: stay.notes,
        }}
        places={placeRows
          .filter((p) => p.kind !== "home" || p.id === stay.placeId)
          .map((p) => ({ id: p.id, label: p.label }))}
        defaultCheckIn={stay.checkInDate}
        defaultCheckOut={stay.checkOutDate}
        homeCurrency={ctx.settings.homeCurrency}
        submitLabel="Save changes"
      />
      <section aria-labelledby="danger-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="danger-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Delete
        </h2>
        <DeleteButton action={deleteStay.bind(null, stay.id)} label="Delete stay" warning="Delete this stay? This can't be undone." />
      </section>
    </UnitsProvider>
  );
}
