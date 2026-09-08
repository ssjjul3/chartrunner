/**
 * ChartRunner — ownership migration checks (Auftrag „Ownership A · Server", Tests 1–3).
 *
 * Runs chartrunner_ownership_migration.sql against a REAL Postgres and then
 * tries to break it. A regex over the SQL text would only prove that a word is
 * written down; these checks prove the database refuses. That difference is the
 * whole point of the register: „Doku ist keine Messung".
 *
 * Needs DATABASE_URL (CI provides a postgres service; locally point it at any
 * throwaway cluster). Without it this script FAILS — it never reports success
 * for checks it did not run.
 *
 * The Supabase pieces the migration leans on (roles anon/authenticated/
 * service_role, schema auth, auth.users, auth.uid()) are recreated below, and
 * auth.uid() reads the same GUC PostgREST sets, so `set local
 * request.jwt.claim.sub` is exactly "this request carries that user's JWT".
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = path.join(ROOT, 'chartrunner_ownership_migration.sql');
const DB = process.env.DATABASE_URL || '';

if (!DB) {
  console.error('FAIL: DATABASE_URL is not set — the ownership migration was NOT checked.');
  console.error('      CI runs a postgres service; locally: DATABASE_URL=postgres://... node scripts/check_ownership_migration.mjs');
  process.exit(1);
}

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const WALLET = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

function psql(sql) {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-A', '-t', '-f', '-'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function psqlFile(file) {
  return execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', file],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}
/** Run SQL that must FAIL; returns the error text. Throws if it succeeded. */
function psqlExpectError(sql) {
  try {
    psql(sql);
  } catch (e) {
    return String((e && e.stderr) || '');
  }
  throw new Error('expected this SQL to be refused, but it went through:\n' + sql.trim());
}
/** As a signed-in user (or nobody, when uid is null). */
function asUser(uid, sql) {
  return 'begin;\nset local role authenticated;\n' +
    (uid ? `set local request.jwt.claim.sub = '${uid}';\n` : '') + sql + '\ncommit;\n';
}

const checks = [];
function test(name, fn) { checks.push({ name, fn }); }
function eq(actual, expected, what) {
  const a = String(actual).trim(), b = String(expected).trim();
  if (a !== b) throw new Error((what || 'value') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

/* ── 0) Supabase-shaped harness + the migration itself ────────────────────── */

psql(`
  drop schema if exists public cascade;
  create schema public;
  create schema if not exists auth;
  do $harness$
  begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end
  $harness$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  create table if not exists auth.users (id uuid primary key, email text);
  create or replace function auth.uid() returns uuid language sql stable as $u$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $u$;
  insert into auth.users (id, email) values ('${ALICE}', 'alice@example.invalid'), ('${BOB}', 'bob@example.invalid')
    on conflict do nothing;
`);

// Twice, because the migration promises to be re-runnable in the SQL editor.
psqlFile(MIGRATION);
psqlFile(MIGRATION);

// Supabase hands anon/authenticated table privileges by default; RLS — not a
// missing GRANT — is what has to stop them. Mirror that, or the RLS checks
// below would pass for the wrong reason.
psql(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;`);

function reset() {
  psql(`delete from public.cr_ownership; delete from public.cr_loadout; delete from public.cr_wallet_link;`);
}
const rows = (where) => psql(`select count(*) from public.cr_ownership ${where || ''};`);

/* ── 1) The claim RPC cannot mint a verified row ──────────────────────────── */

for (const p of ['purchase_onchain', 'subscription', 'grant', 'starter']) {
  test(`claim with provenance '${p}' → exception, no row`, () => {
    const err = psqlExpectError(asUser(ALICE,
      `select public.cr_ownership_claim('account', '${ALICE}', 'tier', 'pro', '${p}');`));
    if (!/server-only/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
    eq(rows(), '0', 'rows after a refused claim');
  });
}

test('claim with a made-up provenance → exception, no row', () => {
  const err = psqlExpectError(asUser(ALICE, `select public.cr_ownership_claim('account', '${ALICE}', 'tier', 'pro', 'free_because_i_said_so');`));
  if (!/server-only/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
  eq(rows(), '0');
});

test("claim 'campaign' for yourself → one row, verified = FALSE", () => {
  eq(psql(asUser(ALICE, `select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'campaign');`)), 't', 'claim result');
  eq(psql(`select provenance || '/' || verified from public.cr_ownership;`), 'campaign/false', 'stored row');
});

test('claiming the same item twice → false the second time, still one row', () => {
  psql(asUser(ALICE, `select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'softcurrency');`));
  eq(psql(asUser(ALICE, `select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'softcurrency');`)), 'f');
  eq(rows(), '1');
});

/* ── 2) The claim RPC cannot write to someone else's identity ─────────────── */

test("claim on a FOREIGN owner_id → exception, no row", () => {
  const err = psqlExpectError(asUser(BOB, `select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'campaign');`));
  if (!/does not own identity/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
  eq(rows(), '0');
});

test('claim with NO JWT at all → exception, no row', () => {
  const err = psqlExpectError(asUser(null, `select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'campaign');`));
  if (!/does not own identity/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
  eq(rows(), '0');
});

test('claim for a WALLET you have not linked → exception; after the link → row', () => {
  const err = psqlExpectError(asUser(ALICE, `select public.cr_ownership_claim('wallet', '${WALLET}', 'bot', 'det_ccv', 'campaign');`));
  if (!/does not own identity/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
  eq(rows(), '0');
  // Only the worker (service role) writes this row — here we stand in for it.
  psql(`insert into public.cr_wallet_link (wallet, uid) values ('${WALLET}', '${ALICE}');`);
  eq(psql(asUser(ALICE, `select public.cr_ownership_claim('wallet', '${WALLET}', 'bot', 'det_ccv', 'campaign');`)), 't');
  eq(rows(`where owner_kind = 'wallet'`), '1');
});

/* ── 3) A verified row is never downgraded ────────────────────────────────── */

test('an existing verified = true row survives a claim untouched', () => {
  psql(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified, evidence)
        values ('account', '${ALICE}', 'tier', 'pro', 'purchase_onchain', true, '{"signature":"sig1"}');`);
  eq(psql(asUser(ALICE, `select public.cr_ownership_claim('account', '${ALICE}', 'tier', 'pro', 'softcurrency');`)), 'f', 'claim must report it inserted nothing');
  eq(psql(`select provenance || '/' || verified from public.cr_ownership;`), 'purchase_onchain/true', 'the row after the claim');
  eq(psql(`select evidence->>'signature' from public.cr_ownership;`), 'sig1', 'evidence after the claim');
});

