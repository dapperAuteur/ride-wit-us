import Link from "next/link";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { EmptyState, Notice, PageHeader } from "@/components/mobility/page-header";
import { BTN_PRIMARY, CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { UnitsProvider } from "@/components/units/units-provider";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { PLACE_KIND_LABELS } from "@/lib/mobility/options";
import { listPlaces } from "@/lib/mobility/queries";

export const metadata = { title: "Places" };

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const sp = await searchParams;
  const loaded = await safeLoad("list places", () => listPlaces(ctx.user.id));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const rows = loaded.data;

  const addButton = (
    <Link href="/app/places/new" className={BTN_PRIMARY}>
      Add a place
    </Link>
  );

  return (
    <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
      <PageHeader
        title="Places"
        intro="Where you go often. Pick them in the trip form, or type any of their names and RideWitUS matches the place."
        actions={rows.length ? addButton : null}
        showUnits={false}
      />
      {sp.saved ? <Notice>Place saved.</Notice> : null}
      {sp.deleted ? <Notice>Place deleted. Trips that went there keep its name.</Notice> : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No places yet"
          body="Start with home and work. Your home place stays in RideWitUS and is never sent to another app."
          action={addButton}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id} className={CARD}>
              <h2 className="font-display text-xl text-[#221E1B]">
                <Link href={`/app/places/${p.id}`} className={TEXT_LINK}>
                  {p.label}
                </Link>
              </h2>
              <p className={`text-sm ${MUTED}`}>
                {PLACE_KIND_LABELS[p.kind]}
                {p.kind === "home" ? " · private, stays in RideWitUS" : ""}
              </p>
              {p.address ? <p className="mt-2 text-sm text-[#221E1B]">{p.address}</p> : null}
              {p.aliases.length ? (
                <p className={`mt-2 text-sm ${MUTED}`}>Also called: {p.aliases.join(", ")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </UnitsProvider>
  );
}
