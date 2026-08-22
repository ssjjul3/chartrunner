/* Prueft chartrunner-prototype/wallet-probe.html.
 *
 * WAS DIESER TEST BEWEIST: dass die Seite den Handshake korrekt fuehrt, eine
 * Wallet erkennt, die sich nach Spezifikation registriert, und ehrlich
 * „keine Wallet" meldet, wenn keine da ist.
 *
 * WAS ER NICHT BEWEIST: dass echte Wallets sich genau so registrieren. Die
 * Attrappe unten spricht den Handshake so, wie die Seite ihn implementiert —
 * beide stammen aus derselben Annahme. Ob Phantom, Solflare und Backpack das
 * ebenso tun, entscheidet nur ein Aufruf im echten Browser auf der echten
 * Domain. Genau dafuer existiert die Seite.
 *
 * Aufruf:  npm i playwright && node scripts/check_wallet_probe_browser.cjs
 * Bewusst nicht in ci.yml — der CI-Job hat keinen Browser. */
const fs=require('node:fs'), path=require('node:path'), {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const FILE=path.resolve(__dirname,'..','chartrunner-prototype','wallet-probe.html');
let pass=0,fail=0;
const check=(n,c,x)=>{ c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(x!==undefined?' :: '+JSON.stringify(x):''))); };

(async()=>{
  const opts={headless:true};
  const cands=[process.env.CR_CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const root=process.env.PLAYWRIGHT_BROWSERS_PATH||'/opt/pw-browsers';
  try { for(const d of fs.readdirSync(root)) if(d.startsWith('chromium-')) cands.push(path.join(root,d,'chrome-linux','chrome')); } catch(_){}
  for(const c of cands) if(c&&fs.existsSync(c)){ opts.executablePath=c; break; }
  const b=await chromium.launch(opts);

  // ── A · ohne Wallet ──────────────────────────────────────────────
  let pg=await b.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e.message||e)));
  await pg.goto(pathToFileURL(FILE).href,{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(2200);
  console.log('\n-- ohne Wallet --');
  check('keine Page-Errors',errs.length===0,errs.slice(0,2));
  check('Verdikt meldet ehrlich „keine Wallet"',
    /Keine Wallet gefunden/.test(await pg.textContent('#verdict')));
  check('Zaehler steht auf 0', (await pg.textContent('#wCount'))==='0');
  check('Verbinden-Knopf ist gesperrt', await pg.getAttribute('#btnConn','disabled')!==null);
  check('app-ready wurde gesendet', /app-ready gesendet/.test(await pg.textContent('#log')));
  await pg.close();

  // ── B · mit Attrappen-Wallet, die sich VOR der Seite registriert ──
  pg=await b.newPage();
  await pg.addInitScript(()=>{
    const wallet={ name:'ProbeWallet', version:'1.0.0', icon:'',
      chains:['solana:devnet','solana:mainnet'],
      accounts:[{address:'7xKXtg2CW3iaFakeAddr111111111111111111111',chains:['solana:devnet'],features:[]}],
      features:{
        'standard:connect':{version:'1.0.0',connect:async()=>({accounts:wallet.accounts})},
        'solana:signAndSendTransaction':{version:'1.0.0',signAndSendTransaction:async()=>[{signature:new Uint8Array(64)}]},
        'solana:signTransaction':{version:'1.0.0',signTransaction:async()=>[]},
      }};
    const announce=()=>window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet',{detail:api=>{
      (typeof api==='function'?api:api.register)(wallet);
    }}));
    window.addEventListener('wallet-standard:app-ready',announce);
    announce();
  });
  await pg.goto(pathToFileURL(FILE).href,{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(2200);
  console.log('\n-- mit Wallet --');
  check('Wallet wird gefunden',(await pg.textContent('#wCount'))==='1');
  check('Handshake als beantwortet gemeldet',(await pg.textContent('#wHandshake'))==='ja');
  check('signAndSendTransaction erkannt',(await pg.textContent('#fSas'))==='vorhanden');
  check('Netze gelesen',/solana:devnet/.test(await pg.textContent('#fChains')));
  check('Verdikt kippt auf „traegt"',/Traegt/.test(await pg.textContent('#verdict')));
  check('Verbinden-Knopf freigegeben', await pg.getAttribute('#btnConn','disabled')===null);
  await pg.click('#btnConn'); await pg.waitForTimeout(400);
  check('connect liefert die Adresse',/7xKXtg2CW3ia/.test(await pg.textContent('#cAcct')));
  await pg.close();

  await b.close();
  console.log('\n'+pass+' ok, '+fail+' fail');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
