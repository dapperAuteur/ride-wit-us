import Link from "next/link";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { EmptyState, Notice, PageHeader } from "@/components/mobility/page-header";
import { CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { VendorPicker } from "@/components/mobility/vendor-picker";
import { centosConfigured } from "@/lib/centos/client";
import { centosProblemCopy } from "@/lib/centos/messages";
import { getCentosVendor, vendorLabel } from "@/lib/centos/vendors";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { listVendorRefs } from "@/lib/mobility/vendor-refs";
import { addVendor, searchVendors } from "./actions";

export const metadata = { title: "Vendors" };

/** Names are read live from CentenarianOS for at most this many saved vendors per page view. */
const MAX_RESOLVED = 50;

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const sp = await searchParams;
  const loaded = await safeLoad("list vendor refs", () => listVendorRefs(ctx.user.id));
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  const refs = loaded.data;
  const configured = centosConfigured("vendors");

  // Names come from CentenarianOS every time (RideWitUS stores only the pointer, PRD §5.11).
  const resolved = configured
    ? await Promise.all(refs.slice(0, MAX_RESOLVED).map((r) => getCentosVendor(ctx.user.witusSub, r.centosContactId)))
    : [];
  const problem = resolved.find((r) => !r.ok);
  const problemCopy = !configured ? centosProblemCopy("not_configured") : problem && !problem.ok ? centosProblemCopy(problem.problem) : null;

  return (
    <>
      <PageHeader
        title="Vendors"
        intro="Shops, stations and services you use, picked from your CentenarianOS contacts. RideWitUS keeps only a link to each one; names, phones and prices stay in CentenarianOS."
        showUnits={false}
      />
      {sp.removed ? <Notice>Vendor removed from RideWitUS. It is still in CentenarianOS, and trips keep everything else.</Notice> : null}
      {problemCopy ? (
        <div role="status" className={`${CARD} mb-6`}>
          <p className="font-semibold text-[#221E1B]">{problemCopy.title}</p>
          <p className="text-sm text-[#221E1B]">{problemCopy.body}</p>
        </div>
      ) : null}

      {configured ? (
        <section aria-labelledby="add-heading" className="mb-10 max-w-2xl">
          <h2 id="add-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
            Add a vendor
          </h2>
          <VendorPicker label="Vendor" initial={null} search={searchVendors} link={addVendor} />
        </section>
      ) : null}

      {refs.length === 0 ? (
        <EmptyState
          title="No vendors yet"
          body="Pick the shop that services your bike or the station you fill up at. Your own trips and services there show on its page, next to the prices you recorded in CentenarianOS."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="Your vendors">
          {refs.map((r, i) => {
            const found = resolved[i];
            const name = found?.ok ? vendorLabel(found.data.vendor, r.centosLocationId) : "CentenarianOS vendor";
            const detail = found?.ok ? [found.data.vendor.category, found.data.vendor.city].filter(Boolean).join(" · ") : null;
            return (
              <li key={r.id} className={CARD}>
                <h3 className="font-display text-xl text-[#221E1B]">
                  <Link href={`/app/vendors/${r.id}`} className={TEXT_LINK}>
                    {name}
                  </Link>
                </h3>
                {detail ? <p className={`text-sm ${MUTED}`}>{detail}</p> : null}
                {found && !found.ok && found.problem === "not_found" ? (
                  <p className={`mt-2 text-sm ${MUTED}`}>No longer in your CentenarianOS contacts.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
