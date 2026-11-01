import Link from "next/link";
import { HeaderAccount } from "@/components/header-account";
import { sectionLinks } from "@/components/header-links";
import { HeaderMenu } from "@/components/header-menu";
import { APP_NAME } from "@/lib/site-meta";
import { cn } from "@/lib/utils";

export interface SiteHeaderTheme {
  surface: string;
  border: string;
  link: string;
  wordmarkSrc: string;
}

const defaultTheme: SiteHeaderTheme = {
  surface: "bg-[#0b0b0d]",
  border: "border-b border-slate-800",
  link: "text-slate-300 hover:text-white focus-visible:outline-white",
  wordmarkSrc: "/brand/04-orbit-type/wordmark.svg",
};

interface SiteHeaderProps {
  theme?: SiteHeaderTheme;
  basePath?: string;
  /**
   * Set by a page that already knows on the server whether someone is signed in (it renders per
   * request anyway). Left out on the statically prerendered public pages, where the account
   * control asks /api/auth/session after load and shows "Sign in" until it hears otherwise.
   */
  signedIn?: boolean;
}

// 44px targets (min-h-11) and a visible focus ring on every control in the bar.
const CONTROL =
  "inline-flex items-center whitespace-nowrap min-h-11 px-2 sm:px-3 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded";

/**
 * The public header. The account control (Sign in, or Open the app + Sign out) is in the bar at
 * every width; below `md` the four section links move behind a Menu button so the bar fits at
 * 320px without sideways scroll (witus docs/shared-ui-ux-dx.md, "Sign-in control").
 */
export function SiteHeader({ theme = defaultTheme, basePath = "", signedIn }: SiteHeaderProps) {
  const links = sectionLinks(basePath);
  const control = cn(CONTROL, theme.link);

  return (
    <header className={cn("relative", theme.surface, theme.border)}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href={basePath || "/"}
          aria-label={`${APP_NAME} home`}
          className="inline-flex shrink-0 items-center gap-3 min-h-11 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
        >
          {/* The image steps aside where the bar is tightest (phones, and md to lg once the section
              links are inline). The name stays at every width: it is the only visible brand on the
              chalk theme, whose wordmark is light-on-light. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.wordmarkSrc}
            alt=""
            aria-hidden="true"
            className="hidden sm:block md:hidden lg:block h-7 w-auto"
          />
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-0 md:gap-1 lg:gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={cn(control, "hidden md:inline-flex")}>
              {l.label}
            </Link>
          ))}
          <HeaderAccount linkClass={control} signedIn={signedIn} />
          <HeaderMenu
            links={links}
            buttonClass={control}
            panelClass={cn(theme.surface, theme.border)}
            itemClass={cn(
              "flex items-center min-h-11 px-4 sm:px-6 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2",
              theme.link
            )}
          />
        </nav>
      </div>
    </header>
  );
}

export const HEADER_THEMES = {
  default: defaultTheme,
  workshop: {
    surface: "bg-[#ece1c8]",
    border: "border-b-2 border-[#1a1a1a]",
    link: "text-[#1a1a1a] hover:text-[#A8302A] focus-visible:outline-[#1a1a1a]",
    wordmarkSrc: "/brand/02-duality/wordmark.svg",
  } satisfies SiteHeaderTheme,
  frame: {
    surface: "bg-[#f5f0e6]",
    border: "border-b border-[#0f0f10]",
    link: "text-[#0f0f10] hover:text-[#E25A1C] focus-visible:outline-[#0f0f10]",
    wordmarkSrc: "/brand/01-orbit/wordmark.svg",
  } satisfies SiteHeaderTheme,
  chalk: {
    surface: "bg-[#f4ecd8]",
    border: "border-b-4 border-[#221E1B] border-dashed",
    link: "text-[#221E1B] hover:text-[#D33E2D] focus-visible:outline-[#221E1B]",
    wordmarkSrc: "/brand/03-type-dot/wordmark.svg",
  } satisfies SiteHeaderTheme,
};
