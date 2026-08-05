import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import SyncAllButton from "./SyncAllButton";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("entries")
    .select(
      "month, plant, mfg_type, production_kgs, revenue, actual_jw_per_kg, working_days, man_days, ppp, job_work, fixed_cost, total_cost, jw_pct_of_rev",
    )
    .order("month", { ascending: false })
    .order("plant");

  const rows = (data ?? []) as EntryRow[];

  return (
    <AppShell email={user.email ?? ""}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              All saved monthly entries across plants.
            </p>
          </div>
          <div className="flex gap-3">
            <SyncAllButton />
            <Link href="/entry" className="btn-primary">New entry</Link>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load entries: {error.message}. If this mentions a missing
            relation, run <code>supabase/schema.sql</code> in the Supabase SQL editor.
          </p>
        )}

        {!error && rows.length === 0 && (
          <div className="card text-center">
            <p className="text-slate-600">No entries yet.</p>
            <Link href="/entry" className="btn-primary mt-4">Create the first entry</Link>
          </div>
        )}

        {rows.length > 0 && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium">MFG type</th>
                  <th className="px-4 py-3 font-medium">Plant</th>
                  <th className="px-4 py-3 text-right font-medium">Production (kgs)</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Actual JW/kg</th>
                  <th className="px-4 py-3 text-right font-medium">Days</th>
                  <th className="px-4 py-3 text-right font-medium">Man days</th>
                  <th className="px-4 py-3 text-right font-medium">PPP</th>
                  <th className="px-4 py-3 text-right font-medium">Job work</th>
                  <th className="px-4 py-3 text-right font-medium">Fixed cost</th>
                  <th className="px-4 py-3 text-right font-medium">Total cost</th>
                  <th className="px-4 py-3 text-right font-medium">JW % of rev</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.plant}-${row.month}`} className="border-b border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">{toMonthLabel(row.month)}</td>
                    <td className="px-4 py-3">{row.mfg_type}</td>
                    <td className="px-4 py-3 font-medium">{row.plant}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.production_kgs))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.revenue))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.actual_jw_per_kg))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.working_days))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.man_days))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.ppp))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.job_work))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.fixed_cost))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(num(row.total_cost))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPercent(num(row.jw_pct_of_rev))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
