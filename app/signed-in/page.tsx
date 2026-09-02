import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth/dal";
import { witusEndSessionUrl } from "@/lib/witus-sso-config";

// /signed-in — a PROOF OF THE MECHANISM, not a product feature.
//
// It exists so the whole loop can be exercised end to end before anything depends on it: sign in at
// the IdP, come back, read the identity on the SERVER via requireUser(), and sign out of every
// WitUS app. `requireUser()` redirects to /signin when there is no valid session, which is the
// route protection this subsystem is here to provide.
//
// It is deliberately NOT a profile page, an account page, or a settings page. There is nothing to
// edit because there is nothing stored — no database, no user table. When the CentenarianOS travel
// module moves into this app it brings the pages that actually need an account; this one can be
// deleted the day one of those exists.
//
// Reads a cookie, so it renders per-request rather than at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Signed in",
  robots: { index: false, follow: false },
};

export default async function SignedInPage() {
  const user = await requireUser();
  // null when this app is not a configured OIDC client — the button falls back to a local-only
  // sign-out and says "Sign out" instead of "Sign out of WitUS".
  const endSessionUrl = await witusEndSessionUrl();

  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg] inline-block mb-4">
              Signed in
            </span>
            <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-[#221E1B] leading-[0.95]">
              <span className="block">You&apos;re in,</span>
              <span className="block" style={{ color: "#D33E2D" }}>
                {user.name || user.email}.
              </span>
            </h1>
            <p className="mt-6 text-lg text-[#221E1B] leading-relaxed">
              Your WitUS account is connected to RideWitUS. Nothing on the site needs it yet — every
              episode and season page is public — so this page is here mostly to prove the
              connection works.
            </p>

            <dl className="mt-10 border-2 border-[#221E1B] bg-[#fff8e8] p-5" style={{ boxShadow: "4px 4px 0 #5C8AA5" }}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/60">
                Signed in as
              </dt>
              <dd className="text-[#221E1B]">{user.email}</dd>
            </dl>

            <div className="mt-10">
              <SignOutButton endSessionUrl={endSessionUrl} />
              <p className="mt-3 text-sm text-[#221E1B]/70">
                {endSessionUrl
                  ? "Signing out here signs you out of every WitUS app in this browser."
                  : "Signs you out of RideWitUS on this device."}
              </p>
            </div>

            <p className="mt-10 text-sm text-[#221E1B]/70">
              Back to{" "}
              <Link
                href="/episodes"
                className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]"
              >
                the episode catalog
              </Link>
              .
            </p>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
