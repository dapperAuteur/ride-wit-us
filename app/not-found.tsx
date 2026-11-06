import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";

// Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): the root layout has no header,
// so the 404 page renders the header (its account control shows "Sign in" until the session
// probe answers) and the footer itself.
export default function NotFound() {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <main id="main" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
        <p className="font-mono text-sm uppercase tracking-wide text-[#221E1B]">404</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#221E1B]">Page not found</h1>
        <p className="text-base text-[#221E1B]">
          That page does not exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-[#221E1B] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Back to home
        </Link>
      </main>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