/* ── the constraint behind the rule ───────────────────────────────────────── */

test('a campaign row with verified = true is refused by the TABLE itself', () => {
  const err = psqlExpectError(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
                               values ('account', '${ALICE}', 'bot', 'det_ccv', 'campaign', true);`);
  if (!/cr_ownership_verified_provenance/.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
  eq(rows(), '0');
});

test('softcurrency + verified = true is refused too', () => {
  psqlExpectError(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
                   values ('account', '${ALICE}', 'gear', 'magnet', 'softcurrency', true);`);
  eq(rows(), '0');
});

test('an unknown provenance or item_kind is refused by the TABLE itself', () => {
  psqlExpectError(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance)
                   values ('account', '${ALICE}', 'bot', 'x', 'because_i_said_so');`);
  psqlExpectError(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance)
                   values ('account', '${ALICE}', 'spaceship', 'x', 'campaign');`);
  eq(rows(), '0');
});

/* ── the read path ────────────────────────────────────────────────────────── */

test('list returns YOUR rows, and the empty set for a foreign identity', () => {
  psql(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
        values ('account', '${ALICE}', 'tier', 'pro', 'grant', true);`);
  eq(psql(asUser(ALICE, `select count(*) from public.cr_ownership_list('account', '${ALICE}');`)), '1', 'own rows');
  eq(psql(asUser(BOB, `select count(*) from public.cr_ownership_list('account', '${ALICE}');`)), '0', 'foreign rows');
  eq(psql(asUser(null, `select count(*) from public.cr_ownership_list('account', '${ALICE}');`)), '0', 'rows without a JWT');
});

test('list never hands out the evidence column', () => {
  const cols = psql(`select string_agg(p.parameter_name, ',' order by p.ordinal_position)
                     from information_schema.parameters p
                     join information_schema.routines r on r.specific_name = p.specific_name
                     where r.routine_name = 'cr_ownership_list' and p.parameter_mode = 'OUT';`);
  if (/evidence/.test(cols)) throw new Error('cr_ownership_list returns evidence: ' + cols);
});

/* ── direct table access ──────────────────────────────────────────────────── */

test('RLS: a signed-in user reads, writes and deletes NOTHING directly', () => {
  // The row the console attacker wants: unverified, and one UPDATE away from
  // being an asset. Under RLS without a policy the read is empty, the insert
  // raises, and the update/delete quietly touch zero rows — so this check reads
  // the row back afterwards instead of trusting "no error" either way.
  psql(`insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
        values ('account', '${ALICE}', 'bot', 'det_ccv', 'campaign', false);`);
  eq(psql(asUser(ALICE, `select count(*) from public.cr_ownership;`)), '0', 'direct select under RLS');
  psqlExpectError(asUser(ALICE, `insert into public.cr_ownership (owner_kind, owner_id, item_kind, item_id, provenance, verified)
                                 values ('account', '${ALICE}', 'tier', 'elite', 'grant', true);`));
  psql(asUser(ALICE, `update public.cr_ownership set verified = true, provenance = 'purchase_onchain';`));
  psql(asUser(ALICE, `delete from public.cr_ownership;`));
  eq(psql(`select provenance || '/' || verified from public.cr_ownership;`), 'campaign/false', 'the row after a direct update + delete attempt');
  eq(rows(), '1', 'the seeded row is still the only one');
});

test('RLS is enabled on all three tables', () => {
  eq(psql(`select string_agg(relname || '=' || relrowsecurity::text, ',' order by relname)
           from pg_class where relname in ('cr_ownership','cr_loadout','cr_wallet_link');`),
     'cr_loadout=true,cr_ownership=true,cr_wallet_link=true');
});

test('no policy exists on any of the three tables', () => {
  eq(psql(`select count(*) from pg_policies where schemaname = 'public'
           and tablename in ('cr_ownership','cr_loadout','cr_wallet_link');`), '0');
});

test('anon may not call the claim RPC at all', () => {
  const err = psqlExpectError(`begin; set local role anon; select public.cr_ownership_claim('account', '${ALICE}', 'bot', 'det_ccv', 'campaign'); commit;`);
  if (!/permission denied/i.test(err)) throw new Error('wrong error: ' + err.split('\n')[0]);
});

test('nobody may call the internal owner check directly', () => {
  for (const role of ['anon', 'authenticated']) {
    const err = psqlExpectError(`begin; set local role ${role}; select public.cr_owner_is_caller('account', '${ALICE}'); commit;`);
    if (!/permission denied/i.test(err)) throw new Error(role + ': ' + err.split('\n')[0]);
  }
});

/* ── loadout ──────────────────────────────────────────────────────────────── */

test('loadout: set + get round-trip for the owner', () => {
  psql(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '{"bots":["det_sfp"]}'::jsonb);`));
  eq(psql(asUser(ALICE, `select data::text from public.cr_loadout_get('account', '${ALICE}');`)), '{"bots": ["det_sfp"]}');
});

