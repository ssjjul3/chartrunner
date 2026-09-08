/**
 * ChartRunner — ownership worker checks (Auftrag „Ownership A · Server", Tests 4–7).
 *
 * Runs the real worker module against a stubbed network: a fake Supabase (auth
 * + PostgREST + RPC), a fake Solana RPC and a fake Stripe. No secrets, no
 * deploy, no wrangler — `node scripts/check_ownership_worker.mjs`.
 *
 * Every check here exists because its opposite would be silent in production:
 * a fabricated signature that mints a verified row, a nonce that outlives its
 * TTL, a register outage that answers "you own nothing", a service-role key in
 * a response body. The counter-proof for each (break the line, watch it go red)
 * is in the commit message — a green suite proves nothing on its own.
 */
import assert from 'node:assert/strict';
import worker, { linkMessage, NONCE_TTL_MS } from '../workers/ownership/src/index.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const SERVICE_KEY = 'sb_secret_SERVICE_ROLE_SENTINEL_do_not_leak';
const TREASURY = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // valid base58, 32 bytes
const STRANGER = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const b of bytes) { if (b === 0) out += '1'; else break; }
  return out + digits.reverse().map((d) => B58[d]).join('');
}

/* ── the stubbed world ────────────────────────────────────────────────────── */

let db, solana, stripe;
// Archives — these deliberately survive resetWorld(): the leak checks at the
// bottom look at EVERY response, header, outbound request and log line the
// whole suite produced, not just the last one.
const logs = [];
const sentTo = [];
const responses = [];

function resetWorld() {
  db = { ownership: [], links: [], loadout: [] };
  solana = { transactions: {}, down: false };
  stripe = { subscriptions: {} };
}
resetWorld();

