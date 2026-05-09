# Broker drivers · M1.4

Three drivers behind one interface. ChartRunnerSDK reads `currentBroker()` for every order route.

| Key | Label | State | Venue | Lands |
|---|---|---|---|---|
| `mock` | Mock · in-memory | paper | mock | Default · ships in M1.4 |
| `binance-paper` | Binance Paper · testnet | pending | binance-testnet | M1.5 wiring |
| `phoenix` | Phoenix · Solana CLOB | pending | phoenix-solana | M3 — awaiting `@ellipsis-labs/phoenix-sdk` npm publish |

## Switching brokers

```js
import { setBroker, listBrokers, currentBroker } from '@chartrunner/core/brokers';

setBroker('mock');                       // in-memory fills (default)
setBroker('binance-paper');              // testnet (errors until M1.5)
setBroker('phoenix');                    // on-chain (errors until npm publish)

console.log(listBrokers());              // [{ key, label, state, venue }, ...]
console.log(currentBroker().label);
```

The active broker persists to `localStorage.cr_broker_v1`. Boot calls `restoreBroker()` to rehydrate.

## Driver contract

Every driver exports an object with this shape:

```ts
interface Broker {
  key:   string;
  label: string;
  state: 'live' | 'paper' | 'pending';
  venue: string;
  submit(order): Promise<Fill>;
  cancel(id):    Promise<{ id, status }>;
  balance():     Promise<{ usdt?: number, sol?: number } | null>;
}

interface Order { side: 'buy'|'sell'; size: number; price?: number; type: 'market'|'limit'; }
interface Fill  { id: string; side: 'buy'|'sell'; size: number; price: number; ts: number; venue: string; }
```

## Phoenix npm watch

The `phoenix` driver throws until `@ellipsis-labs/phoenix-sdk` publishes the version that exposes the IOC/GTC/post-only flag set we need for Blue-Laser TWAP and Ladder routes.

When the publish lands:

1. `npm install @ellipsis-labs/phoenix-sdk`
2. Replace `submit()` body in `phoenix.js` per the comment block at the top of that file
3. Wire `cancel()` to the corresponding `cancelOrderIx`
4. Add the `record_run` instruction call to `chartrunner_registry` after each successful fill
5. Bump driver `state` from `'pending'` → `'live'`

That's M3.

## Why the abstraction matters

Shift 1 from the Chapter 39 capstone: **the SDK becomes a broker router.** Same SDK call, different settlement venue. Educational play uses `mock`; the user graduates to `binance-paper` for real orderbook mechanics with fake money; finally to `phoenix` for on-chain trades that show up in the player's record on Solana.

Tools (brackets, ladders, OCOs, REF lines) stay identical — they're just orderbook artifacts now. That's Shift 2.

Settlement on chain via Phoenix posts every fill to `chartrunner_registry`. That's Shift 3.
