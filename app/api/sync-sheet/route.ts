import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toMonthLabel } from "@/lib/month";

export const dynamic = "force-dynamic";

const SELECT_COLUMNS =
  "month, plant, mfg_type, production_kgs, revenue, actual_jw_per_kg, working_days, man_days, ppp, job_work, electricity, rent, reimbursement, fixed_cost, total_cost, jw_pct_of_rev, updated_at";

/**
 * Pushes saved entries to the Google Sheet via an Apps Script web app.
 * Body: { all: true } for a full refresh, or { plant, month } for one row.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ synced: false, error: "Not signed in" }, { status: 401 });
  }

  const webhookUrl = process.env.GSHEET_WEBHOOK_URL;
  const webhookSecret = process.env.GSHEET_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json({
      synced: false,
      error: "GSHEET_WEBHOOK_URL / GSHEET_WEBHOOK_SECRET are not set",
    });
  }

  let body: { all?: boolean; plant?: string; month?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ synced: false, error: "Invalid JSON body" }, { status: 400 });
  }

  let query = supabase.from("entries").select(SELECT_COLUMNS);
  if (!body.all) {
    if (!body.plant || !body.month) {
      return NextResponse.json(
        { synced: false, error: "Provide either all:true or both plant and month" },
        { status: 400 },
      );
    }
    query = query.eq("plant", body.plant).eq("month", body.month);
  }

  const { data, error } = await query
    .order("month", { ascending: false })
    .order("plant");

  if (error) {
    return NextResponse.json({ synced: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    month_label: toMonthLabel(String(row.month)),
  }));

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: webhookSecret,
        mode: body.all ? "replace" : "upsert",
        rows,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { synced: false, error: `Apps Script returned ${response.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ synced: true, rowCount: rows.length });
  } catch (fetchError) {
    return NextResponse.json(
      {
        synced: false,
        error: fetchError instanceof Error ? fetchError.message : "Webhook unreachable",
      },
      { status: 502 },
    );
  }
}
