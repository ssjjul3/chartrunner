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
/**
 * Headers for a service-role call. The key rides on `apikey` and NOWHERE else.
 *
 * The key in use is a new-format Supabase secret key (`sb_secret_…`), and those
 * are not JWTs: Supabase asks for them on `apikey` and keeps
 * `Authorization: Bearer` only as migration compatibility that goes away.
 * Sending it on both headers costs nothing today and breaks silently the day
 * that scaffolding is removed — so it is sent once, on the header that is the
 * contract. (rpc() below is the other side of this: with a caller token,
 * `Authorization` carries the USER's JWT, which is exactly where it belongs.)
 */
function svcHeaders(env) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
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

/* ── /ownership/health: die FAEHIGKEITSPRUEFUNG ────────────────────────────
 *
 * WARUM DIESE DATEI AB HIER ANDERS AUSSIEHT (21.09.2026)
 * -----------------------------------------------------
 * Gemessen am 21.09.2026 ueber den Cloudflare-Konnektor stand an diesem
 * Worker `OWNERSHIP_CATALOG_JSON = "{}"`, und `OWNERSHIP_TREASURY` gab es in
 * den Variablen ueberhaupt nicht. Beides zusammen heisst: `purchase_onchain`
 * kann hier nichts erteilen — jede Anfrage endet in `item_not_in_catalog`
 * bzw. `503 not_configured`.
 *
 * Sichtbar war das vorher nur, wenn man es PROBIERT hat. `/health` sagte
 * `ok: true` und fuehrte die beiden fehlenden Werte als zwei stille `false`
 * in `configured` — neben acht anderen `true`. Ein Zustand, in dem ein
 * Zahlweg nichts erteilen kann, sah damit genauso aus wie ein gesunder.
 *
 * Seit diesem Commit steht das Urteil VORNE und in denselben Worten wie beim
 * Geld-Worker (chartrunner-worker, my-worker/src/lib/health.ts):
 *
 *   ok      — alles gruen.
 *   pending — es fehlt nur Benanntes und Gewolltes: eine nicht gesetzte
 *             Variable, ein Notaus. KEIN Ausfall. Die naechste Handlung ist
 *             eine menschliche, und niemand muss suchen.
 *   broken  — etwas, das antworten sollte, tut es nicht, oder jemand hat
 *             einen Wert eingetragen, der nicht stimmt. Hinsehen.
 *
 * Der leere Katalog und die fehlende Treasury sind deshalb `pending` und
 * nicht `broken`: sie sind eine Produktentscheidung, die niemand getroffen
 * hat, kein Defekt. Ein KAPUTTER Katalog (JSON-Muell) und eine GESETZTE,
 * aber ungueltige Adresse sind `broken` — dort hat jemand etwas eingetragen,
 * und es stimmt nicht.
 *
 * `blocked_by` nennt die betroffenen Pruefungen als `feature.pruefung`. Ohne
 * diese Trennung gewoehnt man sich an Rot, und dann faellt ein echter Ausfall
 * nicht mehr auf.
 *
 * WAS DIESE ANTWORT NICHT SAGT, UND WARUM NICHT
 * ---------------------------------------------
 * Sie sagt NICHT, ob ein Spieler heute Pro bekommt. Dieser Worker ist nicht
 * der einzige Weg zu einer verifizierten Zeile in `cr_ownership` — der
 * Geld-Worker schreibt sie ueber `POST /v1/pay/sol/intent` selbst, mit
 * demselben Service-Schluessel und derselben Provenienz, ohne hier
 * vorbeizukommen (my-worker/src/lib/solpay.ts → grantWalletTier). Siehe den
 * korrigierten Kopf von wrangler.toml.
 *
 * Was hier steht, ist deshalb die Faehigkeit DIESES Wegs und keine Aussage
 * ueber den anderen. Eine Antwort, die beides vermischte, waere genau die
 * Sorte Zusage, die dieser Commit ausbaut.
 */

const GIT_SHA_RE = /^[0-9a-f]{7,40}$/;

