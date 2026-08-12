"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin-only removal of a wrongly entered month.
 *
 * Deleting is irreversible, so it takes two clicks and names the row being
 * removed. The database enforces the same rule: only admins hold the delete
 * policy on `entries`.
 */
export default function DeleteEntryButton({
  plant,
  month,
  monthLabel,
}: {
  plant: string;
  month: string;
  monthLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("plant", plant)
      .eq("month", month);

    if (deleteError) {
      setError(deleteError.message);
      setBusy(false);
      return;
    }

    // The sheet has no delete, so rewrite it wholesale; otherwise the deleted
    // row would linger there after vanishing from the database.
    try {
      await fetch("/api/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // A failed sync must not make the delete look like it failed.
    }

    router.refresh();
  }

  if (error) {
    return (
      <span className="text-xs text-rose-700" title={error}>
        Failed
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg p-1.5 text-navy-300 transition hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete ${plant} ${monthLabel}`}
        title="Delete this entry"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M4 6h12M8 6V4.5A.5.5 0 0 1 8.5 4h3a.5.5 0 0 1 .5.5V6m1.5 0-.5 9a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1L6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-lg px-2 py-1 text-xs font-medium text-navy-500 hover:bg-navy-50"
      >
        Cancel
      </button>
    </span>
  );
}
