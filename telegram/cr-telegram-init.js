/* ChartRunner — Telegram Mini App init
 * Loads at the bottom of <body> in /telegram/index.html, which is a direct
 * copy of ChartRunner_Prototype.html. This script:
 *   1. Detects Telegram WebApp environment via window.Telegram.WebApp
 *   2. Calls ready() / expand() / setHeaderColor() with safe try/catch
 *   3. Shows a floating "🪙 Connect TON Wallet" button when running inside Telegram
 *   4. On click, opens Telegram Wallet (in-Telegram) or Tonkeeper universal handoff
 *   5. Persists the TON address (if returned) to localStorage `cr_ton_wallet_v1`
 *   6. The existing Phantom/Solana wallet flow in the prototype is UNTOUCHED
 *      — they coexist as parallel identities, linked to the same browser/account
 *      via shared localStorage on the chartrunner.xyz origin.
 *
 * v0.1 — 2026-05-19. Shipped after the simplified mobile shell was retired
 * in favor of the real prototype.
 */
(function () {
  'use strict';
  var BG = '#050912';
  var GREEN = '#14f195';
  var VIOLET = '#9945ff';
  var STORAGE_KEY_TON = 'cr_ton_wallet_v1';
  var TELEGRAM_WALLET_URL = 'https://t.me/wallet?startattach=wallet';
  var TONKEEPER_HANDOFF = 'https://app.tonkeeper.com/ton-connect';
  var MANIFEST_URL = (typeof window !== 'undefined' && window.location)
    ? (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/tonconnect-manifest.json')
    : '';

  function getWebApp() {
    try { return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null; }
    catch (_) { return null; }
  }

  function initTelegramWebApp() {
    var w = getWebApp();
    if (!w) return false;
    try { w.ready(); } catch (_) {}
    try { w.expand(); } catch (_) {}
    try { if (typeof w.setHeaderColor === 'function') w.setHeaderColor(BG); } catch (_) {}
    try { if (typeof w.setBackgroundColor === 'function') w.setBackgroundColor(BG); } catch (_) {}
    try { if (typeof w.setBottomBarColor === 'function') w.setBottomBarColor(BG); } catch (_) {}
    try { document.documentElement.setAttribute('data-cr-telegram', '1'); } catch (_) {}
    return true;
  }

  function readTonState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_TON);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function writeTonState(obj) {
    try { localStorage.setItem(STORAGE_KEY_TON, JSON.stringify(obj)); } catch (_) {}
  }

  function clearTonState() {
    try { localStorage.removeItem(STORAGE_KEY_TON); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('crTelegramBtnStyles')) return;
    var css = ''
      + '#crTelegramTonBtn{'
      +   'position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:8px;'
      +   'z-index:99998;pointer-events:auto;'
      +   'display:inline-flex;align-items:center;gap:6px;'
      +   'padding:6px 10px;'
      +   'background:rgba(8,12,22,.85);'
      +   'border:1px solid ' + GREEN + ';'
      +   'border-radius:6px;'
      +   'color:' + GREEN + ';'
      +   'font:700 11px ui-monospace,Menlo,Consolas,monospace;'
      +   'letter-spacing:.05em;text-transform:uppercase;'
      +   'cursor:pointer;'
      +   'box-shadow:0 4px 14px rgba(20,241,149,.18),0 0 0 1px rgba(20,241,149,.18) inset;'
      +   'transition:all .12s ease;'
      + '}'
      + '#crTelegramTonBtn:hover{background:rgba(20,241,149,.18);color:#fff;}'
      + '#crTelegramTonBtn.is-connected{border-color:' + VIOLET + ';color:' + VIOLET + ';box-shadow:0 4px 14px rgba(153,69,255,.18),0 0 0 1px rgba(153,69,255,.18) inset;}'
      + '#crTelegramTonBtn .crTonDot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor;}'
      + '#crTelegramTonBanner{'
      +   'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 50px);transform:translateX(-50%);'
      +   'z-index:99997;pointer-events:none;'
      +   'padding:6px 12px;background:rgba(8,12,22,.92);border:1px solid ' + GREEN + ';'
      +   'border-radius:5px;color:' + GREEN + ';'
      +   'font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.05em;text-transform:uppercase;'
      +   'box-shadow:0 4px 14px rgba(0,0,0,.5);'
      +   'opacity:0;transition:opacity .2s ease;'
      + '}'
      + '#crTelegramTonBanner.on{opacity:1;}'
      + 'html:not([data-cr-telegram]) #crTelegramTonBtn{display:none;}';
    var style = document.createElement('style');
    style.id = 'crTelegramBtnStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderBtn() {
    var btn = document.getElementById('crTelegramTonBtn');
    if (!btn) return;
    var st = readTonState();
    if (st && st.address) {
      btn.classList.add('is-connected');
      var short = st.address.length > 10
        ? st.address.slice(0, 4) + '…' + st.address.slice(-4)
        : st.address;
      btn.innerHTML = '<span class="crTonDot"></span><span>TON · ' + short + '</span>';
    } else {
      btn.classList.remove('is-connected');
      btn.innerHTML = '<span class="crTonDot"></span><span>Connect TON</span>';
    }
  }

  function showBanner(text) {
    var b = document.getElementById('crTelegramTonBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'crTelegramTonBanner';
      document.body.appendChild(b);
    }
    b.textContent = text;
    b.classList.add('on');
    setTimeout(function () { b.classList.remove('on'); }, 2400);
  }

  function openConnect() {
    var w = getWebApp();
    var st = readTonState();
    if (st && st.address) {
      // Toggle disconnect on second click
      clearTonState();
      renderBtn();
      showBanner('TON disconnected');
      return;
    }
    // Mark pending so UI reflects the open handoff
    writeTonState({ status: 'pending', t: Date.now() });
    renderBtn();
    var tonkeeperUrl = TONKEEPER_HANDOFF + '?manifestUrl=' + encodeURIComponent(MANIFEST_URL);
    if (w && typeof w.openTelegramLink === 'function') {
      try { w.openTelegramLink(TELEGRAM_WALLET_URL); } catch (_) {
        try { window.open(TELEGRAM_WALLET_URL, '_blank', 'noopener,noreferrer'); } catch (__) {}
      }
    } else {
      try { window.open(tonkeeperUrl, '_blank', 'noopener,noreferrer'); } catch (_) {}
    }
    showBanner('Wallet handoff opened…');
    // Phase 1: no real signed proof yet — wallet apps return via deep link.
    // When TON Connect SDK is wired (Phase 2), the callback writes
    // { status: 'connected', address: '...' } into localStorage and renderBtn()
    // is called via storage event. For now leave the 'pending' badge so the
    // user can manually paste their address later or we ship a Phase 2 follow-up.
  }

  function injectButton() {
    if (document.getElementById('crTelegramTonBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'crTelegramTonBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Connect TON Wallet');
    btn.addEventListener('click', openConnect);
    document.body.appendChild(btn);
    renderBtn();
  }

  function listenStorage() {
    try {
      window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY_TON) renderBtn();
      });
    } catch (_) {}
  }

  function bootstrap() {
    var inTelegram = initTelegramWebApp();
    injectStyles();
    injectButton();
    listenStorage();
    if (inTelegram) {
      try { console.log('[ChartRunner Telegram] Mini App ready · TON Connect available'); } catch (_) {}
    } else {
      try { console.log('[ChartRunner Telegram] Browser fallback — TON button hidden until inside Telegram'); } catch (_) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