/**
 * Der Commit, aus dem dieser Worker deployt wurde — oder `null` PLUS Grund.
 *
 * Wortgleich zu my-worker/src/lib/health.ts: sieben Stellen, weil das die
 * Laenge ist, in der GitHub einen Commit anzeigt, also die Laenge, gegen die
 * am Telefon verglichen wird. Ein halb geratener SHA waere schlimmer als
 * keiner — er saehe aus wie eine Antwort, und "ist der Merge live?" bekaeme
 * wieder eine Deutung statt eines Vergleichs.
 *
 * Injiziert wird der Wert beim Deploy (.github/workflows/deploy-workers.yml:
 * `wrangler deploy --var "GIT_SHA:${GITHUB_SHA}"`). Der Worker kann ihn nicht
 * selbst kennen — im Bundle gibt es kein Git.
 */
export function buildGitShaFacts(env) {
  const rawValue = env && env.GIT_SHA;
  const raw = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
  const ok = GIT_SHA_RE.test(raw.toLowerCase());
  return {
    git_sha: ok ? raw.toLowerCase().slice(0, 7) : null,
    git_sha_full: ok ? raw.toLowerCase() : null,
    git_sha_raw: raw === '' ? null : raw,
    injected: ok,
    var: 'GIT_SHA',
    note: ok
      ? 'Der Commit, aus dem dieser Worker deployt wurde. Injiziert beim Deploy (wrangler deploy --var GIT_SHA), nicht vom Worker geraten. "Ist der Merge live?" ist damit ein Vergleich mit dem Merge-Commit auf GitHub.'
      : raw === ''
        ? 'KEIN git_sha injiziert. Dieser Worker wurde nicht ueber .github/workflows/deploy-workers.yml deployt. Damit laesst sich NICHT vergleichen, welcher Stand hier laeuft.'
        : `GIT_SHA ist gesetzt, aber "${raw}" ist kein Commit-SHA (erwartet: 7 bis 40 hexadezimale Zeichen). Der Wert wird NICHT ausgegeben, als waere er einer.`,
  };
}

/** Aus einzelnen Pruefungen EIN Urteil. Ein einziges `broken` schlaegt jede
 * Zahl von `pending` — ein echter Ausfall darf nicht zwischen bekannten
 * Luecken untergehen. */
export function verdictOf(checks) {
  const entries = Object.entries(checks);
  const failed = entries.filter(([, c]) => !c.ok);
  const broken = failed.filter(([, c]) => c.kind === 'broken').map(([name]) => name);
  const pending = failed.filter(([, c]) => c.kind !== 'broken').map(([name]) => name);
  const ok = failed.length === 0;
  const v = { ok, status: broken.length ? 'broken' : pending.length ? 'pending' : 'ok', pending, broken };
  if (!ok) {
    v.reason = failed.map(([name, c]) => `${name}: ${c.reason || 'ohne Grund fehlgeschlagen'}`).join(' · ');
  }
  return v;
}

/** Aus Pruefungen ein Feature — dieselbe Form wie beim Geld-Worker. */
function featureOf(checks, extra) {
  const v = verdictOf(checks);
  return { ok: v.ok, status: v.status, ...(v.reason ? { reason: v.reason } : {}), checks, ...(extra || {}) };
}

/** Ein gesetzter Wert fehlt (pending) oder ist da (ok). Nie stillschweigend. */
function presenceCheck(value, reasonWhenMissing) {
  return value ? { ok: true, kind: 'ok' } : { ok: false, kind: 'pending', reason: reasonWhenMissing };
}

/**
 * Die Zieladresse dieses Wegs.
 *
 * NICHT GESETZT ist etwas anderes als FALSCH GESETZT. Das erste ist eine
 * offene Aufgabe (`pending`, die naechste Handlung ist Julians im Dashboard);
 * das zweite heisst, jemand hat eine Adresse eingetragen, und sie ist keine —
 * das gehoert angesehen (`broken`) und nicht abgewartet.
 *
 * Sie ist an dieser Stelle eine SICHERHEITSGRENZE und kein Etikett:
 * checkOnchainPayment() prueft die Zahlung gegen genau diesen Wert. Steht hier
 * eine andere Adresse als die, auf die der Nutzer ueberweist, wird eine echte
 * Zahlung als `wrong_recipient` abgelehnt; steht hier eine FREMDE, wird eine
 * Zahlung an einen Fremden als Kauf verbucht. Deshalb steht sie unten im
 * Klartext: damit der Abgleich mit `MERCHANT_SOL_ADDRESS` des Geld-Workers
 * eine ABLESUNG ist und keine Annahme.
 */