const USERS = {
  'jwt-alice': { id: ALICE, email: 'alice@example.invalid' },
  'jwt-bob': { id: BOB, email: 'bob@example.invalid' },
};

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// The fake PostgREST enforces the SAME owner rule the migration enforces, so a
// worker that stopped forwarding the caller's JWT would fail these checks.
function callerUid(headers) {
  // Der Service-Schluessel wird auf `apikey` erkannt, NICHT auf Authorization —
  // so wie ein neuer sb_secret_-Schluessel bei Supabase ankommt. Stuende die
  // Erkennung weiter auf dem Bearer-Header, wuerde dieser Stub einen Worker
  // gruen durchlassen, den Supabase ablehnt.
  if ((headers.get('apikey') || '') === SERVICE_KEY) return { service: true, uid: null };
  const m = (headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  const tok = m ? m[1] : '';
  return { service: false, uid: USERS[tok] ? USERS[tok].id : null };
}
function ownerIsCaller(kind, id, uid) {
  if (!uid) return false;
  if (kind === 'account') return id === uid;
  return db.links.some((l) => l.wallet === id && l.uid === uid);
}

async function fakeFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  const headers = new Headers((init && init.headers) || (input.headers) || {});
  const method = (init && init.method) || (input.method) || 'GET';
  const body = init && init.body ? JSON.parse(init.body) : null;
  sentTo.push({ url, headers: Object.fromEntries(headers.entries()), body });

  if (url.startsWith('https://sb.test/auth/v1/user')) {
    const m = (headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
    const u = m && USERS[m[1]];
    return u ? jsonResponse(200, u) : jsonResponse(401, { error: 'bad token' });
  }

  if (url.startsWith('https://sb.test/rest/v1/rpc/')) {
    const fn = url.split('/rpc/')[1];
    const who = callerUid(headers);
    if (fn === 'cr_ownership_list') {
      const allowed = who.service || ownerIsCaller(body.p_owner_kind, body.p_owner_id, who.uid);
      if (!allowed) return jsonResponse(200, []); // the RPC's empty set for a foreign identity
      return jsonResponse(200, db.ownership
        .filter((r) => r.owner_kind === body.p_owner_kind && r.owner_id === body.p_owner_id)
        .map(({ item_kind, item_id, provenance, verified, created_at }) => ({ item_kind, item_id, provenance, verified, created_at })));
    }
    if (fn === 'cr_loadout_get') {
      if (!(who.service || ownerIsCaller(body.p_owner_kind, body.p_owner_id, who.uid))) return jsonResponse(200, []);
      return jsonResponse(200, db.loadout
        .filter((r) => r.owner_kind === body.p_owner_kind && r.owner_id === body.p_owner_id)
        .map(({ data, updated_at }) => ({ data, updated_at })));
    }
    if (fn === 'cr_loadout_set') {
      if (!(who.service || ownerIsCaller(body.p_owner_kind, body.p_owner_id, who.uid))) {
        return jsonResponse(403, { message: 'caller does not own identity' });
      }
      const at = new Date().toISOString();
      const row = db.loadout.find((r) => r.owner_kind === body.p_owner_kind && r.owner_id === body.p_owner_id);
      if (row) { row.data = body.p_data; row.updated_at = at; }
      else db.loadout.push({ owner_kind: body.p_owner_kind, owner_id: body.p_owner_id, data: body.p_data, updated_at: at });
      return jsonResponse(200, at);
    }
    return jsonResponse(404, { message: 'no such function' });
  }

  if (url.startsWith('https://sb.test/rest/v1/cr_wallet_link')) {
    if (method === 'GET') {
      const q = new URL(url).searchParams;
      const w = (q.get('wallet') || '').replace(/^eq\./, '');
      const uid = (q.get('uid') || '').replace(/^eq\./, '');
      return jsonResponse(200, db.links.filter((l) => (!w || l.wallet === w) && (!uid || l.uid === uid)));
    }
    db.links.push({ wallet: body.wallet, uid: body.uid });
    return new Response('', { status: 201 });
  }

  if (url.startsWith('https://sb.test/rest/v1/cr_ownership')) {
    if (method === 'GET') {
      const q = new URL(url).searchParams;
      const sig = (q.get('evidence->>signature') || '').replace(/^eq\./, '');
      return jsonResponse(200, db.ownership.filter((r) => r.evidence && r.evidence.signature === sig));
    }
    const i = db.ownership.findIndex((r) => r.owner_kind === body.owner_kind && r.owner_id === body.owner_id &&
      r.item_kind === body.item_kind && r.item_id === body.item_id);
    const row = { ...body, created_at: new Date().toISOString() };
    if (i >= 0) db.ownership[i] = row; else db.ownership.push(row);
    return new Response('', { status: 201 });
  }

  if (url.startsWith('https://rpc.test')) {
    if (solana.down) return new Response('upstream boom', { status: 503 });
    const sig = body.params[0];
    const tx = solana.transactions[sig];
    return jsonResponse(200, { jsonrpc: '2.0', id: 1, result: tx || null });
  }

  if (url.startsWith('https://api.stripe.com/v1/subscriptions/')) {
    const id = decodeURIComponent(url.split('/subscriptions/')[1].split('?')[0]);
    const sub = stripe.subscriptions[id];
    return sub ? jsonResponse(200, sub) : jsonResponse(404, { error: {} });
  }

  throw new Error('unstubbed fetch: ' + url);
}

function makeEnv(over) {
  return {
    SUPABASE_URL: 'https://sb.test',
    SUPABASE_ANON_KEY: 'anon-key-public',
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    OWNERSHIP_NONCE_SECRET: 'nonce-secret',
    OWNERSHIP_ADMIN_SECRET: 'admin-secret',
    OWNERSHIP_TREASURY: TREASURY,
    SOLANA_RPC_URL: 'https://rpc.test',
    OWNERSHIP_CATALOG_JSON: JSON.stringify({ 'tier:pro': { price_lamports: 1000 } }),
    OWNERSHIP_KILL: '0',
    ...(over || {}),
  };
}

/** Run one request through the worker; returns { status, body, text }. */
async function call(env, method, path, { token, body, headers } = {}) {
  const h = { 'Content-Type': 'application/json', ...(headers || {}) };
  if (token) h.Authorization = 'Bearer ' + token;
  const req = new Request('https://chartrunner.xyz' + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await worker.fetch(req, env);
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch (_) {}
  responses.push({ path, text, headers: res.headers });
  return { status: res.status, body: parsed, text, headers: res.headers };
}

/* ── the checks ───────────────────────────────────────────────────────────── */

let failures = 0;
function check(name, fn) { return { name, fn }; }
const CHECKS = [];
function test(name, fn) { CHECKS.push(check(name, fn)); }

/* Test 6 — reading someone else's ownership. */
test('list without a token → 401, and never a list', async () => {
  const r = await call(makeEnv(), 'GET', '/ownership/list?owner_kind=account&owner_id=' + ALICE);
  assert.equal(r.status, 401);
  assert.equal(r.body.items, undefined);
});

test('list with an invalid token → 401', async () => {
  const r = await call(makeEnv(), 'GET', '/ownership/list?owner_kind=account&owner_id=' + ALICE, { token: 'jwt-forged' });
  assert.equal(r.status, 401);
});

test('list with a valid token for a FOREIGN uid → empty', async () => {
  db.ownership.push({ owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'grant', verified: true, created_at: 'x' });
  const r = await call(makeEnv(), 'GET', '/ownership/list?owner_kind=account&owner_id=' + ALICE, { token: 'jwt-bob' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items, []);
});

test('list of your OWN fresh account → empty list, not an error (Abnahme)', async () => {
  const r = await call(makeEnv(), 'GET', '/ownership/list', { token: 'jwt-alice' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.items, []);
});

test('register outage → 502 with NO items field (an outage is not "you own nothing")', async () => {
  const env = makeEnv({ SUPABASE_URL: 'https://sb.test' });
  const real = globalThis.fetch;
  globalThis.fetch = async (u, i) => (String(u).includes('/rpc/') ? new Response('boom', { status: 500 }) : real(u, i));
  try {
    const r = await call(env, 'GET', '/ownership/list', { token: 'jwt-alice' });
    assert.equal(r.status, 502);
    assert.equal(r.body.items, undefined);
  } finally { globalThis.fetch = real; }
});

/* Test 5 — link-wallet. */
async function makeWallet() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  return { address: b58encode(raw), sign: async (msg) => new Uint8Array(await crypto.subtle.sign('Ed25519', kp.privateKey, new TextEncoder().encode(msg))) };
}

test('link-wallet: a correct signature links the wallet', async () => {
  const env = makeEnv();
  const w = await makeWallet();
  const ch = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'challenge', wallet: w.address } });
  assert.equal(ch.status, 200);
  assert.ok(ch.body.message.includes(w.address) && ch.body.message.includes('chartrunner.xyz') && ch.body.message.includes(ch.body.nonce));
  const sig = b58encode(await w.sign(ch.body.message));
  const v = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'verify', wallet: w.address, nonce: ch.body.nonce, signature: sig } });
  assert.equal(v.status, 200);
  assert.deepEqual(db.links, [{ wallet: w.address, uid: ALICE }]);
});

