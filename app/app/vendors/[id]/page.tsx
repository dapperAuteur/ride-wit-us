import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/mobility/form-kit";
import { MobilityGate } from "@/components/mobility/mobility-gate";
import { Notice, PageHeader } from "@/components/mobility/page-header";
import { CARD, MUTED, TEXT_LINK } from "@/components/mobility/styles";
import { centosProblemCopy } from "@/lib/centos/messages";
import { getCentosVendor, getCentosVendorPrices, priceText, vendorLabel } from "@/lib/centos/vendors";
import { getMobilityContext } from "@/lib/mobility/context";
import { safeLoad } from "@/lib/mobility/load";
import { TRIP_MODE_LABELS, TRIP_STATUS_LABELS } from "@/lib/mobility/options";
import { getVendorRef, tripsAtVendor } from "@/lib/mobility/vendor-refs";
import { formatDate } from "@/lib/mobility/zoned-time";
import { unlinkVendor } from "../actions";

export const metadata = { title: "Vendor" };

export default async function VendorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;
  const { id } = await params;
  const sp = await searchParams;
  const loaded = await safeLoad("load vendor", async () => {
    const ref = await getVendorRef(ctx.user.id, id);
    if (!ref) return null;
    return { ref, history: await tripsAtVendor(ctx.user.id, ref.id) };
  });
  if (!loaded.ok) return <MobilityGate state="database_error" />;
  if (!loaded.data) notFound();
  const { ref, history } = loaded.data;

  // Details and prices are read from CentenarianOS on every view, never cached (PRD §5.11).
  const [vendorResult, pricesResult] = await Promise.all([
    getCentosVendor(ctx.user.witusSub, ref.centosContactId),
    getCentosVendorPrices(ctx.user.witusSub, ref.centosContactId, { limit: 50 }),
  ]);
  const vendor = vendorResult.ok ? vendorResult.data.vendor : null;
  const location = vendor && ref.centosLocationId ? vendor.locations.find((l) => l.id === ref.centosLocationId) : undefined;
  const title = vendor ? vendorLabel(vendor, ref.centosLocationId) : "CentenarianOS vendor";
  const problem = !vendorResult.ok ? centosProblemCopy(vendorResult.problem) : null;

  return (
    <>
      <PageHeader title={title} back={{ href: "/app/vendors", label: "Vendors" }} showUnits={false} />
      {sp.saved ? <Notice>Vendor added.</Notice> : null}

      <section aria-labelledby="details-heading" className={`${CARD} max-w-2xl`}>
        <h2 id="details-heading" className="font-display text-2xl text-[#221E1B]">
          From CentenarianOS
        </h2>
        {vendor ? (
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr] text-[#221E1B]">
            {vendor.company_name ? (
              <>
                <dt className="font-semibold">Company</dt>
                <dd>{vendor.company_name}</dd>
              </>
            ) : null}
            {vendor.category ? (
              <>
                <dt className="font-semibold">Category</dt>
                <dd>{vendor.category}</dd>
              </>
            ) : null}
            {location?.address ? (
              <>
                <dt className="font-semibold">Address</dt>
                <dd>{location.address}</dd>
              </>
            ) : vendor.city ? (
              <>
                <dt className="font-semibold">City</dt>
                <dd>{vendor.city}</dd>
              </>
            ) : null}
            {vendor.phone ? (
              <>
                <dt className="font-semibold">Phone</dt>
                <dd>
                  <a href={`tel:${vendor.phone}`} className={`${TEXT_LINK} inline-flex items-center min-h-11`}>
                    {vendor.phone}
                  </a>
                </dd>
              </>
            ) : null}
            {vendor.website ? (
              <>
                <dt className="font-semibold">Website</dt>
                <dd>
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className={`${TEXT_LINK} inline-flex items-center min-h-11 break-all`}>
                    {vendor.website}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
        ) : problem ? (
          <div role="status" className="mt-2">
            <p className="font-semibold text-[#221E1B]">{problem.title}</p>
            <p className="text-sm text-[#221E1B]">{problem.body}</p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="history-heading" className="mt-10 max-w-2xl">
        <h2 id="history-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Your history here
        </h2>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((t) => (
              <li key={t.id} className="border-b-2 border-dashed border-[#221E1B]/40 pb-2">
                <Link href={`/app/trips/${t.id}`} className={`${TEXT_LINK} inline-flex items-center min-h-11`}>
                  {TRIP_MODE_LABELS[t.mode]}, {formatDate(t.startDate)}
                </Link>
                <span className={`ml-2 text-sm ${MUTED}`}>
                  {t.status !== "completed" ? `${TRIP_STATUS_LABELS[t.status]} · ` : ""}
                  {t.costAmount && t.costCurrency ? `${t.costAmount} ${t.costCurrency}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={MUTED}>No trips linked to this vendor yet. Pick it in a trip&apos;s Vendor field.</p>
        )}
        <p className={`mt-3 text-sm ${MUTED}`}>Fuel fills and services join this list when they arrive in RideWitUS.</p>
      </section>

      <section aria-labelledby="prices-heading" className="mt-10 max-w-2xl">
        <h2 id="prices-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Prices you recorded in CentenarianOS
        </h2>
        {pricesResult.ok ? (
          pricesResult.data.prices.length ? (
            <table className="w-full text-left text-[#221E1B]">
                <caption className={`text-left text-sm ${MUTED} mb-2`}>
                  Since {formatDate(pricesResult.data.since)}, newest first.
                  {pricesResult.data.currency ? "" : " CentenarianOS does not record a currency for prices yet."}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-2 pr-4">
                      Item
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Price
                    </th>
                    <th scope="col" className="py-2">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricesResult.data.prices.map((p, i) => (
                    <tr key={`${p.recorded_date}-${i}`} className="border-t-2 border-dashed border-[#221E1B]/40">
                      <td className="py-2 pr-4">{p.item_name || "Item"}</td>
                      <td className="py-2 pr-4">{priceText(p, pricesResult.data.currency)}</td>
                      <td className="py-2">{formatDate(p.recorded_date)}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
          ) : (
            <p className={MUTED}>No prices recorded at this vendor in the last 180 days.</p>
          )
        ) : vendorResult.ok ? (
          <p className={MUTED}>{centosProblemCopy(pricesResult.problem).title}</p>
        ) : null}
      </section>

      <section aria-labelledby="remove-heading" className="mt-12 border-t-4 border-dashed border-[#221E1B] pt-6 max-w-2xl">
        <h2 id="remove-heading" className="mb-3 font-display text-2xl text-[#221E1B]">
          Remove
        </h2>
        <DeleteButton
          action={unlinkVendor.bind(null, ref.id)}
          label="Remove from RideWitUS"
          warning="Remove this vendor from RideWitUS? It stays in CentenarianOS. Trips linked to it keep everything else."
        />
      </section>
    </>
  );
}
