import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DesignDirection {
  slug: string;
  label: string;
  ethos: string;
  variant: string;
}

export const DESIGNS: DesignDirection[] = [
  {
    slug: "workshop-apron",
    label: "Workshop Apron",
    ethos: "Vocational manual meets zine.",
    variant: "02-duality",
  },
  {
    slug: "folder-and-frame",
    label: "Folder & Frame",
    ethos: "Engineering studio meets design museum.",
    variant: "01-orbit",
  },
  {
    slug: "monon-chalk",
    label: "Monon Chalk",
    ethos: "Neighborhood mural meets ride poster.",
    variant: "03-type-dot",
  },
];

interface DesignSwitcherProps {
  currentSlug?: string;
  className?: string;
}

export function DesignSwitcher({ currentSlug, className }: DesignSwitcherProps) {
  return (
    <nav
      aria-label="Design direction switcher"
      className={cn(
        "sticky top-0 z-40 flex flex-wrap items-center gap-2 px-4 py-2 text-xs font-medium border-b backdrop-blur",
        "bg-black/80 border-white/10 text-white",
        className
      )}
    >
      <span className="opacity-70 mr-2 uppercase tracking-wider">Design preview</span>
      <Link
        href="/design"
        className={cn(
          "px-2 py-1 rounded-md transition-colors hover:bg-white/15 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          !currentSlug && "bg-white/15"
        )}
      >
        Index
      </Link>
      {DESIGNS.map((d) => {
        const active = d.slug === currentSlug;
        return (
          <Link
            key={d.slug}
            href={`/design/${d.slug}`}
            className={cn(
              "px-2 py-1 rounded-md transition-colors hover:bg-white/15 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              active ? "bg-white text-black" : "bg-white/5"
            )}
            aria-current={active ? "page" : undefined}
          >
            {d.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="ml-auto px-2 py-1 rounded-md transition-colors hover:bg-white/15 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        ← Top-level site
      </Link>
    </nav>
  );
}
