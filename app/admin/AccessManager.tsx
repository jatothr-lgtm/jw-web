"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTS } from "@/lib/mappings";
import type { Profile } from "@/lib/auth";

type RowState = Profile & { dirty: boolean; saving: boolean; note: string | null };

export default function AccessManager({
  currentUserId,
  initialProfiles,
}: {
  currentUserId: string;
  initialProfiles: Profile[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<RowState[]>(
    initialProfiles.map((p) => ({ ...p, dirty: false, saving: false, note: null })),
  );

  const adminCount = rows.filter((row) => row.role === "admin").length;

  function update(id: string, patch: Partial<RowState>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, note: null } : row)),
    );
  }

  function togglePlant(row: RowState, plant: string) {
    const next = row.allowed_plants.includes(plant)
      ? row.allowed_plants.filter((p) => p !== plant)
      : [...row.allowed_plants, plant];
    update(row.id, { allowed_plants: next, dirty: true });
  }

  async function save(row: RowState) {
    update(row.id, { saving: true });

    const { error } = await supabase
      .from("profiles")
      .update({ role: row.role, allowed_plants: row.allowed_plants })
      .eq("id", row.id);

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              saving: false,
              dirty: error ? true : false,
              note: error ? error.message : "Saved",
            }
          : r,
      ),
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card text-navy-600">
        No users yet. People appear here as soon as they register.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const isSelf = row.id === currentUserId;
        // Demoting the only admin would lock everyone out of this page.
        const lockRole = isSelf || (row.role === "admin" && adminCount <= 1);

        return (
          <div key={row.id} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {row.email}
                  {isSelf && (
                    <span className="ml-2 rounded bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">
                      you
                    </span>
                  )}
                </p>
                <p className="text-sm text-navy-500">
                  {row.role === "admin"
                    ? "Full access to every plant"
                    : row.allowed_plants.length === 0
                      ? "No plants granted — cannot see or enter any data"
                      : `${row.allowed_plants.length} plant${row.allowed_plants.length === 1 ? "" : "s"} granted`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-navy-700" htmlFor={`role-${row.id}`}>
                  Role
                </label>
                <select
                  id={`role-${row.id}`}
                  className="input w-auto"
                  value={row.role}
                  disabled={lockRole}
                  onChange={(e) =>
                    update(row.id, {
                      role: e.target.value as Profile["role"],
                      dirty: true,
                    })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {lockRole && (
              <p className="text-xs text-navy-500">
                {isSelf
                  ? "You cannot change your own role."
                  : "This is the only admin; promote someone else first."}
              </p>
            )}

            <div>
              <p className="label">Plants</p>
              <div className="flex flex-wrap gap-2">
                {PLANTS.map((plant) => {
                  const checked = row.role === "admin" || row.allowed_plants.includes(plant);
                  return (
                    <label
                      key={plant}
                      className={
                        checked
                          ? "flex cursor-pointer items-center gap-2 rounded-lg border border-navy-500 bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-800"
                          : "flex cursor-pointer items-center gap-2 rounded-lg border border-navy-200 px-3 py-1.5 text-sm text-navy-600 hover:bg-navy-50"
                      }
                    >
                      <input
                        type="checkbox"
                        className="accent-navy-700"
                        checked={checked}
                        disabled={row.role === "admin"}
                        onChange={() => togglePlant(row, plant)}
                      />
                      {plant}
                    </label>
                  );
                })}
              </div>
              {row.role === "admin" && (
                <p className="mt-2 text-xs text-navy-500">
                  Admins are not restricted by this list.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                className="btn-primary"
                onClick={() => save(row)}
                disabled={!row.dirty || row.saving}
              >
                {row.saving ? "Saving…" : "Save"}
              </button>
              {row.note && (
                <span
                  className={
                    row.note === "Saved"
                      ? "text-sm text-navy-800"
                      : "text-sm text-red-700"
                  }
                >
                  {row.note}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
