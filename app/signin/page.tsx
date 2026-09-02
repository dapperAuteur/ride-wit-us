import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { WitusSsoButton } from "@/components/witus-sso-button";
import { getCurrentUser } from "@/lib/auth/dal";
import { witusSilentSsoEndpoint, witusSsoConfigured } from "@/lib/witus-sso-config";

// The one door into RideWitUS. There is no password field and no magic link on this page because
// there is no second way in: WitUS SSO is the only authentication this app has.
//
// Reads a cookie, so it renders per-request rather than at build time like the rest of the site.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  description: "Sign in to RideWitUS with your WitUS account.",
  // Nothing on this page is worth indexing and a signed-out crawler would only ever see the
  // unconfigured state.
  robots: { index: false, follow: false },
};

/** What each `?error=` from the OIDC routes means, in words a visitor can act on. */
const ERROR_COPY: Record<string, string> = {
  witus_not_configured: "Sign-in isn't switched on for this site yet. Try again later.",
  witus_state: "That sign-in link expired or was opened out of order. Start again below.",
  witus_token: "WitUS couldn't confirm that sign-in. Start again below.",
  witus_userinfo: "WitUS signed you in but didn't tell us who you are. Start again below.",
  witus_claims: "WitUS didn't give us an email address for that account.",
  witus_unreachable: "We couldn't reach WitUS just now. Start again below.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in? There is nothing to do on this page.
  if (await getCurrentUser()) redirect("/signed-in");

  const { error } = await searchParams;
  const message = error ? (ERROR_COPY[error] ?? "That sign-in didn't finish. Start again below.") : null;

  const configured = witusSsoConfigured();
  // null when unconfigured, which is also what turns the silent probe off in the client component.
  const silentCheckUrl = witusSilentSsoEndpoint();

  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <article className="flex-1">
        <section className="border-b-4 border-dashed border-[#221E1B]">
          <div className="max-w-xl mx-auto px-6 py-16">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-2deg] inline-block mb-4">
              One account, whole ecosystem
            </span>
            <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-[#221E1B] leading-[0.95]">
              <span className="block">Sign in</span>
              <span className="block" style={{ color: "#D33E2D" }}>with WitUS.</span>
            </h1>
            <p className="mt-6 text-lg text-[#221E1B] leading-relaxed">
              RideWitUS uses your WitUS account — the same one that signs you in to CentenarianOS
              Academy, FlashLearnAI, and the rest of the ecosystem. There is no separate RideWitUS
              password to remember.
            </p>

            {message ? (
              <p
                role="alert"
                className="mt-8 border-2 border-[#221E1B] bg-[#fff8e8] p-4 text-[#221E1B]"
                style={{ boxShadow: "4px 4px 0 #D33E2D" }}
              >
                {message}
              </p>
            ) : null}

            <div className="mt-10">
              {configured ? (
                <WitusSsoButton silentCheckUrl={silentCheckUrl} />
              ) : (
                // Unprovisioned deploy. Say so plainly rather than rendering a button that
                // dead-ends at the IdP — and make no request to accounts.witus.online at all.
                <p className="border-2 border-dashed border-[#221E1B] bg-[#fff8e8] p-4 text-[#221E1B]">
                  Sign-in isn&apos;t switched on for this deployment yet. Everything on RideWitUS is
                  public in the meantime — start at{" "}
                  <Link
                    href="/episodes"
                    className="underline underline-offset-4 decoration-[#D33E2D] decoration-2 hover:text-[#D33E2D]"
                  >
                    the episode catalog
                  </Link>
                  .
                </p>
              )}
            </div>

            <p className="mt-10 text-sm text-[#221E1B]/70">
              Nothing on RideWitUS requires an account today — every episode, season, and curriculum
              page is public. Signing in is here for what comes next.
            </p>
          </div>
        </section>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
