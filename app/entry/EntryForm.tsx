"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { derive, formatNumber, formatPercent, parseNumeric } from "@/lib/calc";
import { mfgTypeForPlant } from "@/lib/mappings";
import { monthInputToIso, toMonthLabel } from "@/lib/month";

/** The seven manually-entered numeric fields (requirements #5-#11). */
const NUMERIC_FIELDS = [
  { key: "workingDays", label: "Number of working days", column: "working_days" },
  { key: "productionKgs", label: "Production (kgs)", column: "production_kgs" },
  { key: "manDays", label: "Man days (actual monthly manpower)", column: "man_days" },
  { key: "electricity", label: "Electricity", column: "electricity" },
  { key: "rent", label: "Rent", column: "rent" },
  { key: "monthlyExpense", label: "Monthly expense", column: "monthly_expense" },
  { key: "reimbursement", label: "Reimbursement", column: "reimbursement" },
] as const;

type NumericKey = (typeof NUMERIC_FIELDS)[number]["key"];
type FormState = Record<NumericKey, string>;

const EMPTY_FORM: FormState = {
  workingDays: "",
  productionKgs: "",
  manDays: "",
  electricity: "",
  rent: "",
  monthlyExpense: "",
  reimbursement: "",
};

/** Allow only digits, one dot and a leading minus while typing. */
function sanitiseNumericInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");
  const [whole, ...rest] = digits.split(".");
  const joined = rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
  return negative ? `-${joined}` : joined;
}

