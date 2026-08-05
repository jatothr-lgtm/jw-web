import AppShell from "@/components/AppShell";
import RevenueImport from "./RevenueImport";
import { requireSession } from "@/lib/auth";
import { PLANTS } from "@/lib/mappings";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const { profile, isAdmin } = await requireSession();

  const allowedPlants = isAdmin
    ? [...PLANTS]
    : PLANTS.filter((plant) => profile.allowed_plants.includes(plant));

  return (
    <AppShell email={profile.email} isAdmin={isAdmin}>
      <RevenueImport allowedPlants={allowedPlants} />
    </AppShell>
  );
}
