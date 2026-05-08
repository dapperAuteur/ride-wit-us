import Link from "next/link";
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
}

export function SiteHeader({ theme = defaultTheme, basePath = "" }: SiteHeaderProps) {
  return (
    <header className={cn(theme.surface, theme.border)}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href={basePath || "/"}
          aria-label={`${APP_NAME} home`}
          className="inline-flex items-center gap-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme.wordmarkSrc} alt="" aria-hidden="true" className="h-7 w-auto block" />
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link
            href={`${basePath}/episodes`}
            className={cn(
              "inline-flex items-center min-h-11 px-3 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              theme.link
            )}
          >
            Episodes
          </Link>
          <Link
            href={`${basePath}/episodes#season-1`}
            className={cn(
              "inline-flex items-center min-h-11 px-3 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              theme.link
            )}
          >
            Seasons
          </Link>
          <Link
            href={basePath ? `${basePath}/about` : "/about"}
            className={cn(
              "inline-flex items-center min-h-11 px-3 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              theme.link
            )}
          >
            About
          </Link>
          <Link
            href="/design"
            className={cn(
              "inline-flex items-center min-h-11 px-3 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 rounded",
              theme.link
            )}
          >
            Design
          </Link>
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
