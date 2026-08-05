// Derived-field formulas (requirements #14-#19).
// Every derived value is computed here so the form, the API and the
// Google-Sheet export can never disagree with each other.

export type EntryInputs = {
  workingDays: number | null;
  productionKgs: number | null;
  manDays: number | null;
  electricity: number | null;
  rent: number | null;
  monthlyExpense: number | null;
  reimbursement: number | null;
  revenue: number | null;
};

export type DerivedFields = {
  jobWork: number | null; // #14  = Monthly Expense
  fixedCost: number | null; // #17  = Rent + Electricity
  totalCost: number | null; // #18  = Fixed cost + Monthly Expense
  actualJwPerKg: number | null; // #15  = Total Cost / Production (kgs)
  ppp: number | null; // #16  = Production (kgs) / Man days
  jwPctOfRev: number | null; // #19  = Job work / Revenue   (as a fraction)
};

/** Divide, but return null instead of Infinity/NaN when the divisor is unusable. */
function div(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

function add(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

export function derive(input: EntryInputs): DerivedFields {
  const jobWork = input.monthlyExpense;
  const fixedCost = add(input.rent, input.electricity);
  const totalCost = add(fixedCost, input.monthlyExpense);

  return {
    jobWork,
    fixedCost,
    totalCost,
    actualJwPerKg: div(totalCost, input.productionKgs),
    ppp: div(input.productionKgs, input.manDays),
    jwPctOfRev: div(jobWork, input.revenue),
  };
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return NUMBER_FORMAT.format(value);
}

export function formatPercent(fraction: number | null): string {
  if (fraction === null || !Number.isFinite(fraction)) return "—";
  return `${NUMBER_FORMAT.format(fraction * 100)}%`;
}

/** Parse a text input that must hold a number; empty string means "not filled in". */
export function parseNumeric(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
