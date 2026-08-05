// Single source of truth for plant / MFG-type / warehouse mappings.
// Mirrors the "condition _ jw-web.xlsx" reference sheet.

export const PLANTS = [
  "Indore",
  "Purnia",
  "Kundli",
  "Udupi",
  "UD",
  "Rebela",
] as const;

export type Plant = (typeof PLANTS)[number];

export type MfgType = "In House" | "3P";

// Requirement #3: MFG Type is auto-filled from the selected plant.
export const PLANT_TO_MFG_TYPE: Record<Plant, MfgType> = {
  Indore: "In House",
  Purnia: "In House",
  Kundli: "In House",
  Udupi: "In House",
  UD: "3P",
  Rebela: "3P",
};

// Requirement #13: revenue rows are grouped to a plant via the
// "From Warehouse" column of the uploaded sales file.
export const WAREHOUSE_TO_PLANT: Record<string, Plant> = {
  "rpc purnia finished goods - cbspl": "Purnia",
  "rpc indore - finished goods stores - cbspl": "Indore",
  "rpc kundli - finished goods stores - cbspl": "Kundli",
  "rpc ud foods finished goods - cbspl": "UD",
  "rpc functional & innovative foods finished goods - cbspl": "Rebela",
};

/** Warehouse names arrive with inconsistent spacing/casing; match on a normalised key. */
export function normaliseWarehouse(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function plantForWarehouse(raw: unknown): Plant | null {
  return WAREHOUSE_TO_PLANT[normaliseWarehouse(raw)] ?? null;
}

export function mfgTypeForPlant(plant: string): MfgType | "" {
  return PLANT_TO_MFG_TYPE[plant as Plant] ?? "";
}
