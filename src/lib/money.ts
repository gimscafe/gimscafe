import { commerce } from "./site";

/**
 * Money is stored everywhere as an integer number of cents (amount * 100).
 * Sri Lankan Rupee is quoted without a minor unit, so we render whole rupees
 * unless there is a fractional part.
 */

export function formatMoney(cents: number, opts?: { withSymbol?: boolean }): string {
  const withSymbol = opts?.withSymbol ?? true;
  const rupees = cents / 100;
  const hasFraction = Math.round(cents) % 100 !== 0;
  const formatted = rupees.toLocaleString("en-LK", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `${commerce.currencySymbol} ${formatted}` : formatted;
}

/** PayHere expects a decimal string with exactly 2 dp and no grouping. */
export function toGatewayAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function rupeesToCents(rupees: number): number {
  return Math.round(rupees * 100);
}

export function centsToRupees(cents: number): number {
  return Math.round(cents) / 100;
}
