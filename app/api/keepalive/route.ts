import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Called once a day by the Vercel cron in vercel.json. Supabase's free plan pauses
 * a project after about a week without database activity, which takes the whole
 * app offline (sign-in included). One real query a day keeps it awake.
 * Read-only and returns nothing sensitive, so it is left public.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("plants")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
