/**
 * ChartRunner — Ownership worker.
 *
 * Routes (see wrangler.toml):
 *   GET  /ownership/health        — what this worker does, and what it cannot do
 *   GET  /ownership/list          — read YOUR OWN ownership
 *   POST /ownership/link-wallet   — bind a wallet to your account (Ed25519 challenge)
 *   POST /ownership/grant         — the ONLY way to verified = true
 *   GET|POST /loadout             — equipped bots/tools sync (also /ownership/loadout)
 *
 * The split this worker exists to enforce (see chartrunner_ownership_migration.sql):
 * a caller can read only their own rows and can create only UNVERIFIED rows
 * (through the cr_ownership_claim RPC, which the client calls directly — not
 * through here). Everything that ends up `verified = true` passes through
 * /ownership/grant and is written only after the EVIDENCE was checked against
 * something outside the request: a Solana transaction on mainnet, a live
 * subscription, or an admin secret.
 *
 * What this worker never does: it never signs anything, never moves money, and
 * holds no keypair. The service-role key exists only here (Wrangler secret) and
 * appears in no response and in no log line.
 *
 * Secrets (wrangler secret put — see README):
 *   SUPABASE_SERVICE_ROLE_KEY   service-role; writes verified rows and links
 *   OWNERSHIP_NONCE_SECRET      HMAC key for the link-wallet challenge
 *   OWNERSHIP_ADMIN_SECRET      admin grants (provenance 'grant')
 *   STRIPE_SECRET_KEY           optional; without it 'subscription' is refused
 * Vars (plaintext, wrangler.toml): SUPABASE_URL, SUPABASE_ANON_KEY,
 *   OWNERSHIP_TREASURY, SOLANA_RPC_URL, OWNERSHIP_CATALOG_JSON, OWNERSHIP_KILL.
 */

import { catalogLookup, catalogKeys } from './catalog.js';

export const VERSION = 'ownership v1.0.0';
export const NONCE_TTL_MS = 5 * 60 * 1000;
export const LINK_DOMAIN = 'chartrunner.xyz';

// Free at signup — a rule, not evidence. Kept here (server-side) so a client
// cannot declare its own list of "free" items and have them minted verified.
export const STARTER_ITEMS = Object.freeze({
  bot: Object.freeze(['det_sfp', 'det_climax', 'det_vwap']),
});

export const CLIENT_PROVENANCE = Object.freeze(['campaign', 'softcurrency']);
export const SERVER_PROVENANCE = Object.freeze(['starter', 'purchase_onchain', 'subscription', 'grant']);
const ITEM_KINDS = Object.freeze(['bot', 'gear', 'skin', 'tier']);
const OWNER_KINDS = Object.freeze(['account', 'wallet']);

/* ── plumbing (same shape as workers/account) ─────────────────────────────── */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ownership-Admin',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
function json(status, obj, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(request) },
  });
}
function base(env) {
  return String(env.SUPABASE_URL || '').replace(/\/+$/, '');
}
function svcHeaders(env) {
  const k = env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' };
}

