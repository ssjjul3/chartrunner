/* ────────────────────────────────────────────────────────────────────────
 *  Binance Paper broker — REST testnet
 * ────────────────────────────────────────────────────────────────────────
 *  M1.5 driver. Uses Binance's USDT-M Futures testnet (testnet.binancefuture.com)
 *  for paper-trading with real venue mechanics: real orderbook, real
 *  fills, real partial-fills, real rejection rules — but fake money. The
 *  player gets a faucet of test USDT once they connect.
 *
 *  This file ships scaffolded but inert until M1.5. The submit() and
 *  cancel() bodies are placeholders that throw a clear "M1.5 wiring"
 *  error so the SDK fails loudly if the player picks this broker now.
 *
 *  Auth: HMAC-SHA256 signed query params. The user pastes their testnet
 *  API key + secret in Profile → Brokers (UI lands at M1.5).
 *
 *  Endpoints we'll use:
 *    POST /fapi/v1/order        submit
 *    DELETE /fapi/v1/order      cancel
 *    GET /fapi/v2/account       balance + positions
 * ──────────────────────────────────────────────────────────────────────── */

const TESTNET = 'https://testnet.binancefuture.com';

export const binancePaperBroker = {
  key:   'binance-paper',
  label: 'Binance Paper · testnet',
  state: 'pending',           // flips to 'paper' when M1.5 lands
  venue: 'binance-testnet',

  async submit(order){
    throw new Error(
      'binance-paper broker not yet wired (M1.5). ' +
      'Switch to mock for now: localStorage.cr_broker_v1 = "mock"'
    );
  },

  async cancel(id){
    throw new Error('binance-paper broker not yet wired (M1.5).');
  },

  async balance(){
    return null;
  },

  // Hint for the future submit() body — kept here so the wiring shape is
  // clear when M1.5 picks this back up.
  _plannedShape: {
    submit: { method: 'POST', path: '/fapi/v1/order', auth: 'HMAC-SHA256' },
    cancel: { method: 'DELETE', path: '/fapi/v1/order', auth: 'HMAC-SHA256' },
    base:   TESTNET,
  },
};
