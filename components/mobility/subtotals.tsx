import type { CurrencySubtotal } from "@/lib/mobility/money";
import { MUTED } from "./styles";

/**
 * Costs as one subtotal per currency, never converted (PRD §5.7). "$412.10 + MX$1,850.00" reads
 * as a list to screen readers, with each currency code spoken.
 */
export function Subtotals({ subtotals, label = "Costs" }: { subtotals: readonly CurrencySubtotal[]; label?: string }) {
  if (!subtotals.length) {
    return (
      <p className={`text-sm ${MUTED}`}>
        {label}: none recorded
      </p>
    );
  }
  return (
    <div className="text-sm">
      <span className={MUTED}>{label}: </span>
      <ul className="inline" aria-label={`${label}, one subtotal per currency`}>
        {subtotals.map((s, i) => (
          <li key={s.currency} className="inline font-semibold text-[#221E1B]">
            {i > 0 ? <span aria-hidden="true"> + </span> : null}
            {s.text}
            <span className="sr-only"> {s.currency}</span>
          </li>
        ))}
      </ul>
      {subtotals.length > 1 ? <span className={MUTED}> (not converted)</span> : null}
    </div>
  );
}
