import Link from "next/link";
import { SIBLING_PRODUCTS } from "@/lib/products";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site-meta";
import { cn } from "@/lib/utils";

export interface SiteFooterTheme {
  // Outer surface
  surface: string;
  divider: string;
  // Headings + body
  heading: string;
  body: string;
  muted: string;
  link: string;
  linkFocus: string;
  // Rise Wellness card
  riseSurface: string;
  riseEyebrow: string;
  riseQuoteBorder: string;
  riseLink: string;
  // Logo
  logomarkSrc: string;
  basePath?: string;
}

const defaultTheme: SiteFooterTheme = {
  surface: "bg-[#0b0b0d] border-t border-slate-800",
  divider: "border-t border-slate-800/60",
  heading: "text-white font-semibold",
  body: "text-slate-300",
  muted: "text-slate-400",
  link: "text-slate-300 hover:text-white hover:underline",
  linkFocus: "focus-visible:outline-white",
  riseSurface: "rounded-lg border border-sky-900/40 bg-sky-950/40 p-5 text-sm",
  riseEyebrow: "text-sky-300",
  riseQuoteBorder: "border-sky-700",
  riseLink: "text-sky-300 hover:underline focus-visible:outline-sky-400",
  logomarkSrc: "/brand/04-orbit-type/logomark.svg",
};

interface SiteFooterProps {
  theme?: SiteFooterTheme;
  basePath?: string;
}

export function SiteFooter({ theme = defaultTheme, basePath = "" }: SiteFooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className={cn("mt-12", theme.surface)}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.logomarkSrc} alt="" aria-hidden="true" className="h-10 w-auto mb-3" />
          <p className={cn("font-extrabold", theme.heading)}>{APP_NAME}</p>
          <p className={cn("text-xs", theme.muted)}>The Brompton classroom — a podcast curriculum from the WitUS ecosystem.</p>
        </div>

        <RiseWellnessCallout theme={theme} />

        <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm", theme.body)}>
          <div>
            <p className={cn("mb-2", theme.heading)}>Ecosystem</p>
            <ul className="space-y-1">
              {SIBLING_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
                      theme.link,
                      theme.linkFocus
                    )}
                  >
                    {p.name}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={cn("mb-2", theme.heading)}>RideWitUS</p>
            <ul className="space-y-1">
              <li><Link href={basePath || "/"} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Home</Link></li>
              <li><Link href={`${basePath}/episodes`} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Episodes</Link></li>
              <li><Link href={`${basePath}/episodes#season-1`} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Seasons</Link></li>
              <li><Link href={basePath ? `${basePath}/tune-in` : "/tune-in"} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Tune in</Link></li>
              <li><Link href={basePath ? `${basePath}/about` : "/about"} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>About</Link></li>
            </ul>
          </div>

          <div>
            <p className={cn("mb-2", theme.heading)}>Partners &amp; Legal</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.centenarianos.com/safety#rise-wellness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}
                >
                  Rise Wellness
                  <span className="sr-only"> (mental-health partner — opens in new tab)</span>
                </a>
                <p className={cn("text-xs leading-tight", theme.muted)}>Mental-health partner</p>
              </li>
              <li className="pt-2">
                <a href="https://witus.online/terms" target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Terms</a>
              </li>
              <li>
                <a href="https://witus.online/privacy" target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Privacy</a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={cn("inline-flex items-center min-h-[28px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}>Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className={cn("mt-8 pt-6 text-xs text-center", theme.divider, theme.muted)}>
          <p>
            © {year} B4C LLC — A{" "}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.link, theme.linkFocus)}
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{" "}
            brand
          </p>
        </div>
      </div>
    </footer>
  );
}