test('link-wallet: a WRONG signature → 403, no link', async () => {
  const env = makeEnv();
  const w = await makeWallet(), other = await makeWallet();
  const ch = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'challenge', wallet: w.address } });
  const sig = b58encode(await other.sign(ch.body.message)); // signed by the wrong key
  const v = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'verify', wallet: w.address, nonce: ch.body.nonce, signature: sig } });
  assert.equal(v.status, 403);
  assert.equal(v.body.error, 'signature_invalid');
  assert.deepEqual(db.links, []);
});

test('link-wallet: an EXPIRED nonce → 403, no link', async () => {
  const env = makeEnv();
  const w = await makeWallet();
  const ch = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'challenge', wallet: w.address } });
  const sig = b58encode(await w.sign(ch.body.message));
  const realNow = Date.now;
  Date.now = () => realNow() + NONCE_TTL_MS + 1000;
  try {
    const v = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'verify', wallet: w.address, nonce: ch.body.nonce, signature: sig } });
    assert.equal(v.status, 403);
    assert.equal(v.body.error, 'nonce_expired');
  } finally { Date.now = realNow; }
  assert.deepEqual(db.links, []);
});

test('link-wallet: a nonce minted for ANOTHER account cannot be replayed', async () => {
  const env = makeEnv();
  const w = await makeWallet();
  const ch = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'challenge', wallet: w.address } });
  const sig = b58encode(await w.sign(ch.body.message));
  // Bob captured Alice's challenge + signature and replays it under his own JWT.
  const v = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-bob', body: { action: 'verify', wallet: w.address, nonce: ch.body.nonce, signature: sig } });
  assert.equal(v.status, 403);
  assert.equal(v.body.error, 'nonce_uid_mismatch');
  assert.deepEqual(db.links, []);
});

test('link-wallet: a wallet already linked to another account → 409', async () => {
  const env = makeEnv();
  const w = await makeWallet();
  db.links.push({ wallet: w.address, uid: BOB });
  const ch = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'challenge', wallet: w.address } });
  const sig = b58encode(await w.sign(ch.body.message));
  const v = await call(env, 'POST', '/ownership/link-wallet', { token: 'jwt-alice', body: { action: 'verify', wallet: w.address, nonce: ch.body.nonce, signature: sig } });
  assert.equal(v.status, 409);
  assert.equal(db.links.length, 1);
});

