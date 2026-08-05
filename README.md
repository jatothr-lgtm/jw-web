# JW Web — monthly job-work cost entry

A Next.js app that replaces the `condition _ jw-web.xlsx` sheet: users register,
sign in, pick a plant and month, fill in seven cost fields, and everything else is
either auto-filled, auto-fetched from the sales file, or calculated.

Data lives in Supabase and is pushed to a Google Sheet.

## Field behaviour

| Field | Behaviour |
|---|---|
| Plant | Select one of Indore, Purnia, Kundli, Udupi, UD, Rebela |
| MFG Type | **Auto-filled** from plant (Indore/Purnia/Kundli/Udupi → In House; UD/Rebela → 3P) |
| Month | Month picker, displayed as `MMM-YY` |
| No. of working days | Manual, numeric only |
| Production (kgs) | Manual, numeric only |
| Man days | Manual, numeric only |
| Electricity | Manual, numeric only |
| Rent | Manual, numeric only |
| Monthly Expense | Manual, numeric only |
| Reimbursement | Manual, numeric only |
| Revenue | **Auto-fetched** — sum of `Taxable Sale Amount` grouped by month of `Invoice Date` and by the plant that owns the `From Warehouse` |
| Job work | Auto = Monthly Expense |
| Fixed cost | Auto = Rent + Electricity |
| Total Cost | Auto = Fixed cost + Monthly Expense |
| Actual JW/kg | Auto = Total Cost ÷ Production (kgs) |
| PPP | Auto = Production (kgs) ÷ Man days |
| JW % of rev | Auto = Job work ÷ Revenue |

Formulas live in one place, [`lib/calc.ts`](lib/calc.ts), and are mirrored as
generated columns in Postgres so the database can never hold a value that
disagrees with the formula.

### Warehouse → plant mapping

| From Warehouse | Plant |
|---|---|
| RPC Indore - Finished Goods Stores - CBSPL | Indore |
| RPC Purnia Finished Goods - CBSPL | Purnia |
| RPC Kundli - Finished Goods Stores - CBSPL | Kundli |
| RPC UD Foods Finished Goods - CBSPL | UD |
| RPC Functional & Innovative Foods Finished Goods - CBSPL | Rebela |

Udupi has no warehouse in the mapping, so its revenue stays blank until a
warehouse is assigned in [`lib/mappings.ts`](lib/mappings.ts) and `supabase/schema.sql`.

## Workflow

1. **Register / sign in** — Supabase email + password auth.
2. **Revenue import** — upload the sales export (`.xlsx`, `.xls`, `.csv`). It is
   parsed in the browser, aggregated to plant-month totals, previewed, and then
   written to the `revenue` table. Rows whose warehouse is not in the mapping are
   reported and excluded rather than silently dropped.
3. **Monthly entry** — pick plant + month; MFG type and revenue fill in, the seven
   inputs are typed, and the six derived values update live. Saving upserts on
   `(plant, month)` so re-entering a month edits it instead of duplicating it.
4. **Google Sheet** — each save pushes that row to the sheet; the dashboard has a
   "Sync to Google Sheet" button for a full refresh.

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then:

- **SQL Editor → New query** → paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
- Optionally run [`supabase/seed.sql`](supabase/seed.sql) to load the Jan–Jun history
  from the original Excel. The sheet carries no year, so the script assumes **2026** —
  change `seed_year` at the top if that is wrong. Re-running it is safe; every row
  upserts on `(plant, month)`.
- **Project Settings → API** → copy the Project URL and the `anon` public key.
- **Authentication → Providers → Email** → enable. For an internal tool you will
  probably want to switch **Confirm email** off so registration is immediate.

### 2. Environment variables

Copy `.env.example` to `.env.local` for local work, and set the same values in
Vercel under **Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
GSHEET_WEBHOOK_URL=https://script.google.com/macros/s/..../exec
GSHEET_WEBHOOK_SECRET=some-long-random-string
```

The two `GSHEET_*` values are optional — without them the app works normally and
the sync step simply reports that it is not configured.

### 3. Google Sheet

Open the destination sheet → **Extensions → Apps Script**, paste
[`google-apps-script/Code.gs`](google-apps-script/Code.gs), set `SHARED_SECRET` to
match `GSHEET_WEBHOOK_SECRET`, then **Deploy → New deployment → Web app**
(execute as *Me*, access *Anyone*). Copy the `/exec` URL into `GSHEET_WEBHOOK_URL`.

Access must be *Anyone* because Vercel calls the script without a Google identity;
the shared secret in the request body is what authorises the write.

### 4. Deploy

Import the repo on [vercel.com/new](https://vercel.com/new), add the environment
variables, and deploy. No build configuration is needed.

### Local development

```bash
npm install
npm run dev
```

## Suggested enhancements

Not built, in rough order of value:

1. **Role-based access.** Right now any signed-in user can read and write every
   plant. A `profiles` table holding `role` and `allowed_plants`, enforced in the
   RLS policies, would restrict plant managers to their own plant and leave
   finance with the full view.
2. **Approval / lock workflow.** A `status` column (`draft` → `submitted` →
   `approved`) with a policy that blocks edits to approved months, so closed
   periods cannot be quietly changed.
3. **Audit trail.** An `entries_history` table written by a trigger, capturing who
   changed which field and when — useful when a JW% moves after month-end.
4. **Variance alerts.** Flag on save when JW/kg or JW% of revenue deviates more
   than *n*% from the plant's trailing 3-month average. This catches a mistyped
   digit at entry time rather than at review time.
5. **Budget vs actual.** The source sheet also carries `BOM JW Per Kg` and
   `JW Amt/Kgs`; storing those as a budget and showing actual-vs-budget variance
   per plant-month would make the dashboard decision-useful.
6. **Charts.** Month-on-month JW/kg and PPP trend lines per plant.
7. **Excel / CSV export** of the dashboard, for people who want the pivot offline.
8. **Scheduled revenue refresh.** If the sales data can be reached by API, a daily
   Vercel cron could refresh `revenue` instead of relying on a manual upload.
9. **Completeness view.** A plant × month grid showing which cells are still
   missing, so nothing is forgotten at month-end close.