test('loadout: a foreign identity cannot write, and reads the empty set', () => {
  psql(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '{"bots":["det_sfp"]}'::jsonb);`));
  psqlExpectError(asUser(BOB, `select public.cr_loadout_set('account', '${ALICE}', '{"bots":[]}'::jsonb);`));
  eq(psql(asUser(BOB, `select count(*) from public.cr_loadout_get('account', '${ALICE}');`)), '0');
  eq(psql(`select data::text from public.cr_loadout;`), '{"bots": ["det_sfp"]}', 'the owner\'s loadout is untouched');
});

test('loadout: a get with no row yet returns ZERO rows, not an empty object', () => {
  eq(psql(asUser(ALICE, `select count(*) from public.cr_loadout_get('account', '${ALICE}');`)), '0');
});

test('loadout: a stale writer loses against a newer row (updated_at tiebreaker)', () => {
  psql(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '{"v":"new"}'::jsonb);`));
  psql(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '{"v":"stale"}'::jsonb, now() - interval '1 hour');`));
  eq(psql(`select data->>'v' from public.cr_loadout;`), 'new', 'the stale write must not win');
  psql(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '{"v":"forced"}'::jsonb);`));
  eq(psql(`select data->>'v' from public.cr_loadout;`), 'forced', 'a write without a version still wins');
});

test('loadout: a non-object payload is refused', () => {
  psqlExpectError(asUser(ALICE, `select public.cr_loadout_set('account', '${ALICE}', '[1,2]'::jsonb);`));
  eq(psql(`select count(*) from public.cr_loadout;`), '0');
});

/* ── wallet link ──────────────────────────────────────────────────────────── */

test('cr_wallet_link: one account per wallet, and it dies with the account', () => {
  psql(`insert into public.cr_wallet_link (wallet, uid) values ('${WALLET}', '${ALICE}');`);
  psqlExpectError(`insert into public.cr_wallet_link (wallet, uid) values ('${WALLET}', '${BOB}');`);
  psql(`insert into auth.users (id, email) values ('33333333-3333-4333-8333-333333333333', 't@x.invalid');
        insert into public.cr_wallet_link (wallet, uid) values ('${WALLET.slice(0, -1)}A', '33333333-3333-4333-8333-333333333333');
        delete from auth.users where id = '33333333-3333-4333-8333-333333333333';`);
  eq(psql(`select count(*) from public.cr_wallet_link;`), '1', 'the deleted account\'s link is gone');
  psql(`delete from auth.users where id not in ('${ALICE}','${BOB}');`);
});

/* ── runner ───────────────────────────────────────────────────────────────── */

let failures = 0;
for (const c of checks) {
  reset();
  try {
    c.fn();
    console.log('  ok   ' + c.name);
  } catch (e) {
    failures++;
    console.error('  FAIL ' + c.name + '\n       ' + String((e && e.message) || e).split('\n').slice(0, 3).join('\n       '));
  }
}
reset();
console.log('\nownership migration: ' + (checks.length - failures) + '/' + checks.length + ' checks passed, ' + failures + ' UNGETESTET/rot');
if (failures) process.exit(1);
