/**
 * Money handling. All monetary values are persisted as INTEGER MINOR UNITS
 * (paise/cents) to eliminate floating-point rounding errors. The API accepts
 * and returns MAJOR units (rupees/dollars) and converts at the boundary.
 */

/** Convert major units (e.g. 100.50) to integer minor units (10050). */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

/** Convert integer minor units (10050) back to major units (100.5). */
export function toMajor(minor: number): number {
  return Math.round(minor) / 100;
}

/** Recursively convert selected numeric fields on an object from minor→major. */
export function moneyToMajor<T extends Record<string, any>>(obj: T, fields: string[]): T {
  const clone: any = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const [k, v] of Object.entries(clone)) {
    if (fields.includes(k) && typeof v === "number") {
      clone[k] = toMajor(v);
    } else if (v && typeof v === "object") {
      clone[k] = moneyToMajor(v as any, fields);
    }
  }
  return clone;
}

/** Standard money field names used across fee entities. */
export const MONEY_FIELDS = ["amount", "amountPaid", "defaultAmount"];
