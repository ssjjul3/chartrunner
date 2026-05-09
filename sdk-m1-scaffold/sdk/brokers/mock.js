/* ────────────────────────────────────────────────────────────────────────
 *  Mock broker — in-memory fills, current behaviour
 * ────────────────────────────────────────────────────────────────────────
 *  Default driver. Every order returns immediately with a synthesized
 *  fill at the requested price. No network, no rate limits, no fees.
 *  This is the only driver that works with zero infra — useful for the
 *  free play loop, education chapters, and CI tests.
 *
 *  Order shape (matches ChartRunnerSDK contract):
 *    { side: 'buy'|'sell', size: number, price?: number, type: 'market'|'limit' }
 *
 *  Fill shape:
 *    { id, side, size, price, ts, venue: 'mock' }
 * ──────────────────────────────────────────────────────────────────────── */

let _seq = 1;

export const mockBroker = {
  key:   'mock',
  label: 'Mock · in-memory',
  state: 'paper',
  venue: 'mock',

  async submit(order){
    const id = 'mock-' + (_seq++);
    // Synthesize a fill at the requested price (or 0 if missing).
    const fillPrice = (typeof order.price === 'number' && isFinite(order.price))
      ? order.price : 0;
    return {
      id,
      side:  order.side,
      size:  order.size,
      price: fillPrice,
      ts:    Date.now(),
      venue: 'mock',
    };
  },

  async cancel(id){
    // No-op; mock orders fill instantly so there's nothing to cancel.
    return { id, status: 'no-op' };
  },

  async balance(){
    // Mock balance is tracked client-side by the game; broker returns null.
    return null;
  },
};
