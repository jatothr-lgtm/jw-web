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
  ('UD',     '3P',       'RPC UD Foods Finished Goods - CBSPL'),
  ('Rebela', '3P',       'RPC Functional & Innovative Foods Finished Goods - CBSPL')
on conflict (name) do update
  set mfg_type = excluded.mfg_type,
      warehouse = excluded.warehouse;

-- ---------------------------------------------------------------------------
-- Profiles: one row per signed-up user, carrying their role and plant access
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  role           text not null default 'user' check (role in ('admin', 'user')),
  allowed_plants text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The bootstrap admin. Anyone else starts as a user with no plants until an
-- admin grants them access.
create or replace function public.bootstrap_role(user_email text)
returns text
language sql
immutable
as $$
  select case when lower(user_email) = 'jatoth.r@farmley.com' then 'admin' else 'user' end;
$$;

-- Every new auth user automatically gets a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, allowed_plants)
  values (
    new.id,
    new.email,
    public.bootstrap_role(new.email),
    case when public.bootstrap_role(new.email) = 'admin'
         then array(select name from public.plants)
         else '{}'::text[] end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: covers users who registered before this table existed.
insert into public.profiles (id, email, role, allowed_plants)
select u.id, u.email, public.bootstrap_role(u.email),
       case when public.bootstrap_role(u.email) = 'admin'
            then array(select name from public.plants)
            else '{}'::text[] end
from auth.users u
on conflict (id) do nothing;

-- Make sure the bootstrap admin is an admin even if they registered earlier.
update public.profiles
   set role = 'admin',
       allowed_plants = array(select name from public.plants)
 where lower(email) = 'jatoth.r@farmley.com'
   and role <> 'admin';

-- Plants that no longer exist must not linger in anyone's grant list.
update public.profiles p
   set allowed_plants = array(
         select unnest(p.allowed_plants)
         intersect
         select name from public.plants)
 where exists (
   select 1 from unnest(p.allowed_plants) a
    where a not in (select name from public.plants));

-- ---------------------------------------------------------------------------
-- Access helpers.
-- Both are SECURITY DEFINER so that a policy on `profiles` can consult
-- `profiles` without recursing through its own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_access_plant(target_plant text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and (role = 'admin' or target_plant = any(allowed_plants))
  );
$$;

-- Refuse to remove the last admin, whether by demotion or deletion.
create or replace function public.guard_last_admin()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'admin')
     or (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    if (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'Cannot remove the last admin';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_guard_last_admin on public.profiles;
create trigger profiles_guard_last_admin
  before update or delete on public.profiles
  for each row execute function public.guard_last_admin();

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

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Admins see and edit everything. Everyone else is confined to the plants in
-- their `allowed_plants` grant — including reads, so a plant manager cannot see
-- another plant's numbers. Anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
alter table public.plants   enable row level security;
alter table public.profiles enable row level security;
alter table public.revenue  enable row level security;
alter table public.entries  enable row level security;

-- Plants: the reference list is readable by anyone signed in; it is only ever
-- changed by running this script.
drop policy if exists "plants readable by authenticated" on public.plants;
create policy "plants readable by authenticated"
  on public.plants for select to authenticated using (true);

-- Profiles: you can always read your own; admins read and manage everyone.
drop policy if exists "profiles readable by self or admin" on public.profiles;
create policy "profiles readable by self or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles writable by admin" on public.profiles;
create policy "profiles writable by admin"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles deletable by admin" on public.profiles;
create policy "profiles deletable by admin"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- Revenue and entries: scoped to the plants the user has been granted.
drop policy if exists "revenue readable by authenticated" on public.revenue;
drop policy if exists "revenue writable by authenticated" on public.revenue;
drop policy if exists "revenue scoped to granted plants" on public.revenue;
create policy "revenue scoped to granted plants"
  on public.revenue for all to authenticated
  using (public.can_access_plant(plant))
  with check (public.can_access_plant(plant));

drop policy if exists "entries readable by authenticated" on public.entries;
drop policy if exists "entries writable by authenticated" on public.entries;
drop policy if exists "entries scoped to granted plants" on public.entries;
create policy "entries scoped to granted plants"
  on public.entries for all to authenticated
  using (public.can_access_plant(plant))
  with check (public.can_access_plant(plant));

-- ---------------------------------------------------------------------------
-- Retire Udupi
-- The plant no longer exists. This clears it out of a database that was set up
-- before it was removed; on a fresh database these statements match nothing.
-- Child rows go first, because both reference plants(name).
-- ---------------------------------------------------------------------------
delete from public.entries where plant = 'Udupi';
delete from public.revenue where plant = 'Udupi';
delete from public.plants  where name  = 'Udupi';

-- ---------------------------------------------------------------------------
-- Convenience view used by the dashboard and the Google Sheet export
-- ---------------------------------------------------------------------------
-- security_invoker keeps the view subject to the caller's RLS, so it cannot be
-- used as a way around the plant scoping above.
create or replace view public.entries_full
with (security_invoker = true) as
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
