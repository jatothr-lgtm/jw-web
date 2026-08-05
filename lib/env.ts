// Supabase configuration, read once so every caller agrees on whether the app
// is configured. Missing values must degrade to a readable setup page rather
// than throwing inside the proxy, which would 500 every route including /login.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.trim() !== "" && SUPABASE_ANON_KEY.trim() !== "";

export function missingEnvVars(): string[] {
  const missing: string[] = [];
  if (SUPABASE_URL.trim() === "") missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (SUPABASE_ANON_KEY.trim() === "") missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}
