/* Verifikation v1.0.941 — die Sicherheits-Alarmmail faellt nicht mehr still aus.
 *
 * Lage: bdVerdict() laeuft ohne BIRDEYE_API_KEY ueber /v1/birdeye des
 * Geld-Workers; dessen Birdeye-Haelfte ist entfernt. Hier wird genau das
 * gestellt (404 auf token_security) und geprueft, dass der Lauf
 *   · last_value auf den Ausfall-Satz setzt (die Alarmliste zeigt ihn),
 *   · GENAU EINE Mail je Ausfall-Episode schickt (nicht bei jedem Lauf),
 *   · NICHT feuert (kein triggered_at, kein status-Wechsel),
 *   · und dass ein wieder lesbares Verdikt den Satz ueberschreibt.
 * Keine Messung am laufenden System — reine Logikpruefung gegen Stubs.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const MOD = pathToFileURL(path.resolve('workers/alerts-cron/src/index.js')).href;
const worker = (await import(MOD)).default;

let pass = 0, fail = 0;
const check = (n, c, x) => { if(c){ pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };

const ALERT = {
  owner: 'u1', id: 'a1', asset: 'bonk', symbol: 'BONK',
  mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  type: 'safety', threshold: 0, channels: { mail: true }, recurring: false,
  status: 'armed', base_vol: null, base_verdict: null, last_fired_at: null, last_value: null,
};

function harness({ verdictOk }){
  const patches = [], mails = [];
  const row = { ...ALERT };
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
    if(u.includes('/rest/v1/cr_alerts') && (!opts || !opts.method)) return J([row]);
    if(u.includes('/rest/v1/cr_alerts') && opts && opts.method === 'PATCH'){
      const p = JSON.parse(opts.body); patches.push(p); Object.assign(row, p); return J({});
    }
    if(u.includes('/rest/v1/profiles')) return J([{ antiphish_phrase: 'blue otter' }]);
    if(u.includes('/auth/v1/admin/users')) return J({ email: 'j@example.com' });
    if(u.includes('/rest/v1/cr_follows')) return J([]);
    if(u.includes('token_security')){
      return verdictOk
        ? J({ data: { freezeAuthority: null, mutableMetadata: false, top10HolderPercent: 4 } })
        : new Response('not found', { status: 404 });
    }
    if(u.includes('api.resend.com')){ mails.push(JSON.parse(opts.body)); return J({ id: 'm1' }); }
    return J({});
  };
  return { patches, mails, row };
}

const env = { SUPABASE_URL: 'https://sb.example', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r', CRON_TEST_TOKEN: 't' };
const run = async () => {
  const req = new Request('https://w.example/?run=1&token=t');
  const res = await worker.fetch(req, env, { waitUntil(){} });
  return res.json();
};

// ── 1. Verdikt nicht lesbar ────────────────────────────────────────────────
{
  const h = harness({ verdictOk: false });
  const s1 = await run();
  check('Lauf 1: der Ausfall wird gezaehlt', s1.unreadable === 1, s1);
  check('Lauf 1: nicht gefeuert', s1.fired === 0, s1);
  check('Lauf 1: last_value traegt den Ausfall-Satz', /nicht moeglich/.test(String(h.row.last_value)), h.row.last_value);
  check('Lauf 1: der Alarm bleibt scharf', h.row.status === 'armed' && !h.row.triggered_at, h.row.status);
  check('Lauf 1: genau eine Mail', h.mails.length === 1, h.mails.length);
  check('Lauf 1: die Mail sagt, dass NICHT geprueft werden konnte',
    h.mails.length === 1 && /nicht moeglich/.test(h.mails[0].subject), h.mails[0] && h.mails[0].subject);

  const s2 = await run();
  check('Lauf 2: KEINE zweite Mail in derselben Ausfall-Episode', h.mails.length === 1, h.mails.length);
  check('Lauf 2: der Ausfall wird weiter gezaehlt', s2.unreadable === 1, s2);
}

// ── 2. Verdikt wieder lesbar ───────────────────────────────────────────────
{
  const h = harness({ verdictOk: true });
  const s = await run();
  check('lesbares Verdikt: kein Ausfall', s.unreadable === 0, s);
  check('lesbares Verdikt: last_value traegt das Verdikt', /Verdikt/.test(String(h.row.last_value)), h.row.last_value);
  check('lesbares Verdikt: Grundlinie gesetzt, nicht gefeuert', h.row.base_verdict === 'SAFE' && s.fired === 0, { bv: h.row.base_verdict, f: s.fired });
  check('lesbares Verdikt: keine Ausfall-Mail', h.mails.length === 0, h.mails.length);
}

console.log('\n' + pass + ' ok, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
