// Month is entered and displayed as MMM-YY (requirement #4) but is stored
// as the first day of the month so rows sort and join correctly in SQL.

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-06-01" -> "Jun-26" */
export function toMonthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  if (!year || !month) return iso;
  const index = Number(month) - 1;
  if (index < 0 || index > 11) return iso;
  return `${MONTH_NAMES[index]}-${year.slice(2)}`;
}

/** "2026-06" (the value of <input type="month">) -> "2026-06-01" */
export function monthInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const month = Number(value.slice(5));
  if (month < 1 || month > 12) return null;
  return `${value}-01`;
}

/** "2026-06-01" -> "2026-06" for round-tripping into <input type="month"> */
export function isoToMonthInput(iso: string): string {
  return iso.slice(0, 7);
}

/** Bucket an arbitrary invoice date onto its month key, "2026-06-01". */
export function invoiceDateToMonthIso(value: unknown): string | null {
  const date = coerceDate(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Sales exports hand us dates as real Dates, ISO/local strings, or Excel serial
 * numbers, depending on how the file was produced.
 */
function coerceDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date: days since 1899-12-30 (in UTC to avoid TZ drift).
    const ms = Math.round(value * 86400 * 1000);
    const date = new Date(Date.UTC(1899, 11, 30) + ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    // Prefer explicit day-first parsing: "05-06-2026" / "05/06/2026" is DD-MM-YYYY
    // in these exports, which Date.parse would read as MM-DD-YYYY.
    const dayFirst = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dayFirst) {
      const [, day, month, year] = dayFirst;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const isoLike = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoLike) {
      const [, year, month, day] = isoLike;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}