/** Verify the caller's Supabase JWT. The uid comes ONLY from this response. */
async function verifyUser(env, token) {
  try {
    const r = await fetch(base(env) + '/auth/v1/user', {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && u.id ? u : null;
  } catch (_) {
    return null;
  }
}

function bearer(request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

/**
 * Call a Postgres RPC. `token` = the caller's JWT → the RPC runs AS THE CALLER
 * and its own owner check applies (the database stays the enforcement point, so
 * the rule is not duplicated here). No token → service role.
 *
 * Returns { ok, status, data } — a transport failure is { ok:false }, never [].
 */
async function rpc(env, fn, body, token) {
  const headers = token
    ? { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    : svcHeaders(env);
  try {
    const r = await fetch(base(env) + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (_) {
    return { ok: false, status: 0, data: null };
  }
}

/** Service-role REST call. Returns { ok, status, data }. */
async function rest(env, path, init) {
  try {
    const r = await fetch(base(env) + path, {
      ...(init || {}),
      headers: { ...svcHeaders(env), ...((init && init.headers) || {}) },
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (_) {
    return { ok: false, status: 0, data: null };
  }
}

/* ── base58 + Ed25519 (no dependencies; the game file has none either) ────── */

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** null on anything that is not valid base58 — callers must not guess. */
export function b58decode(str) {
  const s = String(str || '');
  if (!s) return null;
  const bytes = [0];
  for (const ch of s) {
    const v = B58_ALPHABET.indexOf(ch);
    if (v < 0) return null;
    let carry = v;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (let i = 0; i < s.length && s[i] === '1'; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

export function isWalletAddress(str) {
  const b = b58decode(str);
  return !!b && b.length === 32;
}

const enc = new TextEncoder();

/**
 * Ed25519 over WebCrypto. workerd exposes it as 'Ed25519'; older runtimes only
 * know 'NODE-ED25519'. Both are tried; a runtime that has neither must FAIL the
 * verification, never wave the signature through.
 */
export async function ed25519Verify(pubkey, signature, message) {
  if (!pubkey || pubkey.length !== 32 || !signature || signature.length !== 64) return false;
  for (const algo of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }]) {
    try {
      const key = await crypto.subtle.importKey('raw', pubkey, algo, false, ['verify']);
      return await crypto.subtle.verify(algo.name === 'Ed25519' ? 'Ed25519' : algo, key, signature, message);
    } catch (_) { /* try the next name */ }
  }
  return false;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

/** Length-independent constant-time-ish compare for secrets and MACs. */
function safeEqual(a, b) {
  const x = String(a || ''), y = String(b || '');
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= x.charCodeAt(i % (x.length || 1)) ^ y.charCodeAt(i % (y.length || 1));
  }
  return diff === 0 && x.length > 0;
}

/* ── link-wallet challenge ────────────────────────────────────────────────── */

/**
 * The nonce carries wallet + uid + expiry and is signed with an HMAC, so no
 * storage is needed. Binding the UID is not decoration: without it a captured
 * (nonce, signature) pair could be replayed by anyone else within the TTL to
 * link SOMEONE ELSE'S wallet to their own account.
 */
export async function mintNonce(env, wallet, uid) {
  const exp = Date.now() + NONCE_TTL_MS;
  const rand = toHex(crypto.getRandomValues(new Uint8Array(12)));
  const payload = ['v1', wallet, uid, String(exp), rand].join('.');
  return payload + '.' + (await hmacHex(env.OWNERSHIP_NONCE_SECRET, payload));
}

/** { ok, reason } — the reason is the answer, never a bare false. */
export async function readNonce(env, nonce, wallet, uid, now) {
  const parts = String(nonce || '').split('.');
  if (parts.length !== 6 || parts[0] !== 'v1') return { ok: false, reason: 'nonce_malformed' };
  const [, nWallet, nUid, nExp, , mac] = parts;
  const expected = await hmacHex(env.OWNERSHIP_NONCE_SECRET, parts.slice(0, 5).join('.'));
  if (!safeEqual(mac, expected)) return { ok: false, reason: 'nonce_bad_signature' };
  if (nWallet !== wallet) return { ok: false, reason: 'nonce_wallet_mismatch' };
  if (nUid !== uid) return { ok: false, reason: 'nonce_uid_mismatch' };
  if (!(Number(nExp) > (now == null ? Date.now() : now))) return { ok: false, reason: 'nonce_expired' };
  return { ok: true, reason: '' };
}

/** The exact text the wallet signs. Domain + wallet + account + nonce, all bound. */
export function linkMessage(wallet, uid, nonce) {
  return [
    'ChartRunner wallet link',
    'domain: ' + LINK_DOMAIN,
    'wallet: ' + wallet,
    'account: ' + uid,
    'nonce: ' + nonce,
    '',
    'Signing this proves you hold this wallet. It moves no funds and approves no transaction.',
  ].join('\n');
}

/* ── on-chain payment check ───────────────────────────────────────────────── */

/**
 * Look up a Solana transaction and answer ONE question: did `payers` pay
 * `treasury` at least `lamports` in it? Every failure has a name; nothing here
 * returns a soft "probably".
 */
export async function checkOnchainPayment(env, signature, payers, treasury, lamports) {
  const rpcUrl = env.SOLANA_RPC_URL;
  if (!rpcUrl) return { ok: false, reason: 'solana_rpc_not_configured', status: 503 };
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,120}$/.test(String(signature || ''))) {
    return { ok: false, reason: 'signature_malformed', status: 403 };
  }
  let res;
  try {
    const r = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTransaction',
        params: [signature, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }],
      }),
    });
    if (!r.ok) return { ok: false, reason: 'solana_rpc_unavailable', status: 502 };
    res = await r.json();
  } catch (_) {
    return { ok: false, reason: 'solana_rpc_unavailable', status: 502 };
  }
  // An RPC error is an OUTAGE, not "no such transaction". Saying 403 here would
  // tell the payer their real payment was fake.
  if (res && res.error) return { ok: false, reason: 'solana_rpc_error', status: 502 };
  const tx = res && res.result;
  if (!tx) return { ok: false, reason: 'tx_not_found', status: 403 };
  if (!tx.meta || tx.meta.err) return { ok: false, reason: 'tx_failed', status: 403 };

  const keys = (tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) || [];
  const pubkeys = keys.map((k) => (typeof k === 'string' ? k : k && k.pubkey) || '');
  const signers = keys
    .map((k, i) => (typeof k === 'object' && k && k.signer ? pubkeys[i] : ''))
    .filter(Boolean);
  const paidBy = signers.length ? signers : pubkeys.slice(0, 1);
  if (!paidBy.some((p) => payers.includes(p))) return { ok: false, reason: 'wrong_payer', status: 403 };

  const idx = pubkeys.indexOf(treasury);
  if (idx < 0) return { ok: false, reason: 'wrong_recipient', status: 403 };
  const pre = tx.meta.preBalances || [], post = tx.meta.postBalances || [];
  if (pre.length <= idx || post.length <= idx) return { ok: false, reason: 'balances_unreadable', status: 502 };
  const delta = Number(post[idx]) - Number(pre[idx]);
  if (!(delta >= lamports)) return { ok: false, reason: 'amount_too_low', status: 403 };
  return { ok: true, reason: '', status: 200, delta_lamports: delta };
}

/** A paid transaction buys ONE item. Reusing its signature for a second is theft. */
async function signatureAlreadySpent(env, signature, row) {
  const q = '/rest/v1/cr_ownership?evidence->>signature=eq.' + encodeURIComponent(signature) +
            '&select=owner_kind,owner_id,item_kind,item_id';
  const r = await rest(env, q, { method: 'GET' });
  if (!r.ok || !Array.isArray(r.data)) return { known: false, spent: false }; // outage — caller must 502
  const others = r.data.filter((x) =>
    !(x.owner_kind === row.owner_kind && x.owner_id === row.owner_id &&
      x.item_kind === row.item_kind && x.item_id === row.item_id));
  return { known: true, spent: others.length > 0 };
}

/* ── subscription check ───────────────────────────────────────────────────── */

/**
 * There is no subscription path in ChartRunner yet — no Stripe key, no billing
 * worker. Rather than pretend, this refuses with 503 until STRIPE_SECRET_KEY is
 * actually set, and then checks a live subscription for real. A stub that said
 * "ok" would be exactly the lie the register exists to remove.
 */
export async function checkSubscription(env, evidence, ownerEmail) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: 'subscription_verifier_not_configured', status: 503 };
  const subId = String((evidence && evidence.stripe_subscription_id) || '');
  if (!/^sub_[A-Za-z0-9]+$/.test(subId)) return { ok: false, reason: 'stripe_subscription_id_missing', status: 403 };
  let sub;
  try {
    const r = await fetch('https://api.stripe.com/v1/subscriptions/' + encodeURIComponent(subId) + '?expand[]=customer', {
      headers: { Authorization: 'Bearer ' + key },
    });
    if (r.status === 404) return { ok: false, reason: 'subscription_not_found', status: 403 };
    if (!r.ok) return { ok: false, reason: 'stripe_unavailable', status: 502 };
    sub = await r.json();
  } catch (_) {
    return { ok: false, reason: 'stripe_unavailable', status: 502 };
  }
  if (!sub || !['active', 'trialing'].includes(sub.status)) {
    return { ok: false, reason: 'subscription_not_active', status: 403 };
  }
  const email = (sub.customer && sub.customer.email) || '';
  if (!ownerEmail || !email || email.toLowerCase() !== String(ownerEmail).toLowerCase()) {
    return { ok: false, reason: 'subscription_owner_mismatch', status: 403 };
  }
  return { ok: true, reason: '', status: 200 };
}

/* ── routes ───────────────────────────────────────────────────────────────── */

function killed(env) {
  return String(env.OWNERSHIP_KILL || '') === '1';
}

function health(env, request) {
  const keys = catalogKeys(env);
  const body = {
    ok: true,
    worker: 'chartrunner-ownership',
    version: VERSION,
    endpoints: [
      'GET /ownership/health',
      'GET /ownership/list?owner_kind=&owner_id=',
      'POST /ownership/link-wallet',
      'POST /ownership/grant',
      'GET /loadout?owner_kind=&owner_id=',
      'POST /loadout',
    ],
    rules: {
      client_may_claim: CLIENT_PROVENANCE,          // always verified = false
      server_only: SERVER_PROVENANCE,               // only via POST /ownership/grant
      verified_true_gates: 'tournament entry, prize payout, marketplace sale, paid tier',
      owner_kinds: OWNER_KINDS,
      item_kinds: ITEM_KINDS,
      starter_items: STARTER_ITEMS,
      link_nonce_ttl_s: NONCE_TTL_MS / 1000,
      link_domain: LINK_DOMAIN,
      one_signature_one_item: true,
      worker_signs_nothing: true,
    },
    kill: { ownership_writes: killed(env) },
    configured: {
      supabase_url: !!env.SUPABASE_URL,
      service_role_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
      nonce_secret: !!env.OWNERSHIP_NONCE_SECRET,
      admin_secret: !!env.OWNERSHIP_ADMIN_SECRET,
      treasury: !!env.OWNERSHIP_TREASURY,
      solana_rpc: !!env.SOLANA_RPC_URL,
      stripe: !!env.STRIPE_SECRET_KEY,
    },
  };
  // A price catalog that cannot be parsed is NOT an empty catalog.
  if (keys === null) body.catalog_error = 'OWNERSHIP_CATALOG_JSON is not valid JSON — purchase_onchain is refused';
  else body.catalog_items = keys;
  if (env.GIT_SHA) body.git_sha = env.GIT_SHA;
  else body.git_sha_note = 'GIT_SHA not injected at deploy — this worker cannot name its own commit';
  return json(200, body, request);
}

async function listOwnership(env, request, url) {
  const token = bearer(request);
  if (!token) return json(401, { error: 'no_token' }, request);
  const user = await verifyUser(env, token);
  if (!user) return json(401, { error: 'invalid_token' }, request);

  const ownerKind = url.searchParams.get('owner_kind') || 'account';
  const ownerId = (url.searchParams.get('owner_id') || (ownerKind === 'account' ? user.id : '')).trim();
  if (!OWNER_KINDS.includes(ownerKind)) return json(400, { error: 'bad_owner_kind' }, request);
  if (!ownerId) return json(400, { error: 'missing_owner_id' }, request);

  // Called AS THE CALLER: the RPC's own owner check decides. A foreign identity
  // yields the empty set from the database, not from a rule copied into here.
  const r = await rpc(env, 'cr_ownership_list', { p_owner_kind: ownerKind, p_owner_id: ownerId }, token);
  if (!r.ok || !Array.isArray(r.data)) {
    // No `items` field at all: an outage must not look like "you own nothing".
    return json(502, { error: 'register_unavailable', detail: 'ownership register did not answer' }, request);
  }
  return json(200, { ok: true, owner_kind: ownerKind, owner_id: ownerId, items: r.data }, request);
}

async function linkWallet(env, request, body) {
  if (!env.OWNERSHIP_NONCE_SECRET) return json(503, { error: 'not_configured', detail: 'OWNERSHIP_NONCE_SECRET missing' }, request);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'not_configured', detail: 'service-role key missing' }, request);

  const token = bearer(request);
  if (!token) return json(401, { error: 'no_token' }, request);
  const user = await verifyUser(env, token);
  if (!user) return json(401, { error: 'invalid_token' }, request);

  const wallet = String(body.wallet || '').trim();
  if (!isWalletAddress(wallet)) return json(400, { error: 'bad_wallet' }, request);

  if (body.action === 'challenge') {
    const nonce = await mintNonce(env, wallet, user.id);
    return json(200, {
      ok: true, nonce, message: linkMessage(wallet, user.id, nonce),
      expires_in_s: NONCE_TTL_MS / 1000,
    }, request);
  }

  if (body.action !== 'verify') return json(400, { error: 'bad_action', detail: "action must be 'challenge' or 'verify'" }, request);

  const nonce = String(body.nonce || '');
  const check = await readNonce(env, nonce, wallet, user.id);
  if (!check.ok) return json(403, { error: check.reason }, request);

  const sig = b58decode(String(body.signature || ''));
  const pub = b58decode(wallet);
  if (!sig || sig.length !== 64) return json(403, { error: 'signature_malformed' }, request);
  const good = await ed25519Verify(pub, sig, enc.encode(linkMessage(wallet, user.id, nonce)));
  if (!good) return json(403, { error: 'signature_invalid' }, request);

  const existing = await rest(env, '/rest/v1/cr_wallet_link?wallet=eq.' + encodeURIComponent(wallet) + '&select=wallet,uid', { method: 'GET' });
  if (!existing.ok || !Array.isArray(existing.data)) return json(502, { error: 'register_unavailable' }, request);
  if (existing.data.length && existing.data[0].uid !== user.id) {
    return json(409, { error: 'wallet_linked_elsewhere' }, request);
  }
  if (!existing.data.length) {
    const ins = await rest(env, '/rest/v1/cr_wallet_link', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ wallet, uid: user.id }),
    });
    if (!ins.ok) return json(502, { error: 'link_write_failed', status: ins.status }, request);
  }
  return json(200, { ok: true, wallet, linked: true }, request);
}

