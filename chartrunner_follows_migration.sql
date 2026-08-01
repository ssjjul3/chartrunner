-- ChartRunner — v1.0.767 — Wallet Intel Batch 2: Supabase follow graph
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE (idempotent).
--
-- Goal: turn the local Wallet Intel follow list (localStorage cr_wl_intel_v1)
-- into a real, cross-device network. Each user's follows live in one owner-
-- private table; the ONLY things that cross the user boundary are the follower
-- COUNTS (a public signal — a number, never an identity). The client
-- (crWalletIntel) talks to the RPCs below only:
--   cr_follows_upsert / cr_follows_delete / cr_follows_list  → owner-scoped
--   cr_follows_count                                         → public (guests too)

-- 1) The follow table ----------------------------------------------------------
--    One row = "owner follows addr". Owner-private (see RLS below). Hangs off
--    auth.users so ACCOUNT DELETION (Block C) removes a user's follows too.
create table if not exists public.cr_follows (
  owner      uuid        not null references auth.users(id) on delete cascade,
  addr       text        not null,                    -- followed wallet (base58)
  name       text,                                    -- cached display name (optional)
  watch      boolean     not null default false,      -- ⏰ activity watch flag
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner, addr)                           -- one follow per (owner, wallet)
);

-- Follower-count lookups scan by addr across all owners.
create index if not exists cr_follows_addr_idx on public.cr_follows (addr);

-- 2) RLS: owner-private. A signed-in user sees/manages ONLY their own rows via
--    the client (`select * from cr_follows` returns just theirs). Cross-user
--    reads (the follower count) go exclusively through the SECURITY DEFINER RPC
--    below, which bypasses RLS and never exposes identities.
alter table public.cr_follows enable row level security;

drop policy if exists cr_follows_owner_rw on public.cr_follows;
create policy cr_follows_owner_rw on public.cr_follows
  for all
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 3) Upsert a follow for the CALLER (owner derived from the JWT, never a param,
--    so you can only ever write your own follows). An empty p_name never
--    clobbers an existing cached name.
create or replace function public.cr_follows_upsert(p_addr text, p_name text default '', p_watch boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_addr  text := trim(coalesce(p_addr, ''));
begin
  if v_owner is null or v_addr = '' then
    return false;
  end if;
  insert into public.cr_follows (owner, addr, name, watch)
  values (v_owner, v_addr, nullif(trim(coalesce(p_name, '')), ''), coalesce(p_watch, false))
  on conflict (owner, addr) do update
    set name       = coalesce(nullif(trim(coalesce(excluded.name, '')), ''), public.cr_follows.name),
        watch      = excluded.watch,
        updated_at = now();
  return true;
end;
$$;

-- 4) Delete one of the caller's follows (owner-scoped). ------------------------
create or replace function public.cr_follows_delete(p_addr text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    return false;
  end if;
  delete from public.cr_follows
  where owner = v_owner and addr = trim(coalesce(p_addr, ''));
  return found;
end;
$$;

-- 5) List the caller's follows (owner-scoped). Shape matches the client mapper:
--    { addr, name, watch, created_at }. Newest first.
create or replace function public.cr_follows_list()
returns table(addr text, name text, watch boolean, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select addr, name, watch, created_at
  from public.cr_follows
  where owner = auth.uid()
  order by created_at desc;
$$;

-- 6) PUBLIC follower count for a wallet — the network signal. Works signed-out
--    (anon). Counts rows across all owners; exposes the number only, never who.
create or replace function public.cr_follows_count(p_addr text)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.cr_follows
  where addr = trim(coalesce(p_addr, ''));
$$;

-- 7) Let the roles CALL the functions (not the table). Owner-scoped writes/reads
--    are authenticated-only; the follower count is public (anon + authenticated).
grant execute on function public.cr_follows_upsert(text, text, boolean) to authenticated;
grant execute on function public.cr_follows_delete(text)                to authenticated;
grant execute on function public.cr_follows_list()                      to authenticated;
grant execute on function public.cr_follows_count(text)                 to anon, authenticated;
