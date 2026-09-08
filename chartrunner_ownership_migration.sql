-- ChartRunner — Ownership Register (Auftrag „Ownership A · Server")
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE (idempotent).
--
-- WHY THIS EXISTS
-- Ownership and loadout are today authoritative in the browser's localStorage
-- (cr_owned_bots_v1, cr_owned_gear_v1, cr_equipped_*). Anyone can type into the
-- console what they own. As long as that is the only record, the server can
-- verify NOTHING for a paid unlock, a tournament prize or a marketplace sale.
--
-- The register below does not pretend to fix that by trusting the client more.
-- It splits the record in two and says which half is which:
--
--   provenance          verified   who may write it
--   ------------------  ---------  --------------------------------------------
--   starter             true       server (a rule, needs no evidence)
--   purchase_onchain    true       ownership worker ONLY, after checking a Solana tx
--   subscription        true       ownership worker ONLY, after checking the sub
--   grant               true       ownership worker ONLY, admin secret
--   campaign            FALSE      the client may claim it
--   softcurrency        FALSE      the client may claim it
--
-- THE RULE THE WHOLE THING CARRIES: only `verified = true` may ever open a
-- feature that touches real money (tournament entry, prize payout, marketplace
-- sale, paid tier). Campaign progress and $RUN purchases stay fully valid for
-- gameplay and cosmetics — they are simply not treated as an asset. That cut is
-- deliberate: server-validated gameplay would cost a multiple and buys nothing
-- for cosmetics.
--
-- Two identities are equally valid, exactly like the cr_names register:
-- owner_kind ∈ ('account','wallet'). A Supabase account (auth uid) and a wallet
-- are both owners; a player with both can link them (cr_wallet_link, written by
-- the worker only, after an Ed25519 signature check). No account is forced.
--
-- The client NEVER touches these tables — RLS is on and there is no policy for
-- anon/authenticated. Everything goes through the RPCs at the bottom, and the
-- only client-callable WRITE (cr_ownership_claim) can produce nothing but
-- verified = false rows.

-- 1) The registers -------------------------------------------------------------

--    One row = "this owner holds this item, and here is where it came from".
create table if not exists public.cr_ownership (
  owner_kind text        not null check (owner_kind in ('account','wallet')),
  owner_id   text        not null,                 -- auth uid as text, or wallet base58
  item_kind  text        not null check (item_kind in ('bot','gear','skin','tier')),
  item_id    text        not null,                 -- e.g. 'det_ccv', 'magnet'
  provenance text        not null check (provenance in
               ('starter','purchase_onchain','subscription','grant','campaign','softcurrency')),
  verified   boolean     not null default false,
  evidence   jsonb,                                -- tx signature / stripe id / reason
  created_at timestamptz not null default now(),
  primary key (owner_kind, owner_id, item_kind, item_id)
);

--    The verified/provenance pairing is a CONSTRAINT, not a convention. Without
--    it the rule lives only in the RPC and in the worker, and a single careless
--    service-role write (which bypasses RLS *and* the RPCs) could mint a
--    verified campaign row. Added in a DO block so re-running is safe.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cr_ownership_verified_provenance'
      and conrelid = 'public.cr_ownership'::regclass
  ) then
    alter table public.cr_ownership
      add constraint cr_ownership_verified_provenance
      check (provenance in ('starter','purchase_onchain','subscription','grant')
             or verified = false);
  end if;
end
$$;

--    Sync, NOT authority: what the player has equipped. Last writer wins, with
--    updated_at as the tiebreaker (see cr_loadout_set).
create table if not exists public.cr_loadout (
  owner_kind text        not null check (owner_kind in ('account','wallet')),
  owner_id   text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_kind, owner_id)
);

