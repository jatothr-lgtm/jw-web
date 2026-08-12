import Link from "next/link";
import AppShell from "@/components/AppShell";
import DeleteEntryButton from "./DeleteEntryButton";
import SyncAllButton from "./SyncAllButton";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatPercent } from "@/lib/calc";
import { toMonthLabel } from "@/lib/month";

export const dynamic = "force-dynamic";

type EntryRow = {
  month: string;
  plant: string;
  mfg_type: string;
  production_kgs: string | null;
  revenue: string | null;
  actual_jw_per_kg: string | null;
  working_days: string | null;
  man_days: string | null;
  ppp: string | null;
  job_work: string | null;
  fixed_cost: string | null;
  total_cost: string | null;
  jw_pct_of_rev: string | null;
};

function num(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sum(rows: EntryRow[], key: keyof EntryRow): number {
  return rows.reduce((total, row) => total + (num(row[key] as string | null) ?? 0), 0);
}

/** Large rupee figures are unreadable in full; show them scaled. */
function compactCurrency(value: number): string {
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  return formatNumber(value);
}

export default async function DashboardPage() {
  const { profile, isAdmin } = await requireAdmin();
  const supabase = await createClient();

  // RLS already restricts these rows to the user's granted plants.
  const { data, error } = await supabase
    .from("entries")
    .select(
      "month, plant, mfg_type, production_kgs, revenue, actual_jw_per_kg, working_days, man_days, ppp, job_work, fixed_cost, total_cost, jw_pct_of_rev",
    )
    .order("month", { ascending: false })
    .order("plant");

  const rows = (data ?? []) as EntryRow[];

  // Headline figures describe the most recent month only; mixing months would
  // make the totals meaningless.
  const latestMonth = rows[0]?.month ?? null;
  const latest = latestMonth ? rows.filter((row) => row.month === latestMonth) : [];
  const latestRevenue = sum(latest, "revenue");
  const latestJobWork = sum(latest, "job_work");
  const latestProduction = sum(latest, "production_kgs");
  const latestTotalCost = sum(latest, "total_cost");

  return (
    <AppShell email={profile.email} isAdmin={isAdmin}>
      <div className="space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy-900">Dashboard</h1>
            <p className="mt-1.5 text-sm text-navy-500">
              {isAdmin
                ? "Every plant, every saved month."
                : profile.allowed_plants.length > 0
                  ? `Showing ${profile.allowed_plants.join(", ")}.`
                  : "You have not been granted access to any plant yet."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SyncAllButton />
            <Link href="/entry" className="btn-accent">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              New entry
            </Link>
          </div>
        </div>

        {error && (
          <p className="note-error">
            Could not load entries: {error.message}. If this mentions a missing
            relation, run <code>supabase/schema.sql</code> in the Supabase SQL editor.
          </p>
        )}

        {latest.length > 0 && (
          <section>
            <p className="section-title mb-3">
              Latest month — {toMonthLabel(latestMonth!)} · {latest.length} plant
              {latest.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="stat">
                <p className="stat-label">Revenue</p>
                <p className="stat-value">{compactCurrency(latestRevenue)}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Job work</p>
                <p className="stat-value">{compactCurrency(latestJobWork)}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Production (kgs)</p>
                <p className="stat-value">{formatNumber(latestProduction)}</p>
              </div>
              <div className="stat">
                <p className="stat-label">JW % of revenue</p>
                <p className="stat-value">
                  {latestRevenue > 0 ? formatPercent(latestJobWork / latestRevenue) : "—"}
                </p>
                <p className="mt-1 text-xs text-navy-400">
                  Total cost {compactCurrency(latestTotalCost)}
                </p>
              </div>
            </div>
          </section>
        )}

        {!error && rows.length === 0 && (
          <div className="card flex flex-col items-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" stroke="#5c7cb2" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {!isAdmin && profile.allowed_plants.length === 0 ? (
              <p className="mt-4 max-w-sm text-navy-600">
                Ask an administrator to grant you a plant on the Access page.
              </p>
            ) : (
              <>
                <p className="mt-4 text-lg font-semibold text-navy-800">No entries yet</p>
                <p className="mt-1 max-w-sm text-sm text-navy-500">
                  Record a month of job work costs and it will appear here.
                </p>
                <Link href="/entry" className="btn-primary mt-6">
                  Create the first entry
                </Link>
              </>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <section className="card-flush">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <h2 className="font-semibold text-navy-900">All entries</h2>
              <span className="badge-navy">{rows.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-navy-50/60">
                  <tr>
                    <th className="th">Month</th>
                    <th className="th">Plant</th>
                    <th className="th">Type</th>
                    <th className="th text-right">Production</th>
                    <th className="th text-right">Revenue</th>
                    <th className="th text-right">JW/kg</th>
                    <th className="th text-right">Days</th>
                    <th className="th text-right">Man days</th>
                    <th className="th text-right">PPP</th>
                    <th className="th text-right">Job work</th>
                    <th className="th text-right">Fixed</th>
                    <th className="th text-right">Total cost</th>
                    <th className="th text-right">JW % rev</th>
                    <th className="th text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {rows.map((row) => (
                    <tr
                      key={`${row.plant}-${row.month}`}
                      className="transition hover:bg-amber-50/40"
                    >
                      <td className="td font-medium text-navy-900">{toMonthLabel(row.month)}</td>
                      <td className="td font-medium">{row.plant}</td>
                      <td className="td">
                        <span className={row.mfg_type === "3P" ? "badge-amber" : "badge-navy"}>
                          {row.mfg_type}
                        </span>
                      </td>
                      <td className="td tabular text-right">{formatNumber(num(row.production_kgs))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.revenue))}</td>
                      <td className="td tabular text-right font-semibold text-navy-900">
                        {formatNumber(num(row.actual_jw_per_kg))}
                      </td>
                      <td className="td tabular text-right">{formatNumber(num(row.working_days))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.man_days))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.ppp))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.job_work))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.fixed_cost))}</td>
                      <td className="td tabular text-right">{formatNumber(num(row.total_cost))}</td>
                      <td className="td tabular text-right font-semibold text-navy-900">
                        {formatPercent(num(row.jw_pct_of_rev))}
                      </td>
                      <td className="td text-right">
                        <DeleteEntryButton
                          plant={row.plant}
                          month={row.month}
                          monthLabel={toMonthLabel(row.month)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
