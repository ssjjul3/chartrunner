-- ChartRunner — v1.0.752 — unified cross-register name namespace
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
--
-- Goal: a name may exist only ONCE across BOTH registers (off-chain account
-- usernames AND on-chain runner handles), so every player is findable by a
-- unique name. This one table is the authority; its primary key is the global
-- uniqueness guarantee. The client (crNames) talks to the RPCs below only.

-- 1) The namespace table -------------------------------------------------------
create table if not exists public.cr_names (
  name_lc    text primary key,                 -- lowercased name = the unique key
  name       text not null,                     -- as originally entered (display)
  kind       text not null check (kind in ('offchain','onchain')),
  owner      text,                              -- auth uid (offchain) or wallet (onchain)
  created_at timestamptz not null default now()
);

-- Fast prefix search on the lowercased name.
create index if not exists cr_names_lc_prefix on public.cr_names (name_lc text_pattern_ops);

-- RLS on; no direct table access — everything goes through the RPCs below.
alter table public.cr_names enable row level security;

-- 2) Availability: free in the whole namespace? --------------------------------
create or replace function public.cr_name_available(p_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.cr_names where name_lc = lower(trim(p_name)));
$$;

-- 3) Reserve a name. Returns true if reserved, false if already taken. ----------
--    The primary key makes this race-safe: a concurrent claim gets false.
create or replace function public.cr_name_reserve(p_name text, p_kind text, p_owner text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lc text := lower(trim(p_name));
begin
  if v_lc !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  if p_kind not in ('offchain','onchain') then
    return false;
  end if;
  insert into public.cr_names (name_lc, name, kind, owner)
  values (v_lc, trim(p_name), p_kind, nullif(p_owner, ''))
  on conflict (name_lc) do nothing;
  return found;   -- true only when THIS call inserted the row
end;
$$;

-- 4) Release a name (owner-only, optional — for renames / account deletion). ----
create or replace function public.cr_name_release(p_name text, p_owner text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lc text := lower(trim(p_name));
begin
  delete from public.cr_names where name_lc = v_lc and owner = p_owner;
  return found;
end;
$$;

-- 5) Is this name already owned by THIS owner? (lets a wallet re-claim its own
--    handle after abandoning a claim; keeps re-signup idempotent.) --------------
create or replace function public.cr_name_owned_by(p_name text, p_owner text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cr_names
    where name_lc = lower(trim(p_name)) and owner is not distinct from nullif(p_owner, '')
  );
$$;

-- 6) Search names (case-insensitive). Underscores in the query are escaped so a
--    literal "_" doesn't act as a LIKE wildcard. Only ON-CHAIN owners (wallet
--    addresses, already public) are returned; off-chain owner uids are hidden.
create or replace function public.cr_search_names(p_query text)
returns table(name text, kind text, owner text)
language sql
security definer
set search_path = public
as $$
  select name, kind,
         case when kind = 'onchain' then owner else null end as owner
  from public.cr_names
  where p_query is null or trim(p_query) = ''
     or name_lc like replace(replace(lower(trim(p_query)),'\','\\'),'_','\_') || '%' escape '\'
     or name_lc like '%' || replace(replace(lower(trim(p_query)),'\','\\'),'_','\_') || '%' escape '\'
  order by (name_lc = lower(trim(p_query))) desc, name_lc
  limit 50;
$$;

-- 6) Let the anon + authenticated roles CALL the functions (not the table). -----
grant execute on function public.cr_name_available(text)              to anon, authenticated;
grant execute on function public.cr_name_reserve(text, text, text)    to anon, authenticated;
grant execute on function public.cr_name_release(text, text)          to anon, authenticated;
grant execute on function public.cr_name_owned_by(text, text)         to anon, authenticated;
grant execute on function public.cr_search_names(text)                to anon, authenticated;

-- 7) OPTIONAL backfill: reserve every existing account username so old accounts
--    keep their name. Runs once; harmless to re-run.
insert into public.cr_names (name_lc, name, kind, owner)
select lower(runner_name), runner_name, 'offchain', id::text
from public.profiles
where runner_name is not null
  and lower(runner_name) ~ '^[a-z0-9_]{3,20}$'
on conflict (name_lc) do nothing;
