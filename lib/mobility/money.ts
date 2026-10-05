/**
 * Money in the mobility module (PRD §5.7). Every amount is stored with the ISO 4217 currency it
 * was paid in, and RideWitUS never converts: totals across currencies are one subtotal per
 * currency. CentenarianOS owns exchange rates. Pure.
 */

export interface MoneyLike {
  /** Postgres numeric(12,2) comes back as a string. */
  costAmount: string | number | null;
  costCurrency: string | null;
}

export interface CurrencySubtotal {
  currency: string;
  /** Integer minor units (hundredths), so sums never pick up float error. */
  cents: number;
  count: number;
  text: string;
}

/** "12.5" → 1250. Returns null for anything that is not a finite amount. */
export function toCents(amount: string | number | null | undefined): number | null {
  if (amount == null || amount === "") return null;
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function formatMoney(cents: number, currency: string, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    // A well-formed code Intl doesn't know still reads correctly this way.
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatAmount(amount: string | number | null, currency: string | null): string | null {
  const cents = toCents(amount);
  return cents == null || !currency ? null : formatMoney(cents, currency);
}

/**
 * One subtotal per currency, largest count first then alphabetical, so the user's usual currency
 * leads. Rows without an amount are skipped; an amount with no currency cannot exist (check
 * constraint), but is skipped here too rather than guessed.
 */
export function subtotalsByCurrency(items: readonly MoneyLike[]): CurrencySubtotal[] {
  const by = new Map<string, { cents: number; count: number }>();
  for (const item of items) {
    const cents = toCents(item.costAmount);
    const currency = item.costCurrency?.trim().toUpperCase();
    if (cents == null || !currency) continue;
    const prev = by.get(currency) ?? { cents: 0, count: 0 };
    by.set(currency, { cents: prev.cents + cents, count: prev.count + 1 });
  }
  return [...by.entries()]
    .map(([currency, v]) => ({ currency, cents: v.cents, count: v.count, text: formatMoney(v.cents, currency) }))
    .sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
}

/** "$412.10 + MX$1,850.00", or null when there is nothing to total. */
export function subtotalsText(subtotals: readonly CurrencySubtotal[]): string | null {
  return subtotals.length ? subtotals.map((s) => s.text).join(" + ") : null;
}
