-- JW Web — database schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- ---------------------------------------------------------------------------
-- Reference data: plants and their MFG type
-- ---------------------------------------------------------------------------
create table if not exists public.plants (
  name       text primary key,
  mfg_type   text not null check (mfg_type in ('In House', '3P')),
  warehouse  text unique
);

insert into public.plants (name, mfg_type, warehouse) values
  ('Indore', 'In House', 'RPC Indore - Finished Goods Stores - CBSPL'),
  ('Purnia', 'In House', 'RPC Purnia Finished Goods - CBSPL'),
  ('Kundli', 'In House', 'RPC Kundli - Finished Goods Stores - CBSPL'),
  ('Udupi',  'In House', null),
  ('UD',     '3P',       'RPC UD Foods Finished Goods - CBSPL'),
  ('Rebela', '3P',       'RPC Functional & Innovative Foods Finished Goods - CBSPL')
on conflict (name) do update
  set mfg_type = excluded.mfg_type,
      warehouse = excluded.warehouse;

-- ---------------------------------------------------------------------------
-- Revenue: one row per (plant, month), sourced from the sales file upload
-- ---------------------------------------------------------------------------
create table if not exists public.revenue (
  id          uuid primary key default gen_random_uuid(),
  plant       text not null references public.plants(name),
  month       date not null,                      -- always the 1st of the month
  revenue     numeric(18, 4) not null default 0,
  source_file text,
  uploaded_by uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  -- Re-uploading a corrected sales file must overwrite, never duplicate.
  unique (plant, month)
);

-- ---------------------------------------------------------------------------
-- Entries: the monthly cost sheet, one row per (plant, month)
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id              uuid primary key default gen_random_uuid(),
  plant           text not null references public.plants(name),
  mfg_type        text not null check (mfg_type in ('In House', '3P')),
  month           date not null,                  -- always the 1st of the month
  working_days    numeric(10, 2),
  production_kgs  numeric(18, 4),
  man_days        numeric(18, 4),
  electricity     numeric(18, 4),
  rent            numeric(18, 4),
  monthly_expense numeric(18, 4),
  reimbursement   numeric(18, 4),
  revenue         numeric(18, 4),                 -- snapshot from public.revenue

  -- Derived columns: the database is the arbiter, so no client can store
  -- a value that disagrees with the formula.
  job_work        numeric(18, 4) generated always as (monthly_expense) stored,
  fixed_cost      numeric(18, 4) generated always as
                    (coalesce(rent, 0) + coalesce(electricity, 0)) stored,
  total_cost      numeric(18, 4) generated always as
                    (coalesce(rent, 0) + coalesce(electricity, 0)
                     + coalesce(monthly_expense, 0)) stored,
  actual_jw_per_kg numeric(18, 6) generated always as (
                    case when coalesce(production_kgs, 0) = 0 then null
                    else (coalesce(rent, 0) + coalesce(electricity, 0)
                          + coalesce(monthly_expense, 0)) / production_kgs end) stored,
  ppp             numeric(18, 6) generated always as (
                    case when coalesce(man_days, 0) = 0 then null
                    else production_kgs / man_days end) stored,
  jw_pct_of_rev   numeric(18, 8) generated always as (
                    case when coalesce(revenue, 0) = 0 then null
                    else monthly_expense / revenue end) stored,

  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (plant, month)
);

create index if not exists entries_month_idx on public.entries (month desc);
create index if not exists revenue_month_idx on public.revenue (month desc);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

drop trigger if exists revenue_touch_updated_at on public.revenue;
create trigger revenue_touch_updated_at
  before update on public.revenue
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Any signed-in user may read and write; anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
alter table public.plants  enable row level security;
alter table public.revenue enable row level security;
alter table public.entries enable row level security;

drop policy if exists "plants readable by authenticated" on public.plants;
create policy "plants readable by authenticated"
  on public.plants for select to authenticated using (true);

drop policy if exists "revenue readable by authenticated" on public.revenue;
create policy "revenue readable by authenticated"
  on public.revenue for select to authenticated using (true);

drop policy if exists "revenue writable by authenticated" on public.revenue;
create policy "revenue writable by authenticated"
  on public.revenue for all to authenticated using (true) with check (true);

drop policy if exists "entries readable by authenticated" on public.entries;
create policy "entries readable by authenticated"
  on public.entries for select to authenticated using (true);

drop policy if exists "entries writable by authenticated" on public.entries;
create policy "entries writable by authenticated"
  on public.entries for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Convenience view used by the dashboard and the Google Sheet export
-- ---------------------------------------------------------------------------
create or replace view public.entries_full as
select
  e.month,
  to_char(e.month, 'Mon-YY')        as month_label,
  e.mfg_type,
  e.plant,
  e.production_kgs,
  e.revenue,
  e.actual_jw_per_kg,
  e.working_days,
  e.man_days,
  e.ppp,
  e.job_work,
  e.electricity,
  e.rent,
  e.reimbursement,
  e.fixed_cost,
  e.total_cost,
  e.jw_pct_of_rev,
  e.updated_at
from public.entries e
order by e.month desc, e.plant;
