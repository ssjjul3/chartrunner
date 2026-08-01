/**
 * ChartRunner — Alert Engine SERVER TIER (cron worker).
 *
 * Route: none (cron only). Also exposes a token-gated manual trigger on the
 * worker's *.workers.dev URL for testing: GET /?run=1 with ?token=<CRON_TEST_TOKEN>.
 *
 * Every 5 minutes (see wrangler.toml [triggers]):
 *   1. Read armed alerts from Supabase cr_alerts (service-role → bypasses RLS).
 *   2. For each, check the condition server-side against Birdeye
 *      (price / 24h% / volume via /defi/token_overview; safety via
 *      /defi/token_security) — mirrors the in-browser crAlertEngine._evaluate.
 *   3. On a match with the mail channel on: look up the owner's e-mail via the
 *      Supabase Admin API and send a Resend mail. Then mark the row triggered
 *      (recurring alerts stay armed with a 1h cooldown via last_fired_at).
 *
 * Fail-safe: per-alert and per-token errors are isolated; a provider timeout
 * never fails the whole run and never fabricates a trigger. Baselines for
 * vol_mult / safety are established (written back) on first sight, never fired.
 *
 * Secrets (Wrangler, out-of-band — NOT in the repo):
 *   SUPABASE_SERVICE_ROLE_KEY   Supabase service-role / sb_secret key (reads
 *                               cr_alerts + auth admin; server-only, never client).
 *   RESEND_API_KEY              Resend API key.
 *   CRON_TEST_TOKEN  (optional) token to allow the manual /?run=1 trigger.
 *   BIRDEYE_API_KEY  (optional) only if you want direct Birdeye calls; by
 *                               default Birdeye goes through the /v1/birdeye proxy.
 * Vars (wrangler.toml): SUPABASE_URL, BIRDEYE_PROXY, BIRDEYE_BASE, MAIL_FROM, MAX_PER_RUN.
 */

const REFIRE_MS = 3600000; // recurring alerts: min gap between mails (1h)
const RANK = { SAFE: 0, CAUTION: 1, UNKNOWN: 1, RISK: 2 };
const VALID_TYPES = new Set(["price_above", "price_below", "pct_move", "vol_mult", "safety"]);

