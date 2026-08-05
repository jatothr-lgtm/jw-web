import AppShell from "@/components/AppShell";
import EntryForm from "./EntryForm";
import { requireSession } from "@/lib/auth";
import { PLANTS } from "@/lib/mappings";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const { profile, isAdmin } = await requireSession();

  const allowedPlants = isAdmin
    ? [...PLANTS]
    : PLANTS.filter((plant) => profile.allowed_plants.includes(plant));

  return (
    <AppShell email={profile.email} isAdmin={isAdmin}>
      <EntryForm allowedPlants={allowedPlants} />
    </AppShell>
  );
}
