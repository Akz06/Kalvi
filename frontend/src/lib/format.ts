/**
 * Money & date formatting driven by the active school's configurable
 * currency + locale (falls back to INR / en-IN).
 */
export function money(
  amount: number,
  currency = "INR",
  locale = "en-IN"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// Backwards-compatible INR helper.
export function inr(amount: number): string {
  return money(amount, "INR", "en-IN");
}

export function formatDate(d: string | Date, locale = "en-IN"): string {
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