function esc(x) {
  return String(x == null ? "" : x).replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

// ── Supabase REST (service role) ────────────────────────────────────────────
function _sbHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}
async function sbArmedAlerts(env, limit) {
  const url =
    env.SUPABASE_URL.replace(/\/+$/, "") +
    "/rest/v1/cr_alerts?status=eq.armed&select=owner,id,asset,symbol,mint,type,threshold,channels,recurring,status,base_vol,base_verdict,last_fired_at" +
    "&limit=" + encodeURIComponent(limit);
  const r = await fetch(url, { headers: _sbHeaders(env) });
  if (!r.ok) throw new Error("supabase armed HTTP " + r.status);
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}
async function sbPatchAlert(env, owner, id, patch) {
  const url =
    env.SUPABASE_URL.replace(/\/+$/, "") +
    "/rest/v1/cr_alerts?owner=eq." + encodeURIComponent(owner) + "&id=eq." + encodeURIComponent(id);
  await fetch(url, {
    method: "PATCH",
    headers: { ..._sbHeaders(env), Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}
async function sbUserEmail(env, owner) {
  const url = env.SUPABASE_URL.replace(/\/+$/, "") + "/auth/v1/admin/users/" + encodeURIComponent(owner);
  const r = await fetch(url, { headers: _sbHeaders(env) });
  if (!r.ok) return "";
  const u = await r.json().catch(() => null);
  return (u && u.email) || "";
}
// v1.0.764 — the owner's anti-phishing phrase (profiles.antiphish_phrase). Fail-
// safe: returns "" if the column/row is absent (e.g. before the migration runs).
async function sbUserPhrase(env, owner) {
  try {
    const url = env.SUPABASE_URL.replace(/\/+$/, "") +
      "/rest/v1/profiles?id=eq." + encodeURIComponent(owner) + "&select=antiphish_phrase&limit=1";
    const r = await fetch(url, { headers: _sbHeaders(env) });
    if (!r.ok) return "";
    const rows = await r.json().catch(() => null);
    return (Array.isArray(rows) && rows[0] && rows[0].antiphish_phrase) || "";
  } catch (_) { return ""; }
}

// ── Birdeye ─────────────────────────────────────────────────────────────────
// Default: go through the existing chartrunner-worker /v1/birdeye proxy (no key
// needed — it injects the key / handles auth exactly like the game client).
// If a personal BIRDEYE_API_KEY secret is set, call Birdeye directly instead.
function _bdBase(env) {
  return env.BIRDEYE_API_KEY
    ? (env.BIRDEYE_BASE || "https://public-api.birdeye.so").replace(/\/+$/, "")
    : (env.BIRDEYE_PROXY || "https://chartrunner-worker.jsg-951.workers.dev/v1/birdeye").replace(/\/+$/, "");
}
function _bdHeaders(env) {
  // Proxy mode sends no x-chain (worker defaults solana), matching the client.
  return env.BIRDEYE_API_KEY ? { "X-API-KEY": env.BIRDEYE_API_KEY, "x-chain": "solana" } : {};
}
async function bdOverview(env, mint) {
  const url = _bdBase(env) + "/defi/token_overview?address=" + encodeURIComponent(mint);
  const r = await fetch(url, { headers: _bdHeaders(env) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const d = j && j.data;
  if (!d) return null;
  return { price: Number(d.price), ch24: Number(d.priceChange24hPercent), vol24: Number(d.v24hUSD) };
}
async function bdVerdict(env, mint) {
  const url = _bdBase(env) + "/defi/token_security?address=" + encodeURIComponent(mint);
  const r = await fetch(url, { headers: _bdHeaders(env) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const d = j && j.data;
  if (!d || typeof d !== "object") return null;
  const has = (k) => Object.prototype.hasOwnProperty.call(d, k);
  const known = ["freezeAuthority", "freezeable", "mutableMetadata", "nonTransferable", "transferFeeEnable", "top10HolderPercent", "top10HolderPct", "lockInfo", "mintAuthority"];
  if (!known.some(has)) return "UNKNOWN";
  const freezeRisk = (d.freezeAuthority != null && d.freezeAuthority !== "") || d.freezeable === true;
  const mintRisk = d.mintAuthority != null && d.mintAuthority !== "";
  const nonTransfer = d.nonTransferable === true;
  const hard = mintRisk || freezeRisk || nonTransfer;
  let flags = 0;
  if (d.mutableMetadata === true) flags++;
  if (d.transferFeeEnable === true) flags++;
  let top10 = Number(d.top10HolderPercent);
  if (!isFinite(top10)) top10 = Number(d.top10HolderPct);
  if (isFinite(top10)) { if (top10 <= 1) top10 *= 100; if (top10 >= 30) flags++; }
  return hard ? "RISK" : flags ? "CAUTION" : "SAFE";
}

// ── Multi-source price (v1.0.761) ───────────────────────────────────────────
// Birdeye needs a key we don't hold and only covers SPL mints. To make ALL
// tokens work, resolve price/24h%/vol from (in order): CoinGecko → DexScreener
// (SPL catch-all, by mint) → Binance → Birdeye(direct, only if a key).
//
// CoinGecko is PRIMARY on the server because Binance frequently returns 451
// (geo/IP block) from a Cloudflare Worker's data-center IP, while CoinGecko +
// DexScreener work fine there. CoinGecko covers every listed coin (majors +
// most SPL) with one call; unlisted memecoins fall through to DexScreener.
// CoinGecko uses the COINGECKO_API_KEY secret if set, else the existing
// chartrunner-worker /v1/market proxy, else the keyless free tier.
function _cgBase(env) {
  if (env.COINGECKO_API_KEY) return "https://api.coingecko.com/api/v3";
  if (env.COINGECKO_PROXY) return env.COINGECKO_PROXY.replace(/\/+$/, "");
  return "https://api.coingecko.com/api/v3";
}
function _cgHeaders(env) { return env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY } : {}; }
function _cgShape(o) {
  if (!o || typeof o !== "object") return null;
  const p = Number(o.usd);
  if (!isFinite(p)) return null;
  return { price: p, ch24: Number(o.usd_24h_change), vol24: Number(o.usd_24h_vol) };
}
async function coingeckoByMint(env, mint) {
  if (!mint) return null;
  try {
    const url = _cgBase(env) + "/simple/token_price/solana?contract_addresses=" + encodeURIComponent(mint) +
      "&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true";
    const r = await fetch(url, { headers: _cgHeaders(env) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j || typeof j !== "object") return null;
    const vals = Object.values(j); // CG keys by (possibly re-cased) contract → take the single entry
    return vals.length ? _cgShape(vals[0]) : null;
  } catch (_) { return null; }
}
async function coingeckoById(env, cgId) {
  if (!cgId) return null;
  try {
    const url = _cgBase(env) + "/simple/price?ids=" + encodeURIComponent(cgId) +
      "&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true";
    const r = await fetch(url, { headers: _cgHeaders(env) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return j ? _cgShape(j[cgId]) : null;
  } catch (_) { return null; }
}
// Symbol → CoinGecko id for symbol-only majors (mirrors the client CR_TICKER_CGID).
const CGID = { BTC:"bitcoin", ETH:"ethereum", SOL:"solana", BNB:"binancecoin", XRP:"ripple", ADA:"cardano", DOGE:"dogecoin", AVAX:"avalanche-2", LINK:"chainlink", MATIC:"matic-network", POL:"matic-network", DOT:"polkadot", TRX:"tron", LTC:"litecoin", BCH:"bitcoin-cash", ATOM:"cosmos", NEAR:"near", APT:"aptos", ARB:"arbitrum", OP:"optimism", SUI:"sui", TON:"the-open-network", JUP:"jupiter-exchange-solana", BONK:"bonk", WIF:"dogwifcoin", JTO:"jito-governance-token", PYTH:"pyth-network", RAY:"raydium" };
function _cgId(symbol) { return CGID[String(symbol || "").toUpperCase()] || ""; }

async function binanceTicker(symbol) {
  const sym = String(symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!sym) return null;
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=" + sym + "USDT");
    if (!r.ok) return null; // 400 = no such symbol → fall through
    const d = await r.json().catch(() => null);
    if (!d || d.lastPrice == null) return null;
    return { price: Number(d.lastPrice), ch24: Number(d.priceChangePercent), vol24: Number(d.quoteVolume) };
  } catch (_) { return null; }
}
async function dexscreener(mint) {
  if (!mint) return null;
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + encodeURIComponent(mint));
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    const pairs = j && Array.isArray(j.pairs) ? j.pairs : [];
    let best = null, bestLiq = -1;
    for (const p of pairs) {
      const liq = Number(p && p.liquidity && p.liquidity.usd) || 0;
      if (liq > bestLiq) { bestLiq = liq; best = p; }
    }
    if (!best || best.priceUsd == null) return null;
    return {
      price: Number(best.priceUsd),
      ch24: Number(best.priceChange && best.priceChange.h24),
      vol24: Number(best.volume && best.volume.h24),
    };
  } catch (_) { return null; }
}
async function resolveOverview(env, symbol, mint) {
  // Mint-authoritative first (an SPL alert carries the exact mint → no ticker
  // collision with a same-symbol major): CoinGecko-by-mint, then DexScreener
  // (catch-all for unlisted memecoins). Then symbol/cgId for pure majors
  // (CoinGecko, then Binance as a last resort — it may 451 from a Worker).
  // Birdeye only if a personal key is set.
  let d;
  if (mint) {
    d = await coingeckoByMint(env, mint); if (d && isFinite(d.price)) return d;
    d = await dexscreener(mint);          if (d && isFinite(d.price)) return d;
  }
  const cgId = _cgId(symbol);
  if (cgId) { d = await coingeckoById(env, cgId); if (d && isFinite(d.price)) return d; }
  d = await binanceTicker(symbol); if (d && isFinite(d.price)) return d;
  if (env.BIRDEYE_API_KEY) { d = await bdOverview(env, mint); if (d && isFinite(d.price)) return d; }
  return null;
}

// ── Evaluation (mirrors crAlertEngine._evaluate) ────────────────────────────
// Returns { met, label, patch } — patch carries any baseline to write back.
function evaluate(a, ov, verdict) {
  const t = a.type;
  if (t === "safety") {
    if (!verdict) return { met: false, label: "", patch: null };
    if (!a.base_verdict) return { met: false, label: "Verdikt " + verdict, patch: { base_verdict: verdict } };
    const met = RANK[verdict] != null && RANK[a.base_verdict] != null ? RANK[verdict] > RANK[a.base_verdict] : false;
    return { met, label: "Verdikt " + verdict, patch: null };
  }
  if (!ov) return { met: false, label: "", patch: null };
  const thr = Number(a.threshold);
  if (!isFinite(thr)) return { met: false, label: "", patch: null }; // never fire on a bad threshold
  if (t === "price_above") { const p = ov.price; if (!isFinite(p)) return { met: false, label: "", patch: null }; return { met: p >= thr, label: fmtUsd(p), patch: null }; }
  if (t === "price_below") { const p = ov.price; if (!isFinite(p)) return { met: false, label: "", patch: null }; return { met: p <= thr, label: fmtUsd(p), patch: null }; }
  if (t === "pct_move") { const c = ov.ch24; if (!isFinite(c)) return { met: false, label: "", patch: null }; const met = thr >= 0 ? c >= thr : c <= thr; return { met, label: (c >= 0 ? "+" : "") + c.toFixed(1) + "%", patch: null }; }
  if (t === "vol_mult") {
    const v = ov.vol24; if (!isFinite(v)) return { met: false, label: "", patch: null };
    if (!(Number(a.base_vol) > 0)) return { met: false, label: "1.00×", patch: { base_vol: v } };
    const mult = v / Number(a.base_vol);
    return { met: mult >= thr, label: mult.toFixed(2) + "×", patch: null };
  }
  return { met: false, label: "", patch: null };
}
function fmtUsd(v) {
  if (!isFinite(v)) return "—";
  if (v >= 1000) return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return "$" + v.toFixed(2);
  if (v >= 0.01) return "$" + v.toFixed(4);
  return "$" + v.toFixed(6);
}
const TYPE_LABEL = {
  price_above: "Preis über", price_below: "Preis unter", pct_move: "24h-Änderung",
  vol_mult: "Volumen-Vielfaches", safety: "Safety verschlechtert",
};

// ── Resend ──────────────────────────────────────────────────────────────────
// v1.0.764 — industry-standard transactional email: 600px table layout, inline
// CSS (email clients strip <style>/flexbox), hidden preheader, bulletproof CTA,
// a plaintext alternative (deliverability + a11y), a List-Unsubscribe header and
// the recipient's anti-phishing phrase. One branded template for every mail this
// worker sends — the same visual language as the game and the auth mails.
const MAIL_SITE = "https://chartrunner.xyz";
function renderBrandedEmail(opts) {
  const o = opts || {};
  const heading = o.heading || "ChartRunner";
  const bodyHtml = o.bodyHtml || esc(o.bodyText || "").replace(/\n/g, "<br>");
  const ctaText = o.ctaText || "Open ChartRunner";
  const ctaUrl = o.ctaUrl || (MAIL_SITE + "/play/");
  const preheader = o.preheader || o.bodyText || heading;
  const phrase = String(o.phrase || "").trim();
  const settingsUrl = MAIL_SITE + "/play/";
  const phraseBlock = phrase
    ? '<tr><td style="padding:0 32px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #24406a;border-radius:10px;background:#0e1830"><tr><td style="padding:12px 14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#9fb4d6">' +
      '<span style="color:#6f86a8">Your security phrase</span><br><span style="color:#e7ecf5;font-weight:700;font-size:14px;letter-spacing:.4px">' + esc(phrase) + '</span><br>' +
      '<span style="color:#6f86a8">Every genuine ChartRunner email shows this. If it is missing or wrong, do not trust the email.</span></td></tr></table></td></tr>'
    : "";
  const html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="dark light"><meta name="x-apple-disable-message-reformatting"><title>' + esc(heading) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#06080f;-webkit-font-smoothing:antialiased">' +
    '<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">' + esc(preheader) + '</span>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06080f"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#0b1220;border:1px solid #1b2740;border-radius:16px;overflow:hidden">' +
      '<tr><td style="padding:22px 32px 6px"><span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:800;font-size:16px;letter-spacing:2px;color:#e7ecf5">CHART<span style="color:#14f195">RUNNER</span></span></td></tr>' +
      '<tr><td style="padding:6px 32px 0"><div style="height:2px;background:#14f195;border-radius:2px"></div></td></tr>' +
      '<tr><td style="padding:18px 32px 4px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:800;font-size:20px;color:#ffffff">' + esc(heading) + '</td></tr>' +
      '<tr><td style="padding:6px 32px 14px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#c7d2e4">' + bodyHtml + '</td></tr>' +
      '<tr><td style="padding:4px 32px 20px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#14f195">' +
        '<a href="' + esc(ctaUrl) + '" style="display:inline-block;padding:11px 22px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:700;font-size:14px;color:#04150d;text-decoration:none;border-radius:10px">' + esc(ctaText) + ' &rarr;</a>' +
      '</td></tr></table></td></tr>' +
      phraseBlock +
      '<tr><td style="padding:12px 32px 22px;border-top:1px solid #1b2740">' +
        '<p style="margin:12px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6f86a8">You are receiving this because you set up an alert or account on ChartRunner. Manage notifications in the app: <a href="' + esc(settingsUrl) + '" style="color:#3ddc97;text-decoration:none">Settings &middot; Notifications</a>.</p>' +
        '<p style="margin:8px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#4d5f7a">ChartRunner &middot; chartrunner.xyz &middot; Automated message — please do not reply.</p>' +
      '</td></tr>' +
    '</table></td></tr></table></body></html>';
  const lines = [heading, "", (o.bodyText || ""), "", ctaText + ": " + ctaUrl];
  if (phrase) lines.push("", "Your security phrase: " + phrase, "Every genuine ChartRunner email shows this — if it is missing or wrong, do not trust the email.");
  lines.push("", "— ChartRunner · chartrunner.xyz", "You are receiving this because you set up an alert or account. Manage notifications in the app.");
  return { html: html, text: lines.join("\n") };
}
async function sendMail(env, to, subject, bodyText, opts) {
  const o = opts || {};
  const built = renderBrandedEmail({
    heading: o.heading || "⏰ Alert triggered",
    bodyText: bodyText,
    ctaText: o.ctaText || "Open ChartRunner",
    ctaUrl: o.ctaUrl || (MAIL_SITE + "/play/"),
    preheader: o.preheader || bodyText,
    phrase: o.phrase || "",
  });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM || "ChartRunner <alerts@chartrunner.xyz>",
      to: [to],
      subject: subject,
      html: built.html,
      text: built.text,
      headers: { "List-Unsubscribe": "<" + MAIL_SITE + "/play/>" },
    }),
  });
  return r.ok;
}

// ── Core run ────────────────────────────────────────────────────────────────
async function runOnce(env) {
  const summary = { scanned: 0, checked: 0, fired: 0, mailed: 0, errors: 0 };
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) {
    // Birdeye needs no key (proxy). Without Supabase/Resend we can't read or
    // deliver — no-op the whole run rather than consuming alerts.
    return { ...summary, error: "missing_secrets" };
  }
  const limit = Math.max(1, Math.min(Number(env.MAX_PER_RUN) || 500, 1000));
  let alerts;
  try { alerts = await sbArmedAlerts(env, limit); } catch (e) { return { ...summary, error: String(e) }; }
  summary.scanned = alerts.length;

  // Only alerts that actually need a server mail (mail channel on). App-only
  // alerts are the browser tier's job.
  const mailAlerts = alerts.filter((a) => {
    let ch = a.channels;
    try { ch = typeof ch === "string" ? JSON.parse(ch) : ch || {}; } catch (_) { ch = {}; }
    a._ch = ch;
    // safety needs a mint (Birdeye); price/pct/vol work by symbol (Binance) OR
    // mint (DexScreener), so a symbol alone is enough for majors like BTC/ETH.
    const resolvable = a.type === "safety" ? !!a.mint : (!!a.symbol || !!a.mint);
    return ch && ch.mail === true && VALID_TYPES.has(a.type) && resolvable;
  });

  // Cache price/verdict lookups within this run.
  const ovCache = new Map();
  const vdCache = new Map();
  const emailCache = new Map();
  const phraseCache = new Map();
  const now = Date.now();

  for (const a of mailAlerts) {
    try {
      let ov = null, verdict = null;
      if (a.type === "safety") {
        if (!vdCache.has(a.mint)) vdCache.set(a.mint, await bdVerdict(env, a.mint).catch(() => null));
        verdict = vdCache.get(a.mint);
      } else {
        const ck = (a.asset || "") + "|" + (a.symbol || "") + "|" + (a.mint || "");
        if (!ovCache.has(ck)) ovCache.set(ck, await resolveOverview(env, a.symbol, a.mint).catch(() => null));
        ov = ovCache.get(ck);
      }
      const res = evaluate(a, ov, verdict);
      summary.checked++;

      const iso = new Date(now).toISOString();
      const basePatch = { last_checked: iso };
      if (res.label) basePatch.last_value = res.label;
      if (res.patch) Object.assign(basePatch, res.patch); // baseline write-back (never fires)

      let handled = false; // true once we've claimed+attempted delivery (basePatch already written)
      if (res.met) {
        const lastFired = a.last_fired_at ? Date.parse(a.last_fired_at) : 0;
        const inCooldown = a.recurring && lastFired && now - lastFired < REFIRE_MS;
        if (!inCooldown) {
          if (!emailCache.has(a.owner)) emailCache.set(a.owner, await sbUserEmail(env, a.owner).catch(() => ""));
          const email = emailCache.get(a.owner);
          if (!email) {
            // Can't deliver (no address on the account) — leave the alert ARMED
            // and retry next run rather than silently retiring it.
            summary.errors++;
          } else {
            // Claim FIRST, then mail (at-most-once): a successful claim write
            // keeps the armed query from re-selecting this row, so a dropped
            // post-mail write can't cause a duplicate e-mail. If the claim
            // write itself fails, we DON'T mail — it retries next run instead.
            const claim = Object.assign({}, basePatch, { triggered_at: iso, last_fired_at: iso });
            if (!a.recurring) claim.status = "triggered";
            let claimed = false;
            try { await sbPatchAlert(env, a.owner, a.id, claim); claimed = true; } catch (_) { summary.errors++; }
            if (claimed) {
              handled = true;
              summary.fired++;
              if (!phraseCache.has(a.owner)) phraseCache.set(a.owner, await sbUserPhrase(env, a.owner).catch(() => ""));
              const msg = a.symbol + ": " + (TYPE_LABEL[a.type] || a.type) + " — " + res.label;
              const mailed = await sendMail(env, email, "ChartRunner Alert · " + a.symbol, msg, {
                heading: "⏰ Alert · " + a.symbol,
                preheader: msg,
                phrase: phraseCache.get(a.owner),
              }).catch(() => false);
              if (mailed) summary.mailed++; else summary.errors++;
            }
          }
        }
      }
      if (!handled) await sbPatchAlert(env, a.owner, a.id, basePatch).catch(() => {});
    } catch (_) {
      summary.errors++;
    }
  }
  return summary;
}

export default {
  // Cron entry point.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runOnce(env).then((s) => { try { console.log("[alerts-cron]", JSON.stringify(s)); } catch (_) {} }));
  },

  // Optional token-gated manual trigger for testing (no public route bound).
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("run") !== "1") {
      return new Response("chartrunner-alerts-cron: cron worker. Use ?run=1&token=… to trigger manually.", { status: 200 });
    }
    if (!env.CRON_TEST_TOKEN || url.searchParams.get("token") !== env.CRON_TEST_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const s = await runOnce(env);
    return new Response(JSON.stringify(s, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  },
};
