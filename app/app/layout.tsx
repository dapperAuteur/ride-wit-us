import Link from "next/link";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";
import { getMobilityContext } from "@/lib/mobility/context";
import { witusEndSessionUrl } from "@/lib/witus-sso-config";

// The signed-in mobility app (PRD §13 Q2: mobility lives behind sign-in, under /app). Everything
// here is per-request and noindex. The public podcast pages stay static and never import this.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Mobility", template: "%s · Mobility · RideWitUS" },
  robots: { index: false, follow: false },
};

const NAV_LINK =
  "inline-flex items-center min-h-11 px-3 rounded text-[#221E1B] hover:text-[#D33E2D] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]";

export default async function MobilityLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getMobilityContext();
  const endSessionUrl = await witusEndSessionUrl();

  return (
    <div className="flex-1 flex flex-col bg-[#f4ecd8]">
      <header className="border-b-4 border-dashed border-[#221E1B]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link href="/app" className={`${NAV_LINK} font-display text-xl`}>
            RideWitUS <span className="ml-2 font-mono text-xs uppercase tracking-wider">mobility</span>
          </Link>
          <nav aria-label="Mobility" className="flex flex-wrap items-center gap-1 text-sm">
            {ctx.state === "ok" ? (
              <>
                <Link href="/app" className={NAV_LINK}>
                  Dashboard
                </Link>
                <Link href="/app/settings" className={NAV_LINK}>
                  Settings
                </Link>
              </>
            ) : null}
            <Link href="/" className={NAV_LINK}>
              Podcast
            </Link>
            <SignOutButton endSessionUrl={endSessionUrl} />
          </nav>
        </div>
      </header>
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">{children}</div>
    </div>
  );
}
