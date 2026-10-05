import Link from "next/link";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { EmptyState, Notice, PageHeader } from "@/components/mobility/page-header";
import { BTN_PRIMARY, CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { Measurement } from "@/components/units/measurement";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { formatAmount } from "@/lib/mobility/money";
import { VEHICLE_KIND_LABELS, VEHICLE_OWNERSHIP_LABELS } from "@/lib/mobility/options";
import { listVehicles, vehicleDistanceTotals, type VehicleRow } from "@/lib/mobility/queries";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const sp = await searchParams;
  const loaded = await safeLoad("list vehicles", () =>
    Promise.all([listVehicles(ctx.user.id), vehicleDistanceTotals(ctx.user.id)])
  );
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const [rows, totals] = loaded.data;
  const active = rows.filter((v) => v.isActive);
  const retired = rows.filter((v) => !v.isActive);

  const addButton = (
    <Link href="/app/vehicles/new" className={BTN_PRIMARY}>
      Add a vehicle
    </Link>
  );

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader
        title="Vehicles"
        intro="Cars, bikes, e-bikes, scooters, and shoes: anything you log trips on."
        actions={rows.length ? addButton : null}
        showUnits={rows.length > 0}
      />
      {sp.saved ? <Notice>Vehicle saved.</Notice> : null}
      {sp.deleted ? <Notice>Vehicle deleted. Its trips are still logged.</Notice> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          body="Add the bike, car, or pair of shoes you use most. Trips can be logged without one, too."
          action={addButton}
        />
      ) : (
        <>
          <VehicleList title="In use" rows={active} totals={totals} />
          {retired.length ? <VehicleList title="Retired" rows={retired} totals={totals} /> : null}
        </>
      )}
    </UnitsProvider>
  );
}

function VehicleList({ title, rows, totals }: { title: string; rows: VehicleRow[]; totals: Map<string, number> }) {
  if (!rows.length) return null;
  const headingId = `vehicles-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="mb-10">
      <h2 id={headingId} className="font-display text-2xl text-[#221E1B] mb-3">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((v) => {
          const details = [v.year, v.make, v.model].filter(Boolean).join(" ");
          const price = formatAmount(v.purchasePrice, v.purchaseCurrency);
          return (
            <li key={v.id} className={CARD}>
              <h3 className="font-display text-xl text-[#221E1B]">
                <Link href={`/app/vehicles/${v.id}`} className={TEXT_LINK}>
                  {v.nickname}
                </Link>
              </h3>
              <p className={`text-sm ${MUTED}`}>
                {VEHICLE_KIND_LABELS[v.kind]} · {VEHICLE_OWNERSHIP_LABELS[v.ownership]}
                {details ? ` · ${details}` : ""}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className={MUTED}>Logged on trips</dt>
                  <dd className="font-semibold text-[#221E1B]">
                    <Measurement value={totals.get(v.id) ?? 0} dimension="distance" />
                  </dd>
                </div>
                <div>
                  <dt className={MUTED}>Purchase price</dt>
                  <dd className="font-semibold text-[#221E1B]">{price ?? "Not recorded"}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