--    Wallet ↔ account. Written by the ownership worker ONLY, after it verified
--    an Ed25519 signature over a nonce+domain+wallet+uid message. Hangs off
--    auth.users so deleting an account drops the link too.
create table if not exists public.cr_wallet_link (
  wallet    text        primary key,               -- base58, one account per wallet
  uid       uuid        not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now()
);
create index if not exists cr_wallet_link_uid_idx on public.cr_wallet_link (uid);

-- 2) RLS: on, with NO policies. -----------------------------------------------
--    anon and authenticated therefore reach exactly nothing directly; the RPCs
--    below (security definer) are the only door, and the worker's service-role
--    key is the only key that opens the table itself.
alter table public.cr_ownership   enable row level security;
alter table public.cr_loadout     enable row level security;
alter table public.cr_wallet_link enable row level security;

-- 3) "Is this identity the caller's?" -----------------------------------------
--    account → the uid from the JWT must match. wallet → the wallet must be
--    linked to the uid from the JWT. Anything else (including a missing JWT)
--    is false. Not client-callable: it is a building block, not an endpoint.
create or replace function public.cr_owner_is_caller(p_owner_kind text, p_owner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when p_owner_kind = 'account' then trim(coalesce(p_owner_id, '')) = auth.uid()::text
    when p_owner_kind = 'wallet'  then exists (
      select 1 from public.cr_wallet_link
      where wallet = trim(coalesce(p_owner_id, '')) and uid = auth.uid()
    )
    else false
  end;
$$;

-- 4) Read your own ownership. -------------------------------------------------
--    A caller who is not the owner gets the EMPTY SET — never someone else's
--    row. `evidence` is not returned: a tx signature or a Stripe id has no
--    business travelling to a game client that only needs to know what it owns.
create or replace function public.cr_ownership_list(p_owner_kind text, p_owner_id text)
returns table(item_kind text, item_id text, provenance text, verified boolean, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.item_kind, o.item_id, o.provenance, o.verified, o.created_at
  from public.cr_ownership o
  where public.cr_owner_is_caller(p_owner_kind, p_owner_id)
    and o.owner_kind = p_owner_kind
    and o.owner_id   = trim(coalesce(p_owner_id, ''))
  order by o.created_at;
$$;

-- 5) The ONLY client-callable write. ------------------------------------------
--    It can produce nothing but verified = false, and only for the two
--    provenances the client is allowed to assert. Everything else raises —
--    loudly, with 42501 (insufficient_privilege), because a silent false would
--    look like a full disk or a typo. An existing row is never touched, so a
--    verified = true row can never be downgraded by a claim.
create or replace function public.cr_ownership_claim(
  p_owner_kind text,
  p_owner_id   text,
  p_item_kind  text,
  p_item_id    text,
  p_provenance text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text := trim(coalesce(p_owner_id, ''));
  v_item  text := trim(coalesce(p_item_id, ''));
begin
  if coalesce(p_provenance, '') not in ('campaign','softcurrency') then
    raise exception 'cr_ownership_claim: provenance % is server-only — the client may claim campaign/softcurrency only', coalesce(p_provenance, '(null)')
      using errcode = '42501';
  end if;

  if not public.cr_owner_is_caller(p_owner_kind, v_owner) then
    raise exception 'cr_ownership_claim: caller does not own identity %/%', coalesce(p_owner_kind, '(null)'), v_owner
      using errcode = '42501';
  end if;

  if v_item = '' then
    raise exception 'cr_ownership_claim: item_id is empty' using errcode = '22023';
  end if;

  insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
  values (p_owner_kind, v_owner, p_item_kind, v_item, p_provenance, false)
  on conflict (owner_kind, owner_id, item_kind, item_id) do nothing;

  return found;   -- true only when THIS call inserted the row
end;
$$;

-- 6) Loadout sync (owner-bound). ----------------------------------------------
--    Zero rows means "no loadout stored yet" — that is an answer. It is NOT
--    dressed up as an empty object, because an empty object is a loadout.
create or replace function public.cr_loadout_get(p_owner_kind text, p_owner_id text)
returns table(data jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.data, l.updated_at
  from public.cr_loadout l
  where public.cr_owner_is_caller(p_owner_kind, p_owner_id)
    and l.owner_kind = p_owner_kind
    and l.owner_id   = trim(coalesce(p_owner_id, ''));
$$;

--    Last writer wins. p_updated_at is the version the caller believes it is
--    overwriting: pass the updated_at it last read and a STALER write loses
--    against a newer row instead of silently clobbering another device. Pass
--    null to force. Either way the winning row's updated_at comes back, so the
--    caller can see whether it won.
create or replace function public.cr_loadout_set(
  p_owner_kind text,
  p_owner_id   text,
  p_data       jsonb,
  p_updated_at timestamptz default null
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text := trim(coalesce(p_owner_id, ''));
  v_now   timestamptz;
begin
  if not public.cr_owner_is_caller(p_owner_kind, v_owner) then
    raise exception 'cr_loadout_set: caller does not own identity %/%', coalesce(p_owner_kind, '(null)'), v_owner
      using errcode = '42501';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'cr_loadout_set: data must be a json object' using errcode = '22023';
  end if;

  insert into public.cr_loadout (owner_kind, owner_id, data, updated_at)
  values (p_owner_kind, v_owner, p_data, now())
  on conflict (owner_kind, owner_id) do update
    set data       = excluded.data,
        updated_at = now()
    where p_updated_at is null or p_updated_at >= public.cr_loadout.updated_at;

  select l.updated_at into v_now
  from public.cr_loadout l
  where l.owner_kind = p_owner_kind and l.owner_id = v_owner;

  return v_now;
end;
$$;

-- 7) Who may CALL what. --------------------------------------------------------
--    Postgres grants EXECUTE to PUBLIC by default, which would hand `anon` a
--    security-definer function. Revoke first, then hand out on purpose.
--    cr_owner_is_caller stays internal — it is called from inside the RPCs.
revoke execute on function public.cr_owner_is_caller(text, text)                      from public;
revoke execute on function public.cr_ownership_list(text, text)                       from public;
revoke execute on function public.cr_ownership_claim(text, text, text, text, text)    from public;
revoke execute on function public.cr_loadout_get(text, text)                           from public;
revoke execute on function public.cr_loadout_set(text, text, jsonb, timestamptz)       from public;

grant execute on function public.cr_ownership_list(text, text)                    to authenticated, service_role;
grant execute on function public.cr_ownership_claim(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.cr_loadout_get(text, text)                        to authenticated, service_role;
grant execute on function public.cr_loadout_set(text, text, jsonb, timestamptz)    to authenticated, service_role;

-- 8) Und das, was `revoke ... from public` NICHT erwischt. --------------------
--    Supabase setzt `ALTER DEFAULT PRIVILEGES`, das EXECUTE auf neu angelegte
--    Funktionen in `public` direkt an `anon` und `authenticated` vergibt. Der
--    Zuschuss geht an die Rollen, nicht an PUBLIC — Schritt 7 entfernt ihn also
--    nicht, und nach dem ersten Lauf konnte `anon` alle fünf RPCs aufrufen.
--    Abgelehnt hätten die Funktionen ihn trotzdem (sie prüfen `auth.uid()`
--    selbst), aber die zweite Schicht fehlte. In blankem Postgres (CI) gibt es
--    diese Default-Privileges nicht, deshalb kam der Fall dort nie vor.
--    Identisch in `chartrunner_ownership_revoke_anon_migration.sql`, dem
--    Nachtrag für die bereits laufende Datenbank.
revoke execute on function public.cr_owner_is_caller(text, text)                   from anon, authenticated;
revoke execute on function public.cr_ownership_list(text, text)                    from anon;
revoke execute on function public.cr_ownership_claim(text, text, text, text, text) from anon;
revoke execute on function public.cr_loadout_get(text, text)                       from anon;
revoke execute on function public.cr_loadout_set(text, text, jsonb, timestamptz)   from anon;
