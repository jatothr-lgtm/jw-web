"use client";

import { useState } from "react";

export default function SyncAllButton() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function syncAll() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const payload = await response.json();
      setNote(
        response.ok && payload.synced
          ? `Synced ${payload.rowCount} rows to the Google Sheet.`
          : `Sync did not run: ${payload.error ?? "not configured"}`,
      );
    } catch {
      setNote("Sync endpoint could not be reached.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-sm text-slate-500">{note}</span>}
      <button className="btn-ghost" onClick={syncAll} disabled={busy}>
        {busy ? "Syncing…" : "Sync to Google Sheet"}
      </button>
    </div>
  );
}
