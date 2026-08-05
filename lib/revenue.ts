// Requirement #12: read the uploaded sales file and sum "Taxable Sale Amount"
// grouped by (month of Invoice Date, plant derived from "From Warehouse").

import { plantForWarehouse, type Plant } from "./mappings";
import { invoiceDateToMonthIso } from "./month";

export type RevenueRow = {
  plant: Plant;
  monthIso: string; // "2026-06-01"
  revenue: number;
};

export type RevenueParseResult = {
  rows: RevenueRow[];
  totalRowsRead: number;
  skippedUnmappedWarehouse: number;
  skippedBadDate: number;
  unmappedWarehouseNames: string[];
  missingColumns: string[];
};

const COLUMN_ALIASES = {
  warehouse: ["from warehouse", "warehouse", "from_warehouse"],
  invoiceDate: ["invoice date", "invoice_date", "inv date", "date"],
  amount: [
    "taxable sale amount",
    "taxable_sale_amount",
    "taxable amount",
    "taxable sales amount",
  ],
};

function normaliseHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Find the actual header text in the sheet for one of our logical columns. */
function resolveColumn(headers: string[], aliases: string[]): string | null {
  for (const header of headers) {
    if (aliases.includes(normaliseHeader(header))) return header;
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  // Strip currency symbols, thousands separators and stray spaces.
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `sheetRows` is the output of XLSX.utils.sheet_to_json(sheet, { defval: null }).
 * Aggregation happens in the browser so a large sales file never has to be uploaded.
 */
export function aggregateRevenue(
  sheetRows: Record<string, unknown>[],
): RevenueParseResult {
  const result: RevenueParseResult = {
    rows: [],
    totalRowsRead: sheetRows.length,
    skippedUnmappedWarehouse: 0,
    skippedBadDate: 0,
    unmappedWarehouseNames: [],
    missingColumns: [],
  };

  if (sheetRows.length === 0) {
    result.missingColumns = ["From Warehouse", "Invoice Date", "Taxable Sale Amount"];
    return result;
  }

  const headers = Object.keys(sheetRows[0]);
  const warehouseCol = resolveColumn(headers, COLUMN_ALIASES.warehouse);
  const dateCol = resolveColumn(headers, COLUMN_ALIASES.invoiceDate);
  const amountCol = resolveColumn(headers, COLUMN_ALIASES.amount);

  if (!warehouseCol) result.missingColumns.push("From Warehouse");
  if (!dateCol) result.missingColumns.push("Invoice Date");
  if (!amountCol) result.missingColumns.push("Taxable Sale Amount");
  if (!warehouseCol || !dateCol || !amountCol) return result;

  const totals = new Map<string, RevenueRow>();
  const unmapped = new Set<string>();

  for (const row of sheetRows) {
    const plant = plantForWarehouse(row[warehouseCol]);
    if (!plant) {
      const name = String(row[warehouseCol] ?? "").trim();
      if (name !== "") unmapped.add(name);
      result.skippedUnmappedWarehouse += 1;
      continue;
    }

    const monthIso = invoiceDateToMonthIso(row[dateCol]);
    if (!monthIso) {
      result.skippedBadDate += 1;
      continue;
    }

    const amount = parseAmount(row[amountCol]) ?? 0;
    const key = `${plant}|${monthIso}`;
    const existing = totals.get(key);
    if (existing) {
      existing.revenue += amount;
    } else {
      totals.set(key, { plant, monthIso, revenue: amount });
    }
  }

  result.rows = [...totals.values()].sort(
    (a, b) => a.monthIso.localeCompare(b.monthIso) || a.plant.localeCompare(b.plant),
  );
  result.unmappedWarehouseNames = [...unmapped].sort();
  return result;
}