/* Test 4 — grants. */
function txPaying(payer, recipient, lamports) {
  return {
    meta: { err: null, preBalances: [10_000_000, 0], postBalances: [10_000_000 - lamports, lamports] },
    transaction: { message: { accountKeys: [{ pubkey: payer, signer: true, writable: true }, { pubkey: recipient, signer: false, writable: true }] } },
  };
}

async function aliceWithWallet(env) {
  const w = await makeWallet();
  db.links.push({ wallet: w.address, uid: ALICE });
  return w;
}

test('grant purchase_onchain with a FABRICATED signature → 403, no row', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: '5'.repeat(88) } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'tx_not_found');
  assert.deepEqual(db.ownership, []);
  assert.ok(w.address);
});

test('grant purchase_onchain with a real tx but the WRONG AMOUNT → 403, no row', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const sig = 'A'.repeat(88);
  solana.transactions[sig] = txPaying(w.address, TREASURY, 999); // catalog says 1000
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'amount_too_low');
  assert.deepEqual(db.ownership, []);
});

test('grant purchase_onchain paid to the WRONG RECIPIENT → 403, no row', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const sig = 'B'.repeat(88);
  solana.transactions[sig] = txPaying(w.address, STRANGER, 5000);
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'wrong_recipient');
  assert.deepEqual(db.ownership, []);
});

test('grant purchase_onchain paid by a wallet that is not the owner → 403, no row', async () => {
  const env = makeEnv();
  await aliceWithWallet(env);
  const sig = 'C'.repeat(88);
  solana.transactions[sig] = txPaying(STRANGER, TREASURY, 5000);
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'wrong_payer');
  assert.deepEqual(db.ownership, []);
});

test('grant purchase_onchain with a FAILED tx → 403, no row', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const sig = 'D'.repeat(88);
  const tx = txPaying(w.address, TREASURY, 5000);
  tx.meta.err = { InstructionError: [0, 'Custom'] };
  solana.transactions[sig] = tx;
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'tx_failed');
  assert.deepEqual(db.ownership, []);
});

test('grant purchase_onchain: a correct payment DOES write verified = true', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const sig = 'E'.repeat(88);
  solana.transactions[sig] = txPaying(w.address, TREASURY, 1000);
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(r.status, 200);
  assert.equal(db.ownership.length, 1);
  assert.equal(db.ownership[0].verified, true);
  assert.equal(db.ownership[0].evidence.price_lamports, 1000); // the PRICE came from the catalog
});

test('grant purchase_onchain: the same signature cannot buy a SECOND item', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  const sig = 'F'.repeat(88);
  solana.transactions[sig] = txPaying(w.address, TREASURY, 1000);
  const first = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(first.status, 200);
  const env2 = makeEnv({ OWNERSHIP_CATALOG_JSON: JSON.stringify({ 'tier:pro': { price_lamports: 1000 }, 'tier:elite': { price_lamports: 1000 } }) });
  const second = await call(env2, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'elite', provenance: 'purchase_onchain', evidence: { signature: sig } },
  });
  assert.equal(second.status, 403);
  assert.equal(second.body.error, 'signature_already_used');
  assert.equal(db.ownership.length, 1);
});

test('grant purchase_onchain: a price the catalog does not know → 403, no row', async () => {
  const env = makeEnv({ OWNERSHIP_CATALOG_JSON: '{}' });
  const w = await aliceWithWallet(env);
  const sig = 'G'.repeat(88);
  solana.transactions[sig] = txPaying(w.address, TREASURY, 999_999_999);
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: sig, price_lamports: 1 } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'item_not_in_catalog');
  assert.deepEqual(db.ownership, []);
});

test('grant purchase_onchain: an RPC OUTAGE is 502, never 403 and never a row', async () => {
  const env = makeEnv();
  const w = await aliceWithWallet(env);
  solana.down = true;
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'purchase_onchain', evidence: { signature: 'H'.repeat(88) } },
  });
  assert.equal(r.status, 502);
  assert.deepEqual(db.ownership, []);
});

test('grant for a FOREIGN owner → 403, no row', async () => {
  const env = makeEnv();
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-bob',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'bot', item_id: 'det_sfp', provenance: 'starter' },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'forbidden_owner');
  assert.deepEqual(db.ownership, []);
});

test("provenance 'grant' without the admin secret → 403, no row", async () => {
  const env = makeEnv();
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'grant', evidence: { reason: 'support' } },
  });
  assert.equal(r.status, 403);
  assert.deepEqual(db.ownership, []);
});