/** Wallets already proven to belong to this account. */
async function linkedWallets(env, uid) {
  const r = await rest(env, '/rest/v1/cr_wallet_link?uid=eq.' + encodeURIComponent(uid) + '&select=wallet', { method: 'GET' });
  if (!r.ok || !Array.isArray(r.data)) return null; // null = unknown, NOT "none"
  return r.data.map((x) => x.wallet);
}

async function grant(env, request, body) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'not_configured', detail: 'service-role key missing' }, request);

  const ownerKind = String(body.owner_kind || '');
  const ownerId = String(body.owner_id || '').trim();
  const itemKind = String(body.item_kind || '');
  const itemId = String(body.item_id || '').trim();
  const provenance = String(body.provenance || '');
  const evidence = (body.evidence && typeof body.evidence === 'object') ? body.evidence : {};

  if (!OWNER_KINDS.includes(ownerKind)) return json(400, { error: 'bad_owner_kind' }, request);
  if (!ITEM_KINDS.includes(itemKind)) return json(400, { error: 'bad_item_kind' }, request);
  if (!ownerId || !itemId) return json(400, { error: 'missing_owner_or_item' }, request);
  if (CLIENT_PROVENANCE.includes(provenance)) {
    return json(400, { error: 'use_claim_rpc', detail: 'campaign/softcurrency are client claims (cr_ownership_claim), never grants' }, request);
  }
  if (!SERVER_PROVENANCE.includes(provenance)) return json(400, { error: 'bad_provenance' }, request);

  const adminHeader = request.headers.get('X-Ownership-Admin') || '';
  const isAdmin = !!env.OWNERSHIP_ADMIN_SECRET && safeEqual(adminHeader, env.OWNERSHIP_ADMIN_SECRET);

  // Who is asking? Admin secret, or a caller who owns the identity.
  let user = null;
  if (!isAdmin) {
    const token = bearer(request);
    if (!token) return json(401, { error: 'no_token' }, request);
    user = await verifyUser(env, token);
    if (!user) return json(401, { error: 'invalid_token' }, request);
    if (ownerKind === 'account' && ownerId !== user.id) return json(403, { error: 'forbidden_owner' }, request);
    if (ownerKind === 'wallet') {
      const wallets = await linkedWallets(env, user.id);
      if (wallets === null) return json(502, { error: 'register_unavailable' }, request);
      if (!wallets.includes(ownerId)) return json(403, { error: 'wallet_not_linked' }, request);
    }
  }

  const row = { owner_kind: ownerKind, owner_id: ownerId, item_kind: itemKind, item_id: itemId };
  let stored = { ...evidence };

  if (provenance === 'grant') {
    if (!isAdmin) return json(403, { error: 'admin_secret_required' }, request);
    const reason = String(evidence.reason || '').trim();
    if (!reason) return json(400, { error: 'grant_reason_required' }, request);
    stored = { reason, granted_at: new Date().toISOString() };
  } else if (provenance === 'starter') {
    const list = STARTER_ITEMS[itemKind] || [];
    if (!list.includes(itemId)) return json(403, { error: 'not_a_starter_item' }, request);
    stored = { rule: 'starter', granted_at: new Date().toISOString() };
  } else if (provenance === 'purchase_onchain') {
    const item = catalogLookup(env, itemKind, itemId);
    if (!item) return json(403, { error: 'item_not_in_catalog', detail: 'no server-side price for this item' }, request);
    if (item.mint) return json(503, { error: 'token_payment_not_supported', detail: 'this worker verifies SOL payments only' }, request);
    const treasury = item.treasury || env.OWNERSHIP_TREASURY || '';
    if (!isWalletAddress(treasury)) return json(503, { error: 'not_configured', detail: 'OWNERSHIP_TREASURY missing or malformed' }, request);

    // The payer must be an identity we have proof of: the owner wallet itself,
    // or a wallet linked to the owner account.
    let payers = [];
    if (ownerKind === 'wallet') payers = [ownerId];
    else {
      const wallets = await linkedWallets(env, ownerId);
      if (wallets === null) return json(502, { error: 'register_unavailable' }, request);
      payers = wallets;
    }
    if (!payers.length) return json(403, { error: 'no_linked_wallet', detail: 'link a wallet before an on-chain purchase' }, request);

    const signature = String(evidence.signature || '');
    const spent = await signatureAlreadySpent(env, signature, row);
    if (!spent.known) return json(502, { error: 'register_unavailable' }, request);
    if (spent.spent) return json(403, { error: 'signature_already_used' }, request);

    const paid = await checkOnchainPayment(env, signature, payers, treasury, item.price_lamports);
    if (!paid.ok) return json(paid.status, { error: paid.reason }, request);
    stored = { signature, price_lamports: item.price_lamports, treasury, checked_at: new Date().toISOString() };
  } else if (provenance === 'subscription') {
    const email = (user && user.email) || String(evidence.email || '');
    const sub = await checkSubscription(env, evidence, email);
    if (!sub.ok) return json(sub.status, { error: sub.reason }, request);
    stored = { stripe_subscription_id: String(evidence.stripe_subscription_id || ''), checked_at: new Date().toISOString() };
  }

  if (killed(env)) return json(503, { error: 'killed', detail: 'OWNERSHIP_KILL is set — no rows are written' }, request);

  const w = await rest(env, '/rest/v1/cr_ownership', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...row, provenance, verified: true, evidence: stored }),
  });
  if (!w.ok) return json(502, { error: 'write_failed', status: w.status }, request);
  return json(200, { ok: true, ...row, provenance, verified: true }, request);
}

