"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/calc";
import { toMonthLabel } from "@/lib/month";
import { aggregateRevenue, type RevenueParseResult } from "@/lib/revenue";
import { WAREHOUSE_TO_PLANT } from "@/lib/mappings";

export default function RevenueImport({ allowedPlants }: { allowedPlants: string[] }) {
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<RevenueParseResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setResult(null);
    setMessage(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
      });
      setResult(aggregateRevenue(rows));
    } catch (error) {
      setMessage({
        kind: "error",
        text: `Could not read that file: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    } finally {
      setParsing(false);
    }
  }

  // A user may only write revenue for plants they have been granted; the same
  // rule is enforced by RLS, this just avoids a confusing partial failure.
  const savableRows = (result?.rows ?? []).filter((row) =>
    allowedPlants.includes(row.plant),
  );
  const blockedPlants = [
    ...new Set(
      (result?.rows ?? [])
        .filter((row) => !allowedPlants.includes(row.plant))
        .map((row) => row.plant),
    ),
  ];

  async function onSave() {
    if (savableRows.length === 0) return;

    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("revenue").upsert(
      savableRows.map((row) => ({
        plant: row.plant,
        month: row.monthIso,
        revenue: row.revenue,
        source_file: fileName,
        uploaded_by: userData.user?.id ?? null,
      })),
      { onConflict: "plant,month" },
    );

    if (error) {
      setMessage({ kind: "error", text: `Save failed: ${error.message}` });
      setSaving(false);
      return;
    }

    setMessage({
      kind: "ok",
      text: `Stored ${savableRows.length} plant-month revenue total${savableRows.length === 1 ? "" : "s"}.`,
    });
    setSaving(false);
  }

  function reset() {
    setResult(null);
    setFileName("");
    setMessage(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue import</h1>
        <p className="mt-1 text-sm text-navy-500">
          Upload the sales export. Rows are grouped by month of Invoice Date and by
          the plant that owns the From Warehouse, then Taxable Sale Amount is summed.
        </p>
      </div>

      <section className="card space-y-3">
        <label className="label" htmlFor="file">Sales file (.xlsx, .xls or .csv)</label>
        <input
          id="file"
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="input"
          onChange={onFile}
        />
        <p className="text-xs text-navy-500">
          The file is read in your browser — only the monthly totals are sent to the
          database. Rows identical in every column count once, and rows with no
          sales order, no delivery note, or an Invoice Status of “return” are excluded.
        </p>
        {parsing && <p className="text-sm text-navy-500">Reading file…</p>}
      </section>

      {result && result.missingColumns.length > 0 && (
        <p className="note-error">
          Missing required column{result.missingColumns.length > 1 ? "s" : ""}:{" "}
          <strong>{result.missingColumns.join(", ")}</strong>. Check that the first
          sheet has a header row.
        </p>
      )}

      {result && result.missingColumns.length === 0 && (
        <section className="card space-y-4">
          <div className="flex flex-wrap gap-6 text-sm text-navy-600">
            <span><strong>{result.totalRowsRead}</strong> rows read</span>
            <span><strong>{result.duplicateRowsRemoved}</strong> exact duplicates removed</span>
            <span><strong>{result.skippedNoSalesOrder}</strong> without a sales order</span>
            <span><strong>{result.skippedNoDeliveryNote}</strong> without a delivery note</span>
            <span><strong>{result.skippedReturns}</strong> returns excluded</span>
            <span><strong>{result.rows.length}</strong> plant-month totals</span>
            <span><strong>{result.skippedUnmappedWarehouse}</strong> skipped (warehouse not mapped)</span>
            <span><strong>{result.skippedBadDate}</strong> skipped (unreadable invoice date)</span>
          </div>

          {result.unmappedWarehouseNames.length > 0 && (
            <details className="note-warn">
              <summary className="cursor-pointer font-semibold">
                {result.unmappedWarehouseNames.length} warehouse name
                {result.unmappedWarehouseNames.length === 1 ? "" : "s"} not in the mapping
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {result.unmappedWarehouseNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p className="mt-2">
                These rows were excluded. Only these five warehouses map to a plant:{" "}
                {Object.values(WAREHOUSE_TO_PLANT).join(", ")}.
              </p>
            </details>
          )}

          {result.invoiceStatuses.length > 0 && (
            <details className="note-muted">
              <summary className="cursor-pointer font-semibold">
                Invoice statuses found in this file ({result.invoiceStatuses.length})
              </summary>
              <p className="mt-2">
                Only the exact status <strong>return</strong> is excluded. If any value
                below is also a return under a different name, tell me and I will add it.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {result.invoiceStatuses.map((status) => (
                  <li
                    key={status}
                    className={
                      status.trim().toLowerCase() === "return"
                        ? "badge-amber"
                        : "badge-navy"
                    }
                  >
                    {status}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {blockedPlants.length > 0 && (
            <p className="note-warn">
              The file also contains revenue for{" "}
              <strong>{blockedPlants.join(", ")}</strong>, which you do not have access
              to. Those totals are shown below but will not be saved.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="py-2 pr-4 font-medium">Month</th>
                  <th className="py-2 pr-4 font-medium">Plant</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const blocked = !allowedPlants.includes(row.plant);
                  return (
                    <tr
                      key={`${row.plant}-${row.monthIso}`}
                      className={
                        blocked
                          ? "border-b border-navy-50 text-navy-400 line-through"
                          : "border-b border-navy-50"
                      }
                    >
                      <td className="py-2 pr-4">{toMonthLabel(row.monthIso)}</td>
                      <td className="py-2 pr-4">{row.plant}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(row.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {message && (
            <p
              className={
                message.kind === "ok"
                  ? "note-ok"
                  : "note-error"
              }
            >
              {message.text}
            </p>
          )}

          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={onSave}
              disabled={saving || savableRows.length === 0}
            >
              {saving ? "Saving…" : `Save ${savableRows.length} total${savableRows.length === 1 ? "" : "s"} to database`}
            </button>
            <button className="btn-ghost" onClick={reset} disabled={saving}>
              Discard
            </button>
          </div>
          <p className="text-xs text-navy-500">
            Saving overwrites any existing total for the same plant and month.
          </p>
        </section>
      )}
    </div>
  );
}