test("provenance 'grant' WITH the admin secret → written, with the reason", async () => {
  const env = makeEnv();
  const r = await call(env, 'POST', '/ownership/grant', {
    headers: { 'X-Ownership-Admin': 'admin-secret' },
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'grant', evidence: { reason: 'support refund' } },
  });
  assert.equal(r.status, 200);
  assert.equal(db.ownership[0].verified, true);
  assert.equal(db.ownership[0].evidence.reason, 'support refund');
});

test("provenance 'starter' only for actual starter items", async () => {
  const env = makeEnv();
  const good = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice', body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'bot', item_id: 'det_sfp', provenance: 'starter' },
  });
  assert.equal(good.status, 200);
  const bad = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice', body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'bot', item_id: 'det_ccv', provenance: 'starter' },
  });
  assert.equal(bad.status, 403);
  assert.equal(bad.body.error, 'not_a_starter_item');
  assert.equal(db.ownership.length, 1);
});

test('client provenances are refused at the grant door', async () => {
  const env = makeEnv();
  for (const p of ['campaign', 'softcurrency']) {
    const r = await call(env, 'POST', '/ownership/grant', {
      token: 'jwt-alice', body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'bot', item_id: 'det_ccv', provenance: p },
    });
    assert.equal(r.status, 400, p);
    assert.equal(r.body.error, 'use_claim_rpc');
  }
  assert.deepEqual(db.ownership, []);
});

test('subscription without a configured verifier → 503, no row (no pretend check)', async () => {
  const env = makeEnv();
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice',
    body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'subscription', evidence: { stripe_subscription_id: 'sub_123' } },
  });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'subscription_verifier_not_configured');
  assert.deepEqual(db.ownership, []);
});

test('subscription: cancelled sub → 403; another customer\'s sub → 403; active + own → written', async () => {
  const env = makeEnv({ STRIPE_SECRET_KEY: 'sk_test_x' });
  stripe.subscriptions.sub_dead = { status: 'canceled', customer: { email: 'alice@example.invalid' } };
  stripe.subscriptions.sub_other = { status: 'active', customer: { email: 'someone@else.invalid' } };
  stripe.subscriptions.sub_live = { status: 'active', customer: { email: 'alice@example.invalid' } };
  const body = (id) => ({ owner_kind: 'account', owner_id: ALICE, item_kind: 'tier', item_id: 'pro', provenance: 'subscription', evidence: { stripe_subscription_id: id } });
  assert.equal((await call(env, 'POST', '/ownership/grant', { token: 'jwt-alice', body: body('sub_dead') })).status, 403);
  assert.equal((await call(env, 'POST', '/ownership/grant', { token: 'jwt-alice', body: body('sub_other') })).status, 403);
  assert.deepEqual(db.ownership, []);
  assert.equal((await call(env, 'POST', '/ownership/grant', { token: 'jwt-alice', body: body('sub_live') })).status, 200);
  assert.equal(db.ownership.length, 1);
});

test('the kill switch stops every write and says so', async () => {
  const env = makeEnv({ OWNERSHIP_KILL: '1' });
  const r = await call(env, 'POST', '/ownership/grant', {
    token: 'jwt-alice', body: { owner_kind: 'account', owner_id: ALICE, item_kind: 'bot', item_id: 'det_sfp', provenance: 'starter' },
  });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'killed');
  assert.deepEqual(db.ownership, []);
  const h = await call(env, 'GET', '/ownership/health');
  assert.equal(h.body.kill.ownership_writes, true);
});

/* loadout */
test('loadout: no row yet → the data field is ABSENT, not null and not {}', async () => {
  const r = await call(makeEnv(), 'GET', '/loadout', { token: 'jwt-alice' });
  assert.equal(r.status, 200);
  assert.equal('data' in r.body, false);
});

test('loadout: set then get round-trips; a foreign owner is refused', async () => {
  const env = makeEnv();
  const set = await call(env, 'POST', '/loadout', { token: 'jwt-alice', body: { data: { bots: ['det_sfp'] } } });
  assert.equal(set.status, 200);
  const get = await call(env, 'GET', '/loadout', { token: 'jwt-alice' });
  assert.deepEqual(get.body.data, { bots: ['det_sfp'] });
  const foreign = await call(env, 'POST', '/loadout', { token: 'jwt-bob', body: { owner_kind: 'account', owner_id: ALICE, data: { bots: [] } } });
  assert.equal(foreign.status, 403);
  assert.deepEqual(db.loadout[0].data, { bots: ['det_sfp'] });
});

