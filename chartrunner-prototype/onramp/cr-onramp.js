/* ============================================================================
 * cr-onramp — Transak-backed on-chain onramp (EU/DE), USDC/SOL.
 * Staging key placeholder. T8 on-chain-first. Not wired into the game yet —
 * demo + drop-in module.
 *
 * Research: ChartRunner-Brain/raw/perplexity/2026-07-17-onramp-options-eu.md.
 * Transak was picked for its explicit EU/DE region logic + iframe/white-label.
 * Funds SOL or USDC directly ON SOLANA (on-chain-first) — no MoonPay/Sphere.
 *
 * Compliance: KYC happens INSIDE the Transak widget. ChartRunner never handles
 * funds or PII, and never touches card/SEPA rails — Transak shows those fees in
 * the widget itself. This module only opens the widget and relays its events.
 *
 * API surface:
 *   window.crOnramp.open({ wallet, asset:'SOL'|'USDC', amountEUR,
 *                          onSuccess, onClose })
 * ========================================================================== */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  // STAGING host. Production is 'https://global.transak.com'. Swap only after a
  // real production apiKey + KYC review. Keep the placeholder key OBVIOUS so no
  // one ships a demo build thinking it is wired to a real Transak account.
  var TRANSAK_HOST = 'https://global-stg.transak.com'; // staging environment
  var TRANSAK_API_KEY = 'REPLACE_ME_STAGING_KEY';      // <-- placeholder, not a real key

  var NETWORK = 'solana';
  var CRYPTO_LIST = 'SOL,USDC';   // on-chain-first: SOL + USDC on Solana only
  var FIAT = 'EUR';               // EU/DE default fiat

  // ── Build the Transak widget URL from a request ─────────────────────────────
  function buildUrl(req) {
    var asset = (req.asset === 'USDC') ? 'USDC' : 'SOL'; // default to SOL
    var params = {
      apiKey: TRANSAK_API_KEY,
      network: NETWORK,
      cryptoCurrencyList: CRYPTO_LIST,
      defaultCryptoCurrency: asset,
      fiatCurrency: FIAT,
      productsAvailed: 'BUY',
      hideMenu: 'true'
    };
    if (req.wallet) params.walletAddress = req.wallet;               // prefill dest wallet
    if (req.amountEUR) params.defaultFiatAmount = String(req.amountEUR);
    var q = Object.keys(params)
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
    return TRANSAK_HOST + '/?' + q;
  }

  // ── Modal overlay hosting the Transak iframe ────────────────────────────────
  function buildModal(url) {
    var overlay = document.createElement('div');
    overlay.className = 'cr-onramp-overlay';
    overlay.innerHTML =
      '<div class="cr-onramp-modal">' +
        '<div class="cr-onramp-bar">' +
          '<span>Fund wallet · <b>Transak</b> <em>(staging)</em></span>' +
          '<button class="cr-onramp-x" aria-label="Close">✕</button>' +
        '</div>' +
        '<iframe class="cr-onramp-frame" allow="camera;microphone;payment" ' +
          'src="' + url + '"></iframe>' +
      '</div>';
    return overlay;
  }

  // ── Public: open the widget ─────────────────────────────────────────────────
  function open(req) {
    req = req || {};
    var url = buildUrl(req);
    var overlay = buildModal(url);
    document.body.appendChild(overlay);

    var closed = false;
    function close(reason) {
      if (closed) return;
      closed = true;
      window.removeEventListener('message', onMessage);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof req.onClose === 'function') req.onClose(reason || 'closed');
    }

    // Transak posts window messages: { event_id, data }. We only care about the
    // ORDER lifecycle + the widget-close signal. Guard the origin loosely to the
    // Transak host family (staging + prod share the transak.com suffix).
    function onMessage(ev) {
      if (!ev || !ev.origin || ev.origin.indexOf('transak.com') === -1) return;
      var payload = ev.data || {};
      var id = payload.event_id || payload.eventName;
      if (!id) return;
      if (id === 'TRANSAK_ORDER_SUCCESSFUL' || id === 'TRANSAK_ORDER_COMPLETED') {
        if (typeof req.onSuccess === 'function') req.onSuccess(payload.data || payload);
        // Leave the widget open on success so the user sees the confirmation;
        // Transak emits TRANSAK_WIDGET_CLOSE when they dismiss it.
      } else if (id === 'TRANSAK_WIDGET_CLOSE' || id === 'TRANSAK_ORDER_CANCELLED') {
        close(id);
      }
    }

    window.addEventListener('message', onMessage);
    overlay.querySelector('.cr-onramp-x').addEventListener('click', function () { close('user'); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close('user'); });

    return { close: function () { close('api'); } };
  }

  // ── Inject minimal styles (dark palette, green/violet accents) ──────────────
  function injectStyles() {
    if (document.getElementById('cr-onramp-styles')) return;
    var css =
      '.cr-onramp-overlay{position:fixed;inset:0;background:rgba(4,6,12,.82);' +
        'display:flex;align-items:center;justify-content:center;z-index:9999;}' +
      '.cr-onramp-modal{width:420px;max-width:94vw;height:640px;max-height:92vh;' +
        'background:#0d1017;border:1px solid #7c4dff;border-radius:14px;overflow:hidden;' +
        'box-shadow:0 0 32px rgba(124,77,255,.35);display:flex;flex-direction:column;}' +
      '.cr-onramp-bar{display:flex;align-items:center;justify-content:space-between;' +
        'padding:10px 14px;color:#d6f5e3;font:13px/1.3 system-ui,sans-serif;' +
        'background:#11151f;border-bottom:1px solid #1e2430;}' +
      '.cr-onramp-bar b{color:#28e07a;}.cr-onramp-bar em{color:#7c4dff;font-style:normal;}' +
      '.cr-onramp-x{background:none;border:0;color:#8a93a6;font-size:16px;cursor:pointer;}' +
      '.cr-onramp-x:hover{color:#28e07a;}' +
      '.cr-onramp-frame{flex:1;width:100%;border:0;background:#0d1017;}';
    var el = document.createElement('style');
    el.id = 'cr-onramp-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  injectStyles();

  window.crOnramp = { open: open, buildUrl: buildUrl };
})();
