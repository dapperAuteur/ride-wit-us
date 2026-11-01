import type { Metadata } from "next";
import { HEADER_THEMES, SiteHeader } from "@/components/site-header";
import { SignOutEverywhereButton } from "@/components/sign-out-button";
import { getMobilityContext } from "@/lib/mobility/context";
import { witusEndSessionUrl } from "@/lib/witus-sso-config";

// The signed-in mobility app (PRD §13 Q2: mobility lives behind sign-in, under /app). Everything
// here is per-request and noindex. The public podcast pages stay static and never import this.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Mobility", template: "%s · Mobility · RideWitUS" },
  robots: { index: false, follow: false },
};

/**
 * The app uses the same header as the podcast pages (components/site-header.tsx), so a signed-in
 * rider sees one set of links everywhere: the podcast links and the account control (Open the app,
 * Sign out) in the top row, the app's destinations in the second. The app row only shows when the
 * app can serve this rider (state "ok"); a waitlisted rider or an unprovisioned database gets the
 * top row and the gate page.
 *
 * "Sign out of WitUS everywhere" needs its help text beside it, which the header has no room for,
 * so it sits in the account strip at the foot of every app page (BAM, 2026-10-29, witus task 128
 * option (b): "Sign out" ends this app's session only; the everywhere control also ends WitUS's).
 */
export default async function MobilityLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getMobilityContext();
  const endSessionUrl = await witusEndSessionUrl();

  return (
    <div className="flex-1 flex flex-col bg-[#f4ecd8]">
      <SiteHeader theme={HEADER_THEMES.chalk} signedIn appNav={ctx.state === "ok"} />
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">{children}</div>
      <section
        aria-label="Account"
        className="border-t-4 border-dashed border-[#221E1B]"
      >
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-start justify-between gap-4 text-sm text-[#221E1B]">
          <p className="min-h-11 flex items-center break-all">
            Signed in as&nbsp;<span className="font-semibold">{ctx.session.email}</span>
          </p>
          {endSessionUrl ? <SignOutEverywhereButton endSessionUrl={endSessionUrl} /> : null}
        </div>
      </section>
    </div>
  );
}