export default function EntryForm({ allowedPlants }: { allowedPlants: string[] }) {
  const supabase = useMemo(() => createClient(), []);

  // With a single grant there is nothing to choose, so preselect it.
  const [plant, setPlant] = useState(allowedPlants.length === 1 ? allowedPlants[0] : "");
  const [monthInput, setMonthInput] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [revenue, setRevenue] = useState<number | null>(null);
  const [revenueState, setRevenueState] = useState<"idle" | "loading" | "found" | "missing">("idle");
  const [loadedExisting, setLoadedExisting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const mfgType = mfgTypeForPlant(plant);
  const monthIso = monthInputToIso(monthInput);
  const ready = plant !== "" && monthIso !== null;

  const numbers = useMemo(
    () => ({
      workingDays: parseNumeric(form.workingDays),
      productionKgs: parseNumeric(form.productionKgs),
      manDays: parseNumeric(form.manDays),
      electricity: parseNumeric(form.electricity),
      rent: parseNumeric(form.rent),
      monthlyExpense: parseNumeric(form.monthlyExpense),
      reimbursement: parseNumeric(form.reimbursement),
      revenue,
    }),
    [form, revenue],
  );

  const derived = useMemo(() => derive(numbers), [numbers]);

  /**
   * Whenever plant+month change, pull the revenue for that combination and any
   * entry that was already saved, so editing an existing month is possible.
   */
  const loadForSelection = useCallback(async () => {
    if (!plant || !monthIso) {
      setRevenue(null);
      setRevenueState("idle");
      setLoadedExisting(false);
      return;
    }

    setRevenueState("loading");
    setMessage(null);

    const [revenueResult, entryResult] = await Promise.all([
      supabase.from("revenue").select("revenue").eq("plant", plant).eq("month", monthIso).maybeSingle(),
      supabase.from("entries").select("*").eq("plant", plant).eq("month", monthIso).maybeSingle(),
    ]);

    const revenueValue = revenueResult.data ? Number(revenueResult.data.revenue) : null;
    setRevenue(revenueValue);
    setRevenueState(revenueValue === null ? "missing" : "found");

    if (entryResult.data) {
      const row = entryResult.data as Record<string, unknown>;
      const next = { ...EMPTY_FORM };
      for (const field of NUMERIC_FIELDS) {
        const value = row[field.column];
        next[field.key] = value === null || value === undefined ? "" : String(value);
      }
      setForm(next);
      setLoadedExisting(true);
    } else {
      setForm(EMPTY_FORM);
      setLoadedExisting(false);
    }
  }, [plant, monthIso, supabase]);

  useEffect(() => {
    void loadForSelection();
  }, [loadForSelection]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !monthIso || !mfgType) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("entries").upsert(
      {
        plant,
        mfg_type: mfgType,
        month: monthIso,
        working_days: numbers.workingDays,
        production_kgs: numbers.productionKgs,
        man_days: numbers.manDays,
        electricity: numbers.electricity,
        rent: numbers.rent,
        monthly_expense: numbers.monthlyExpense,
        reimbursement: numbers.reimbursement,
        revenue,
      },
      { onConflict: "plant,month" },
    );

    if (error) {
      setMessage({ kind: "error", text: `Save failed: ${error.message}` });
      setSaving(false);
      return;
    }

    setLoadedExisting(true);

    // Push the saved month to the Google Sheet. A sync failure must not make
    // the user think the save itself failed, so it is reported separately.
    let syncNote = "";
    try {
      const response = await fetch("/api/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plant, month: monthIso }),
      });
      const payload = await response.json();
      syncNote = response.ok && payload.synced
        ? " Synced to Google Sheet."
        : ` Saved, but the Google Sheet sync did not run (${payload.error ?? "not configured"}).`;
    } catch {
      syncNote = " Saved, but the Google Sheet sync could not be reached.";
    }

    setMessage({
      kind: "ok",
      text: `Saved ${plant} — ${toMonthLabel(monthIso)}.${syncNote}`,
    });
    setSaving(false);
  }

  if (allowedPlants.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Monthly entry</h1>
        <div className="card text-navy-600">
          You have not been granted access to any plant yet. Ask an administrator to
          assign one to you on the Access page.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Monthly entry</h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Choose a plant and month, fill the seven cost fields — everything else is
          filled in or calculated for you.
        </p>
      </div>

      {/* ---- Step 1: selection ------------------------------------------- */}
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <StepBadge n={1} />
          <h2 className="font-semibold text-navy-900">Plant and month</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="plant">Plant</label>
            <select
              id="plant"
              className="input"
              value={plant}
              onChange={(e) => setPlant(e.target.value)}
              required
            >
              <option value="">Select a plant…</option>
              {allowedPlants.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="mfg">
              MFG type <span className="font-normal text-navy-400">· auto</span>
            </label>
            <input
              id="mfg"
              className="input"
              value={mfgType || ""}
              placeholder="Select a plant first"
              readOnly
              disabled
            />
          </div>

          <div>
            <label className="label" htmlFor="month">Month</label>
            <input
              id="month"
              type="month"
              className="input"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-navy-400">
              {monthIso ? toMonthLabel(monthIso) : "Shown as MMM-YY"}
            </p>
          </div>
        </div>
      </section>

      {/* ---- Step 2: revenue --------------------------------------------- */}
      <section className="card-flush">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-navy-900">
                2
              </span>
              <h2 className="font-semibold text-white">Revenue</h2>
              <span className="badge bg-white/15 text-amber-200">auto-fetched</span>
            </div>
            <p className="mt-2 text-sm text-navy-200">
              Taxable Sale Amount for this plant&apos;s warehouse, this month.
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-white tabular">
            {formatNumber(revenue)}
          </p>
        </div>

        {(revenueState === "loading" || revenueState === "missing" || loadedExisting) && (
          <div className="space-y-3 px-6 py-5">
            {revenueState === "loading" && (
              <p className="text-sm text-navy-500">Looking up revenue…</p>
            )}
            {revenueState === "missing" && (
              <p className="note-warn">
                No revenue stored for this plant and month yet. Import the sales file on
                the <strong>Revenue import</strong> page — you can still save now and it
                will fill in afterwards.
              </p>
            )}
            {loadedExisting && (
              <p className="note-muted">
                An entry already exists for this plant and month; saving will update it.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---- Step 3: manual inputs --------------------------------------- */}
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <StepBadge n={3} />
          <h2 className="font-semibold text-navy-900">Cost inputs</h2>
          <span className="ml-auto text-xs text-navy-400">numbers only</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {NUMERIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="label" htmlFor={field.key}>{field.label}</label>
              <input
                id={field.key}
                className="input tabular"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                disabled={!ready}
                value={form[field.key]}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [field.key]: sanitiseNumericInput(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>

        {!ready && (
          <p className="note-muted mt-5">
            Select a plant and a month to start entering values.
          </p>
        )}
      </section>

      {/* ---- Calculated --------------------------------------------------- */}
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-navy-600"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="font-semibold text-navy-900">Calculated</h2>
          <span className="ml-auto text-xs text-navy-400">updates as you type</span>
        </div>

        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Derived label="Job work" hint="= monthly expense" value={formatNumber(derived.jobWork)} />
          <Derived label="Fixed cost" hint="= rent + electricity" value={formatNumber(derived.fixedCost)} />
          <Derived label="Total cost" hint="= fixed + monthly expense" value={formatNumber(derived.totalCost)} />
          <Derived label="Actual JW/kg" hint="= total cost ÷ production" value={formatNumber(derived.actualJwPerKg)} />
          <Derived label="PPP" hint="= production ÷ man days" value={formatNumber(derived.ppp)} />
          <Derived label="JW % of revenue" hint="= job work ÷ revenue" value={formatPercent(derived.jwPctOfRev)} />
        </dl>
      </section>

      {message && (
        <p className={message.kind === "ok" ? "note-ok" : "note-error"}>{message.text}</p>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-navy-100 bg-white/90 p-4 shadow-lift backdrop-blur">
        <button type="submit" className="btn-primary px-6" disabled={!ready || saving}>
          {saving ? "Saving…" : loadedExisting ? "Update entry" : "Save entry"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setForm(EMPTY_FORM)}
          disabled={!ready || saving}
        >
          Clear inputs
        </button>
        <p className="ml-auto hidden text-xs text-navy-400 sm:block">
          Saved to Supabase, then pushed to the Google Sheet.
        </p>
      </div>
    </form>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
      {n}
    </span>
  );
}

function Derived({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div>
      <dt className="mb-1.5">
        <span className="text-sm font-medium text-navy-700">{label}</span>{" "}
        <span className="text-xs text-navy-400">{hint}</span>
      </dt>
      <dd className="derived">{value}</dd>
    </div>
  );
}
