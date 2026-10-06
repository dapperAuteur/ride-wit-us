import Link from "next/link";
import type { ReactNode } from "react";
import { UnitsToggle } from "@/components/units/units-toggle";
import { MUTED, TEXT_LINK } from "./styles";

/**
 * Heading block for a mobility screen: optional back link, the h1, an intro line, page actions,
 * and the units toggle when the page shows measurements. Render inside <UnitsProvider>.
 */
export function PageHeader({
  title,
  intro,
  back,
  actions,
  showUnits = true,
}: {
  title: string;
  intro?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  showUnits?: boolean;
}) {
  return (
    <header className="mb-8">
      {back ? (
        <p className="mb-2">
          <Link href={back.href} className={`${TEXT_LINK} inline-flex items-center min-h-11 text-sm`}>
            <span aria-hidden="true">←&nbsp;</span>
            {back.label}
          </Link>
        </p>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-[#221E1B]">{title}</h1>
          {intro ? <p className={`mt-2 max-w-2xl ${MUTED}`}>{intro}</p> : null}
        </div>
        {actions ? <div className="flex flex-col sm:flex-row gap-2">{actions}</div> : null}
      </div>
      {showUnits ? (
        <div className="mt-4">
          <UnitsToggle />
        </div>
      ) : null}
    </header>
  );
}

/** A one-line confirmation after a redirect (?saved=1), announced politely. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-6 border-2 border-[#3E7C3A] bg-[#fff8e8] px-4 py-3 text-[#221E1B] font-semibold">
      {children}
    </p>
  );
}

/** Empty state: a heading, a sentence, and the one action that fills it. */
export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-[#221E1B] bg-[#fff8e8] p-6 max-w-2xl">
      <h2 className="font-display text-2xl text-[#221E1B]">{title}</h2>
      <p className="mt-2 text-[#221E1B] leading-relaxed">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