async function loadout(env, request, url, body) {
  const token = bearer(request);
  if (!token) return json(401, { error: 'no_token' }, request);
  const user = await verifyUser(env, token);
  if (!user) return json(401, { error: 'invalid_token' }, request);

  const src = request.method === 'POST' ? body : Object.fromEntries(url.searchParams.entries());
  const ownerKind = String(src.owner_kind || 'account');
  const ownerId = String(src.owner_id || (ownerKind === 'account' ? user.id : '')).trim();
  if (!OWNER_KINDS.includes(ownerKind)) return json(400, { error: 'bad_owner_kind' }, request);
  if (!ownerId) return json(400, { error: 'missing_owner_id' }, request);

  if (request.method === 'GET') {
    const r = await rpc(env, 'cr_loadout_get', { p_owner_kind: ownerKind, p_owner_id: ownerId }, token);
    if (!r.ok || !Array.isArray(r.data)) return json(502, { error: 'register_unavailable' }, request);
    const out = { ok: true, owner_kind: ownerKind, owner_id: ownerId };
    // No row = no loadout yet. The `data` field is absent, not null and not {}.
    if (r.data.length) { out.data = r.data[0].data; out.updated_at = r.data[0].updated_at; }
    return json(200, out, request);
  }

  if (killed(env)) return json(503, { error: 'killed' }, request);
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return json(400, { error: 'bad_data', detail: 'data must be a json object' }, request);
  }
  const r = await rpc(env, 'cr_loadout_set', {
    p_owner_kind: ownerKind, p_owner_id: ownerId, p_data: body.data,
    p_updated_at: body.updated_at || null,
  }, token);
  if (!r.ok) {
    if (r.status === 403 || r.status === 401) return json(403, { error: 'forbidden_owner' }, request);
    return json(502, { error: 'register_unavailable' }, request);
  }
  return json(200, { ok: true, owner_kind: ownerKind, owner_id: ownerId, updated_at: r.data }, request);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'GET' && path === '/ownership/health') return health(env, request);

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return json(503, { error: 'not_configured', detail: 'SUPABASE_URL/ANON_KEY missing' }, request);
    }

    let body = {};
    if (request.method === 'POST') {
      body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return json(400, { error: 'bad_json' }, request);
    }

    try {
      if (request.method === 'GET' && path === '/ownership/list') return await listOwnership(env, request, url);
      if (request.method === 'POST' && path === '/ownership/link-wallet') return await linkWallet(env, request, body);
      if (request.method === 'POST' && path === '/ownership/grant') return await grant(env, request, body);
      if (path === '/loadout' || path === '/ownership/loadout') {
        if (request.method === 'GET' || request.method === 'POST') return await loadout(env, request, url, body);
      }
    } catch (_) {
      // Never let an exception carry env or stack out of the worker.
      return json(500, { error: 'internal_error' }, request);
    }
    return json(404, { error: 'not_found' }, request);
  },
};
