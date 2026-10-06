import { MobilityGate } from "@/components/mobility/mobility-gate";
import { PageHeader } from "@/components/mobility/page-header";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { localDate } from "@/lib/mobility/dates";
import { createJourney } from "../actions";
import { JourneyForm } from "../journey-forms";

export const metadata = { title: "Plan a multi-leg trip" };

export default async function NewJourneyPage() {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader
        title="Plan a multi-leg trip"
        intro="Name it and set the dates. Then add each leg and where you're staying."
        back={{ href: "/app/trips", label: "Trips" }}
        showUnits={false}
      />
      <JourneyForm
        action={createJourney}
        initial={null}
        defaultDate={localDate(new Date(), ctx.settings.timeZone)}
        submitLabel="Create trip"
      />
    </UnitsProvider>
  );
}