function treasuryCheck(env) {
  const raw = env.OWNERSHIP_TREASURY;
  const treasury = raw === undefined || raw === null ? '' : String(raw).trim();
  if (treasury === '') {
    return {
      check: {
        ok: false,
        kind: 'pending',
        reason:
          'OWNERSHIP_TREASURY ist nicht gesetzt — dieser Worker kann nicht pruefen, WEM bezahlt wurde, ' +
          'und lehnt jede purchase_onchain-Erteilung mit 503 not_configured ab. Die Adresse holt Julian ' +
          'aus seiner Wallet und setzt sie im Cloudflare-Dashboard; sie muss dieselbe sein wie ' +
          'MERCHANT_SOL_ADDRESS am Geld-Worker.',
      },
      treasury: null,
    };
  }
  if (!isWalletAddress(treasury)) {
    return {
      check: {
        ok: false,
        kind: 'broken',
        reason: `OWNERSHIP_TREASURY="${treasury}" ist keine gueltige Solana-Adresse (32 Byte base58).`,
      },
      treasury,
    };
  }
  return { check: { ok: true, kind: 'ok' }, treasury };
}

/**
 * Der Katalog.
 *
 * LEER ist `pending`: ChartRunner verkauft heute nichts fuer SOL, und das ist
 * benannt und gewollt. Was verkauft wird und zu welchem Preis, ist eine
 * Produktentscheidung — sie gehoert ins Dashboard und nicht in einen PR, und
 * ein erfundener Platzhalterpreis waere ein Preis, den nie jemand gesetzt hat.
 *
 * KAPUTT ist `broken`: ein Katalog, der sich nicht lesen laesst, ist kein
 * leerer Katalog. Dort hat jemand etwas eingetragen, und es ist Muell.
 *
 * EINTRAEGE OHNE PREIS sind ebenfalls `broken`: `catalogLookup` gibt fuer sie
 * `null` zurueck, der Eintrag steht also im Katalog und ist trotzdem nicht
 * kaufbar. Das ist die stillste Art, einen Verkauf zu verlieren.
 */
function catalogCheck(env) {
  const keys = catalogKeys(env);
  if (keys === null) {
    return {
      check: {
        ok: false,
        kind: 'broken',
        reason: 'OWNERSHIP_CATALOG_JSON ist kein gueltiges JSON — purchase_onchain wird abgelehnt. Ein kaputter Katalog ist KEIN leerer Katalog.',
      },
      keys: null,
      priced: [],
      unpriced: [],
    };
  }
  const priced = [];
  const unpriced = [];
  for (const key of keys) {
    const i = key.indexOf(':');
    const entry = i < 0 ? null : catalogLookup(env, key.slice(0, i), key.slice(i + 1));
    if (entry) priced.push({ key, price_lamports: entry.price_lamports, ...(entry.mint ? { mint: entry.mint } : {}) });
    else unpriced.push({ key, reason: 'kein brauchbarer price_lamports (ganze Zahl > 0) — dieser Eintrag ist nicht kaufbar' });
  }
  if (!keys.length) {
    return {
      check: {
        ok: false,
        kind: 'pending',
        reason:
          'OWNERSHIP_CATALOG_JSON ist leer ({}) — dieser Worker weiss nicht, WAS fuer SOL verkauft wird, ' +
          'und lehnt jede purchase_onchain-Erteilung mit item_not_in_catalog ab. Was verkauft wird und zu ' +
          'welchem Preis, setzt Julian im Cloudflare-Dashboard; ein Platzhalterpreis waere ein Preis, den ' +
          'nie jemand gesetzt hat.',
      },
      keys,
      priced,
      unpriced,
    };
  }
  if (unpriced.length) {
    return {
      check: {
        ok: false,
        kind: 'broken',
        reason:
          'Katalogeintraege ohne brauchbaren Preis: ' + unpriced.map((u) => u.key).join(', ') +
          ' — sie stehen im Katalog und sind trotzdem nicht kaufbar.',
      },
      keys,
      priced,
      unpriced,
    };
  }
  return { check: { ok: true, kind: 'ok' }, keys, priced, unpriced };
}