/* health */
test('health names the endpoints, the rules and what is NOT configured', async () => {
  const r = await call(makeEnv({ OWNERSHIP_TREASURY: '', STRIPE_SECRET_KEY: '' }), 'GET', '/ownership/health');
  assert.equal(r.status, 200);
  assert.ok(r.body.endpoints.some((e) => e.includes('/ownership/grant')));
  assert.deepEqual(r.body.rules.client_may_claim, ['campaign', 'softcurrency']);
  assert.equal(r.body.configured.treasury, false);
  assert.equal(r.body.configured.stripe, false);
  assert.equal(r.body.configured.service_role_key, true);   // whether, never what
  assert.ok(r.body.git_sha_note, 'health must say that GIT_SHA is missing, not invent one');
});

test('a broken catalog is reported as broken, NOT as an empty shop', async () => {
  const r = await call(makeEnv({ OWNERSHIP_CATALOG_JSON: '{oops' }), 'GET', '/ownership/health');
  assert.equal(r.body.catalog_items, undefined);
  assert.ok(r.body.catalog_error);
});

/* Test 7 — the service-role key leaves through no door. */
test('the service-role key appears in NO response, NO header and NO log', async () => {
  for (const r of responses) {
    assert.ok(!r.text.includes(SERVICE_KEY), 'service-role key in a response body: ' + r.path);
    for (const [k, v] of r.headers.entries()) {
      assert.ok(!String(v).includes(SERVICE_KEY), 'service-role key in response header ' + k);
    }
  }
  const logged = logs.join('\n');
  assert.ok(!logged.includes(SERVICE_KEY), 'service-role key in a log line');
  assert.ok(!logged.includes('nonce-secret') && !logged.includes('admin-secret'), 'a secret was logged');
});

test('der Service-Schluessel faehrt auf `apikey` — und auf KEINEM Authorization-Header', async () => {
  // Neue Supabase-Schluessel (sb_secret_...) sind keine JWTs; Supabase will sie
  // auf `apikey` und nimmt den Bearer-Weg nur noch als Uebergangskompatibilitaet
  // an, die irgendwann wegfaellt. Faehrt der Schluessel wieder auf beiden
  // Headern, wird diese Zeile rot — nicht erst der Tag, an dem das Geruest faellt.
  // Die zweite Haelfte ist genauso wichtig: mindestens EIN Aufruf muss ihn auf
  // `apikey` tragen, sonst waere der Test auch fuer einen Worker gruen, der gar
  // keine Service-Role-Aufrufe mehr macht.
  let onApikey = 0;
  for (const s of sentTo) {
    const auth = String(s.headers.authorization || '');
    assert.ok(!auth.includes(SERVICE_KEY), 'service-role key on Authorization → ' + s.url);
    if (String(s.headers.apikey || '').includes(SERVICE_KEY)) onApikey++;
  }
  assert.ok(onApikey > 0, 'kein einziger Aufruf trug den Service-Schluessel auf apikey');
});

test('the service-role key is sent to Supabase and to nowhere else', async () => {
  for (const s of sentTo) {
    const carries = JSON.stringify(s.headers) .includes(SERVICE_KEY) || JSON.stringify(s.body || {}).includes(SERVICE_KEY);
    if (carries) assert.ok(s.url.startsWith('https://sb.test'), 'service-role key sent to ' + s.url);
  }
});

/* ── runner ───────────────────────────────────────────────────────────────── */

const realFetch = globalThis.fetch;
const realLog = console.log, realErr = console.error, realWarn = console.warn;
globalThis.fetch = fakeFetch;
console.log = (...a) => { logs.push(a.map(String).join(' ')); };
console.error = (...a) => { logs.push(a.map(String).join(' ')); };
console.warn = (...a) => { logs.push(a.map(String).join(' ')); };

const results = [];
for (const c of CHECKS) {
  resetWorld();
  try {
    await c.fn();
    results.push(['ok', c.name, '']);
  } catch (e) {
    failures++;
    results.push(['FAIL', c.name, (e && e.message) || String(e)]);
  }
}

globalThis.fetch = realFetch;
console.log = realLog; console.error = realErr; console.warn = realWarn;

for (const [state, name, msg] of results) {
  if (state === 'ok') console.log('  ok   ' + name);
  else console.error('  FAIL ' + name + '\n       ' + msg.split('\n')[0]);
}
console.log('\nownership worker: ' + (results.length - failures) + '/' + results.length + ' checks passed, ' + failures + ' UNGETESTET/rot');
if (failures) process.exit(1);
