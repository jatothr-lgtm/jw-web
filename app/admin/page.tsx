import AppShell from "@/components/AppShell";
import AccessManager from "./AccessManager";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, allowed_plants")
    .order("email");

  return (
    <AppShell email={profile.email} isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Access management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Grant each person the plants they are responsible for. Admins always see
            every plant and are the only ones who can change access here.
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load users: {error.message}
          </p>
        ) : (
          <AccessManager
            currentUserId={profile.id}
            initialProfiles={(data ?? []) as Profile[]}
          />
        )}
      </div>
    </AppShell>
  );
}