const STATUS_NOTE =
  'status: ok = alles gruen · pending = es fehlt nur Benanntes und Gewolltes (nicht gesetzte Variable, ' +
  'Notaus) — kein Ausfall, die naechste Handlung ist eine menschliche · broken = etwas, das antworten ' +
  'sollte, tut es nicht, oder ein gesetzter Wert stimmt nicht. blocked_by nennt die betroffenen ' +
  'Pruefungen als feature.pruefung. `ok` bleibt true nur, wenn ALLES gruen ist.';

const GRANT_NOTE =
  'Dieser Worker ist NICHT der einzige Schreiber verifizierter Zeilen in cr_ownership: der Geld-Worker ' +
  '(chartrunner-worker) schreibt sie ueber POST /v1/pay/sol/intent selbst, mit demselben Service-' +
  'Schluessel und derselben Provenienz purchase_onchain, ohne hier vorbeizukommen. Was hier steht, ist ' +
  'die Faehigkeit DIESES Wegs (POST /ownership/grant) und keine Aussage ueber den anderen — dessen ' +
  'Faehigkeit steht in GET /health des Geld-Workers unter features.pay_identity.';

function health(env, request) {
  const build = buildGitShaFacts(env);
  const cat = catalogCheck(env);
  const tre = treasuryCheck(env);

  /* Das Register selbst — ohne diese drei kann dieser Worker GAR NICHTS
   * erteilen, gleich ueber welchen Weg. Der Notaus steht mit drin und zaehlt
   * als `pending`: er ist eine Entscheidung und kein Ausfall. */
  const register = featureOf({
    supabase: presenceCheck(
      env.SUPABASE_URL && env.SUPABASE_ANON_KEY,
      'SUPABASE_URL/SUPABASE_ANON_KEY fehlen — ohne sie laesst sich nicht einmal ein Aufrufer-Token pruefen.'
    ),
    service_role: presenceCheck(
      env.SUPABASE_SERVICE_ROLE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt (wrangler secret put) — ohne ihn wird keine Zeile geschrieben.'
    ),
    nonce_secret: presenceCheck(
      env.OWNERSHIP_NONCE_SECRET,
      'OWNERSHIP_NONCE_SECRET ist nicht gesetzt (wrangler secret put) — ohne ihn laesst sich keine Wallet verbinden, und ohne verbundene Wallet gibt es keinen purchase_onchain.'
    ),
    writes_kill: killed(env)
      ? { ok: false, kind: 'pending', reason: 'OWNERSHIP_KILL=1 — JEDER Schreibvorgang (grant, link, loadout) wird mit 503 abgelehnt. Notaus, kein Ausfall.' }
      : { ok: true, kind: 'ok' },
  });

  /* Der Weg, um den es geht: eine bezahlte Erteilung. Er haengt an drei
   * Dingen, und alle drei werden NACHGESEHEN statt behauptet. */
  const grantOnchain = featureOf(
    {
      catalog: cat.check,
      treasury: tre.check,
      solana_rpc: presenceCheck(
        env.SOLANA_RPC_URL,
        'SOLANA_RPC_URL ist nicht gesetzt — ohne sie kann keine Zahlung auf der Kette nachgesehen werden.'
      ),
    },
    {
      /* Was JETZT kaufbar waere. Eine Liste aus dem Katalog UND der
       * Preispruefung, nicht ein Echo der Schluessel: ein Eintrag ohne
       * brauchbaren Preis steht in `unsellable` mit Grund. */
      sellable: cat.priced,
      unsellable: cat.unpriced,
      /* Im Klartext, damit der Abgleich mit MERCHANT_SOL_ADDRESS eine
       * Ablesung ist. Eine Empfaengeradresse ist kein Geheimnis — sie steht
       * in jeder Zahlungsaufforderung. */
      treasury: tre.treasury,
      note: GRANT_NOTE,
    }
  );

  /* Der Stripe-Weg. Ob der Schluessel GESETZT ist, laesst sich hier ablesen;
   * ob er GUELTIG ist und heute tatsaechlich ein Abo bestaetigt, NICHT — das
   * zeigte erst ein Aufruf an Stripe, und den macht /health nicht (er kostet
   * ein fremdes Kontingent und braucht eine Abo-ID, die es hier nicht gibt).
   * Genau das steht deshalb in `note`, statt geschaetzt zu werden. */
  const grantSubscription = featureOf(
    {
      stripe: presenceCheck(
        env.STRIPE_SECRET_KEY,
        'STRIPE_SECRET_KEY ist nicht gesetzt — provenance "subscription" wird mit 503 subscription_verifier_not_configured abgelehnt.'
      ),
    },
    {
      note:
        'Gesagt wird nur, ob der Schluessel GESETZT ist. Ob er gueltig ist und ein Abo heute tatsaechlich ' +
        'bestaetigt wird, zeigt erst ein echter Aufruf an Stripe mit einer Abo-ID — den macht /health nicht.',
    }
  );

  /* Die Notverfuegung. Ohne Secret gibt es sie nicht — das ist gewollt und
   * kein Mangel, aber es soll ablesbar sein. */
  const grantAdmin = featureOf({
    admin_secret: presenceCheck(
      env.OWNERSHIP_ADMIN_SECRET,
      'OWNERSHIP_ADMIN_SECRET ist nicht gesetzt — provenance "grant" (die Notverfuegung von Hand) ist nicht moeglich.'
    ),
  });

  const features = {
    register,
    grant_onchain: grantOnchain,
    grant_subscription: grantSubscription,
    grant_admin: grantAdmin,
  };

  /* Die zwei Listen entstehen aus den Pruefungen SELBST und werden nicht
   * nebenher gepflegt — eine zweite Liste waere die naechste Stelle, an der
   * etwas auseinanderlaeuft. */
  const blocked = { pending: [], broken: [] };
  for (const [name, feature] of Object.entries(features)) {
    const v = verdictOf(feature.checks);
    for (const c of v.broken) blocked.broken.push(`${name}.${c}`);
    for (const c of v.pending) blocked.pending.push(`${name}.${c}`);
  }

  const body = {
    ok: blocked.pending.length === 0 && blocked.broken.length === 0,
    status: blocked.broken.length ? 'broken' : blocked.pending.length ? 'pending' : 'ok',
    blocked_by: blocked,
    status_note: STATUS_NOTE,
    worker: 'chartrunner-ownership',
    version: VERSION,
    /* GANZ OBEN und nicht in einem Unterobjekt (CLAUDE.md §4): das ist die
     * Zeile, die am Telefon gegen den Merge-Commit gehalten wird. `null`
     * heisst ausdruecklich "nicht injiziert"; der Unterschied steht in
     * build.note. Bis zu diesem Commit stand der Wert NUR unter `build` und
     * ungeprueft — ein beliebiger String waere dort als Commit durchgegangen. */
    git_sha: build.git_sha,
    build,
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
    features,
    /* Unveraendert und absichtlich behalten: `configured` sagt WEITER nur, OB
     * etwas gesetzt ist, nie WAS. Es ist der aeltere, flachere Blick auf
     * dieselben Werte — wer ihn liest, liest weiter dasselbe. Das Urteil
     * darueber steht jetzt in `features`. */
    configured: {
      supabase_url: !!env.SUPABASE_URL,
      service_role_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
      nonce_secret: !!env.OWNERSHIP_NONCE_SECRET,
      admin_secret: !!env.OWNERSHIP_ADMIN_SECRET,
      treasury: !!env.OWNERSHIP_TREASURY,
      solana_rpc: !!env.SOLANA_RPC_URL,
      stripe: !!env.STRIPE_SECRET_KEY,
    },
    time: new Date().toISOString(),
  };
  // A price catalog that cannot be parsed is NOT an empty catalog.
  if (cat.keys === null) body.catalog_error = 'OWNERSHIP_CATALOG_JSON is not valid JSON — purchase_onchain is refused';
  else body.catalog_items = cat.keys;
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
