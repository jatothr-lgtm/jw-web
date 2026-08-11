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
  duplicateRowsRemoved: number;
  skippedNoSalesOrder: number;
  skippedNoDeliveryNote: number;
  skippedReturns: number;
  skippedUnmappedWarehouse: number;
  skippedBadDate: number;
  unmappedWarehouseNames: string[];
  /** Every distinct Invoice Status seen, so an unexpected variant cannot hide. */
  invoiceStatuses: string[];
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
  salesOrder: ["sales order", "sales_order", "sales order no", "so", "so no", "so number"],
  deliveryNote: [
    "delivery note",
    "delivery_note",
    "delivery note no",
    "dn",
    "dn no",
    "delivery note number",
  ],
  invoiceStatus: ["invoice status", "invoice_status", "status"],
};

/** Treat whitespace-only cells as empty, which is how they arrive from Excel. */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return false;
  return String(value).trim() === "";
}

function normaliseStatus(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

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

/**
 * A stable fingerprint of an entire row, used to spot exact duplicates.
 *
 * Every column counts, not just the three we aggregate on — two rows are only
 * duplicates if they agree on all of them. Text is trimmed, case-folded and has
 * runs of whitespace collapsed, so "  RPC  Indore " and "rpc indore" match.
 *
 * Values of different types do not unify: a date held as a Date does not match
 * the same date held as a string. Within one export a column has one type, so
 * this only matters across files — and re-importing a file cannot double-count
 * anyway, because revenue upserts on (plant, month) rather than adding.
 *
 * JSON.stringify over an array keeps the column boundaries unambiguous, so two
 * different splits of the same characters can never collide.
 */
function rowFingerprint(row: Record<string, unknown>, headers: string[]): string {
  return JSON.stringify(
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString();
      }
      if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "";
      }
      return String(value).replace(/\s+/g, " ").trim().toLowerCase();
    }),
  );
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
  const REQUIRED = [
    "From Warehouse",
    "Invoice Date",
    "Taxable Sale Amount",
    "Sales Order",
    "Delivery Note",
    "Invoice Status",
  ];

  const result: RevenueParseResult = {
    rows: [],
    totalRowsRead: sheetRows.length,
    duplicateRowsRemoved: 0,
    skippedNoSalesOrder: 0,
    skippedNoDeliveryNote: 0,
    skippedReturns: 0,
    skippedUnmappedWarehouse: 0,
    skippedBadDate: 0,
    unmappedWarehouseNames: [],
    invoiceStatuses: [],
    missingColumns: [],
  };

  if (sheetRows.length === 0) {
    result.missingColumns = REQUIRED;
    return result;
  }

  const headers = Object.keys(sheetRows[0]);
  const warehouseCol = resolveColumn(headers, COLUMN_ALIASES.warehouse);
  const dateCol = resolveColumn(headers, COLUMN_ALIASES.invoiceDate);
  const amountCol = resolveColumn(headers, COLUMN_ALIASES.amount);
  const salesOrderCol = resolveColumn(headers, COLUMN_ALIASES.salesOrder);
  const deliveryNoteCol = resolveColumn(headers, COLUMN_ALIASES.deliveryNote);
  const statusCol = resolveColumn(headers, COLUMN_ALIASES.invoiceStatus);

  if (!warehouseCol) result.missingColumns.push("From Warehouse");
  if (!dateCol) result.missingColumns.push("Invoice Date");
  if (!amountCol) result.missingColumns.push("Taxable Sale Amount");
  // These three drive exclusion filters. A missing column cannot be treated as
  // "filter passes" — that would silently overstate revenue — so it is fatal.
  if (!salesOrderCol) result.missingColumns.push("Sales Order");
  if (!deliveryNoteCol) result.missingColumns.push("Delivery Note");
  if (!statusCol) result.missingColumns.push("Invoice Status");

  // Listed individually rather than checking missingColumns.length so that
  // TypeScript narrows each column to a string below.
  if (
    !warehouseCol ||
    !dateCol ||
    !amountCol ||
    !salesOrderCol ||
    !deliveryNoteCol ||
    !statusCol
  ) {
    return result;
  }

  const totals = new Map<string, RevenueRow>();
  const unmapped = new Set<string>();
  // Keyed by the normalised status so "Return" and "return" are one entry,
  // holding the first spelling seen for display.
  const statuses = new Map<string, string>();
  // Rows identical across every column are the same invoice exported twice.
  // The first occurrence counts; later ones are dropped before aggregation.
  const seenRows = new Set<string>();

  for (const row of sheetRows) {
    const fingerprint = rowFingerprint(row, headers);
    if (seenRows.has(fingerprint)) {
      result.duplicateRowsRemoved += 1;
      continue;
    }
    seenRows.add(fingerprint);

    // An invoice with no sales order or no delivery note is not a despatched
    // sale, and returns reverse one — none of the three belong in revenue.
    if (isBlank(row[salesOrderCol])) {
      result.skippedNoSalesOrder += 1;
      continue;
    }

    if (isBlank(row[deliveryNoteCol])) {
      result.skippedNoDeliveryNote += 1;
      continue;
    }

    const status = normaliseStatus(row[statusCol]);
    if (status !== "" && !statuses.has(status)) {
      statuses.set(status, String(row[statusCol]).trim());
    }
    if (status === "return") {
      result.skippedReturns += 1;
      continue;
    }

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
  result.invoiceStatuses = [...statuses.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  return result;
}
