/**
 * ChartRunner — server-side price catalog for the ownership worker.
 *
 * The one job of this file: a price NEVER comes from the request. A client that
 * says "I paid 0.001 SOL for the Pro tier" is making a claim about a number the
 * server is supposed to know. If the server had to be told the price, the whole
 * on-chain check would be theatre.
 *
 * Shape of an entry, keyed `<item_kind>:<item_id>`:
 *
 *   'tier:pro': {
 *     price_lamports: 250000000,     // exact minimum the treasury must receive
 *     treasury: '<base58>',          // optional — overrides OWNERSHIP_TREASURY
 *   }
 *
 * The catalog is EMPTY on purpose. Today ChartRunner sells nothing for SOL:
 * bots and gear cost $RUN (a soft currency — provenance 'softcurrency', never
 * verified), campaign unlocks are 'campaign'. An empty catalog therefore is not
 * an oversight, it is the true state of the shop, and every purchase_onchain
 * grant is refused with `item_not_in_catalog` until a real price is added here.
 * Inventing a placeholder price would mean a live price nobody set.
 *
 * OWNERSHIP_CATALOG_JSON (a wrangler [vars] entry, NOT a secret) may replace
 * the map wholesale — same shape, JSON — so a price change is a config change.
 * It is still server-side: only whoever can deploy the worker can set it.
 */

export const CATALOG = Object.freeze({});

/** Parse the env override once per request; a broken override is an outage, not a default. */
export function catalogFrom(env) {
  const raw = (env && env.OWNERSHIP_CATALOG_JSON) || '';
  if (!raw.trim()) return CATALOG;
  const parsed = JSON.parse(raw); // throws on garbage — see callers: 503, never a silent {}
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OWNERSHIP_CATALOG_JSON must be a JSON object');
  }
  return parsed;
}

/** null = this item has no server-side price, so it cannot be bought on-chain. */
export function catalogLookup(env, itemKind, itemId) {
  const key = String(itemKind || '') + ':' + String(itemId || '');
  const entry = catalogFrom(env)[key];
  if (!entry || typeof entry !== 'object') return null;
  const lamports = Number(entry.price_lamports);
  if (!Number.isSafeInteger(lamports) || lamports <= 0) return null;
  return { key, price_lamports: lamports, treasury: entry.treasury || '', mint: entry.mint || '' };
}

export function catalogKeys(env) {
  try {
    return Object.keys(catalogFrom(env));
  } catch (_) {
    return null; // caller reports the break; it must not look like "no items"
  }
}
