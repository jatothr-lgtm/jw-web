import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  role: "admin" | "user";
  allowed_plants: string[];
};

export type Session = {
  profile: Profile;
  isAdmin: boolean;
};

/**
 * Every signed-in page starts here: it guarantees a user and their profile,
 * redirecting to /login otherwise.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, allowed_plants")
    .eq("id", user.id)
    .maybeSingle();

  // The profile is created by a trigger on sign-up. If it is somehow absent,
  // fall back to the least privilege rather than assuming anything.
  const profile: Profile = data
    ? {
        id: data.id,
        email: data.email ?? user.email ?? "",
        role: data.role === "admin" ? "admin" : "user",
        allowed_plants: Array.isArray(data.allowed_plants) ? data.allowed_plants : [],
      }
    : {
        id: user.id,
        email: user.email ?? "",
        role: "user",
        allowed_plants: [],
      };

  return { profile, isAdmin: profile.role === "admin" };
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/dashboard");
  return session;
}
