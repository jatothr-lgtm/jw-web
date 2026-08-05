import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import RevenueImport from "./RevenueImport";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell email={user.email ?? ""}>
      <RevenueImport />
    </AppShell>
  );
}