// Rise Wellness — canonical copy. The non-affiliation disclaimer is byte-identical
// across the WitUS ecosystem (vetted with the partner). Only the [YOUR APP NAME]
// token and the [swap] surface tokens change.
function RiseWellnessCallout({ theme }: { theme: SiteFooterTheme }) {
  return (
    <section
      aria-labelledby="rise-wellness-heading"
      className={cn("mb-8", theme.riseSurface)}
    >
      <header className="mb-3">
        <p className={cn("text-[11px] uppercase tracking-wide font-semibold", theme.riseEyebrow)}>
          Mental health support
        </p>
        <h2 id="rise-wellness-heading" className={cn("text-base font-semibold", theme.heading)}>
          Rise Wellness of Indiana
        </h2>
        <p className={cn("text-xs mt-0.5", theme.muted)}>
          Independent mental health provider · Not affiliated with {APP_NAME}
        </p>
      </header>

      <p className={cn("leading-relaxed", theme.body)}>
        Rise Wellness of Indiana provides compassionate, personalized,
        holistic mental health care — evidence-based medicine, trauma-informed
        care, and a whole-person approach to help you heal, grow, and thrive
        in mind, body, and spirit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className={cn("text-[11px] uppercase tracking-wide font-semibold", theme.muted)}>Services</p>
          <ul className={cn("text-xs space-y-0.5", theme.body)}>
            <li>ADHD testing &amp; management (in-person and from home)</li>
            <li>Anxiety &amp; depression</li>
            <li>Maternal mental health</li>
            <li>Medication management</li>
            <li>GeneSight® genetic testing</li>
            <li>Behavioral therapy &amp; coaching</li>
            <li>Routine lab testing</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className={cn("text-[11px] uppercase tracking-wide font-semibold", theme.muted)}>Visit or call</p>
          <address className={cn("not-italic text-xs leading-relaxed", theme.body)}>
            320 North Meridian Street<br />
            Indianapolis, IN 46204<br />
            Mon–Sat by appointment · Sun closed
          </address>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
            <a
              href="tel:+13179650299"
              className={cn("inline-flex items-center min-h-[28px] font-medium hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.riseLink)}
            >
              317-965-0299
            </a>
            <span aria-hidden="true" className={theme.muted}>·</span>
            <a
              href="https://risewellnessofindiana.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center min-h-[28px] font-medium hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.riseLink)}
            >
              risewellnessofindiana.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true" className={theme.muted}>·</span>
            <a
              href="https://www.centenarianos.com/safety#rise-wellness"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center min-h-[28px] font-medium hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded", theme.riseLink)}
            >
              Full safety page
              <span className="sr-only"> on centenarianos.com (opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <blockquote className={cn("mt-4 border-l-2 pl-3 text-xs italic", theme.riseQuoteBorder, theme.muted)}>
        &ldquo;At Rise Wellness, we believe everyone has the capacity to rise
        above challenges and live a fulfilling, healthy life. Our care is
        guided by the belief that healing is personal, holistic, and rooted
        in compassion.&rdquo;
        <span className={cn("block not-italic mt-1", theme.muted)}>
          — Rise Wellness of Indiana
        </span>
      </blockquote>

      {/* === NON-NEGOTIABLE DISCLAIMER ===
           Edit ONLY the app name token. Don't paraphrase. Don't trim.
           Don't reorder. This was vetted with the partner. */}
      <p className={cn("mt-4 text-[11px] leading-relaxed", theme.muted)}>
        Rise Wellness of Indiana is an independent organization. They are
        not affiliated with, employed by, or endorsed by {APP_NAME},
        CentenarianOS, B4C LLC, AwesomeWebStore.com, or Anthony McDonald.
        We are grateful for their collaboration on mental health safety
        resources for our community.
      </p>
    </section>
  );
}

export const FOOTER_THEMES = {
  default: defaultTheme,
  workshop: {
    surface: "bg-[#ece1c8] border-t-2 border-[#1a1a1a]",
    divider: "border-t border-[#1a1a1a]/30",
    heading: "text-[#1a1a1a] font-bold",
    body: "text-[#1a1a1a]",
    muted: "text-[#5b4d2c]",
    link: "text-[#1a1a1a] hover:text-[#A8302A] hover:underline",
    linkFocus: "focus-visible:outline-[#1a1a1a]",
    riseSurface: "rounded-md border-2 border-[#1a1a1a] bg-[#f5ead0] p-5 text-sm shadow-[3px_3px_0_#1a1a1a40]",
    riseEyebrow: "text-[#A8302A]",
    riseQuoteBorder: "border-[#A8302A]",
    riseLink: "text-[#A8302A] focus-visible:outline-[#A8302A]",
    logomarkSrc: "/brand/02-duality/logomark.svg",
  } satisfies SiteFooterTheme,
  frame: {
    surface: "bg-[#f5f0e6] border-t border-[#0f0f10]",
    divider: "border-t border-[#0f0f10]/30",
    heading: "text-[#0f0f10] font-semibold",
    body: "text-[#0f0f10]",
    muted: "text-[#5A6571]",
    link: "text-[#0f0f10] hover:text-[#E25A1C] hover:underline",
    linkFocus: "focus-visible:outline-[#0f0f10]",
    riseSurface: "rounded-md border border-[#0f0f10] bg-white/40 p-5 text-sm",
    riseEyebrow: "text-[#E25A1C]",
    riseQuoteBorder: "border-[#E25A1C]",
    riseLink: "text-[#E25A1C] focus-visible:outline-[#E25A1C]",
    logomarkSrc: "/brand/01-orbit/logomark.svg",
  } satisfies SiteFooterTheme,
  chalk: {
    surface: "bg-[#f4ecd8] border-t-4 border-dashed border-[#221E1B]",
    divider: "border-t-2 border-dashed border-[#221E1B]/30",
    heading: "text-[#221E1B] font-bold",
    body: "text-[#221E1B]",
    muted: "text-[#5b4d2c]",
    link: "text-[#221E1B] hover:text-[#D33E2D] hover:underline",
    linkFocus: "focus-visible:outline-[#221E1B]",
    riseSurface: "rounded-md border-2 border-[#5C8AA5] bg-[#5C8AA5]/15 p-5 text-sm",
    riseEyebrow: "text-[#5C8AA5]",
    riseQuoteBorder: "border-[#5C8AA5]",
    riseLink: "text-[#5C8AA5] focus-visible:outline-[#5C8AA5]",
    logomarkSrc: "/brand/03-type-dot/logomark.svg",
  } satisfies SiteFooterTheme,
};
