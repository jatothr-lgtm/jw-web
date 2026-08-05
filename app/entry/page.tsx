import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import EntryForm from "./EntryForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell email={user.email ?? ""}>
      <EntryForm />
    </AppShell>
  );
}
