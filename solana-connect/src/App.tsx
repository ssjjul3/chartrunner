import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction } from '@solana/web3.js';

import { buildMemoInstruction } from './lib/memo';
import { txUrl, addressUrl, FAUCET_URL } from './lib/explorer';
import { lamportsToSol, truncatePubkey } from './lib/format';
import { buildSaveMapInstruction, fromHex } from './lib/cr-maps-program';
import {
  EntityType,
  ENTITY_TYPE_NAMES,
  buildSaveEntityIx,
  buildDeleteEntityIx,
  buildListEntityIx,
  buildBuyEntityIx,
  buildCancelListingIx,
  buildRecordRunIx,
  fromHex as fromHexRegistry,
  lamportsToSol as registryLamportsToSol,
} from './lib/cr-registry-program';

const CLUSTER = 'devnet' as const;

// Phase 0.9.6 — four runtime modes selected from URL params:
//   mode = 'memo'      → default; freeform memo demo (existing behavior)
//   mode = 'connect'   → ?next=play; wallet-only handshake before /play/
//   mode = 'save-map'  → legacy chartrunner_maps program (one-trick)
//   mode = 'registry'  → multi-entity chartrunner_registry program. Sub-action
//                        in ?action= determines which ix gets built:
//                          save-entity / list-entity / buy-entity / cancel-listing
type Mode = 'memo' | 'connect' | 'save-map' | 'registry';
type RegistryAction =
  | 'save-entity'
  | 'delete-entity'
  | 'list-entity'
  | 'buy-entity'
  | 'cancel-listing'
  | 'record-run';

interface SaveMapParams {
  name: string;
  hashHex: string;
  returnTo: string;   // e.g. /play/
}

interface RegistryParams {
  action:      RegistryAction;
  entityType:  EntityType;
  name:        string;
  // save-entity only:
  hashHex?:    string;
  royaltyBps?: number;
  // list-entity only:
  priceLamports?: bigint;
  // buy-entity only:
  seller?:     string;        // base58 pubkey of the seller
  // record-run only:
  runAsset?:        string;   // e.g. "BTCUSDT"
  runTimeframe?:    string;   // e.g. "15m"
  runScore?:        bigint;
  runSharpeX100?:   number;
  runDurationSecs?: number;
  runMapHash?:      string;   // 64-char hex (32 bytes)
  runNonce?:        bigint;   // unique per run for PDA derivation
  // all:
  returnTo:    string;
}

function pickInitialMemo(): string {
  // Deep-link from the game's topbar: ?memo=BTC-15m-funding_shorts-... lands here pre-filled.
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('memo');
  if (fromQuery && fromQuery.length > 0) return fromQuery.slice(0, 400);
  // Default — informative, identifies the source app.
  return 'ChartRunner devnet · proof of strategy · ' + new Date().toISOString();
}

// Phase 0.9.3 — wallet-gated entry. When the landing page sends the player here
// with ?next=play, we treat this app as the wallet-handshake step before the
// game loads. After connect we hand off to /play/?wallet=<pubkey>&adapter=<name>
// — the game persists those into localStorage.cr_wallet so all subsequent
// player data (Profile, Maps, Workbench) reads under that wallet's namespace.
function getNextTarget(): { path: string; isPlay: boolean } | null {
  try {
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next');
    const ret  = url.searchParams.get('return');
    if (next === 'play')        return { path: '../play/', isPlay: true };
    if (ret && ret.startsWith('/')) return { path: ret,    isPlay: ret.includes('/play') };
    return null;
  } catch (_) { return null; }
}

// Phase 0.9.4 — pull save-map params off the URL once on mount.
function getSaveMapParams(): SaveMapParams | null {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('action') !== 'save-map') return null;
    const name    = url.searchParams.get('name');
    const hashHex = url.searchParams.get('hash');
    const ret     = url.searchParams.get('return') || '/play/';
    if (!name || !hashHex) return null;
    if (name.length === 0 || name.length > 64) return null;
    if (!/^[0-9a-fA-F]{64}$/.test(hashHex))    return null;
    // Only allow same-origin returns; refuse arbitrary off-site URLs.
    if (!ret.startsWith('/'))                  return null;
    return { name, hashHex, returnTo: ret };
  } catch (_) { return null; }
}

// Phase 0.9.6 — pull registry-action params off the URL.
//
// URL conventions:
//   /solana-connect/?action=save-entity&type=2&name=Whale-Wake&hash=<64hex>&royalty=500&return=/play/
//   /solana-connect/?action=list-entity&type=2&name=Whale-Wake&price=500000000&return=/play/
//   /solana-connect/?action=buy-entity&seller=<base58>&type=2&name=Whale-Wake&return=/play/
//   /solana-connect/?action=cancel-listing&type=2&name=Whale-Wake&return=/play/
function getRegistryParams(): RegistryParams | null {
  try {
    const url = new URL(window.location.href);
    const action = url.searchParams.get('action');
    if (action !== 'save-entity'    && action !== 'delete-entity' &&
        action !== 'list-entity'    && action !== 'buy-entity' &&
        action !== 'cancel-listing' && action !== 'record-run')    return null;

    const ret = url.searchParams.get('return') || '/play/';
    if (!ret.startsWith('/'))       return null;

    // record-run carries its own field set (no entity name + type semantics);
    // we still tag it with entityType=Map for the union-type stub.
    if (action === 'record-run') {
      const runAsset     = url.searchParams.get('runAsset');
      const runTimeframe = url.searchParams.get('runTimeframe');
      const runScoreRaw  = url.searchParams.get('runScore');
      const runSharpeRaw = url.searchParams.get('runSharpeX100');
      const runDurRaw    = url.searchParams.get('runDurationSecs');
      const runMapHash   = url.searchParams.get('runMapHash');
      const runNonceRaw  = url.searchParams.get('runNonce');
      if (!runAsset || !runTimeframe || !runScoreRaw || !runMapHash || !runNonceRaw) return null;
      if (!/^[0-9a-fA-F]{64}$/.test(runMapHash)) return null;
      try {
        return {
          action: 'record-run',
          entityType: EntityType.Map,
          name: runAsset + ' · ' + runTimeframe,
          runAsset,
          runTimeframe,
          runScore:        BigInt(runScoreRaw),
          runSharpeX100:   parseInt(runSharpeRaw || '0', 10),
          runDurationSecs: parseInt(runDurRaw    || '0', 10),
          runMapHash,
          runNonce:        BigInt(runNonceRaw),
          returnTo: ret,
        };
      } catch (_) { return null; }
    }

    const typeRaw = url.searchParams.get('type');
    const name    = url.searchParams.get('name');
    if (typeRaw == null || name == null) return null;

    const entityType = parseInt(typeRaw, 10);
    if (!Number.isFinite(entityType) || entityType < 0 || entityType > 8) return null;
    if (name.length === 0 || name.length > 64) return null;

    const out: RegistryParams = {
      action: action as RegistryAction,
      entityType: entityType as EntityType,
      name,
      returnTo: ret,
    };

    if (action === 'save-entity') {
      const hashHex = url.searchParams.get('hash');
      if (!hashHex || !/^[0-9a-fA-F]{64}$/.test(hashHex)) return null;
      out.hashHex = hashHex;
      const r = parseInt(url.searchParams.get('royalty') || '0', 10);
      out.royaltyBps = (Number.isFinite(r) && r >= 0 && r <= 5000) ? r : 0;
    }
    if (action === 'list-entity') {
      const priceRaw = url.searchParams.get('price');
      if (!priceRaw) return null;
      try {
        const p = BigInt(priceRaw);
        if (p <= 0n) return null;
        out.priceLamports = p;
      } catch (_) { return null; }
    }
    if (action === 'buy-entity') {
      const seller = url.searchParams.get('seller');
      if (!seller) return null;
      try { new PublicKey(seller); } catch (_) { return null; }
      out.seller = seller;
      // optional price hint for display only — not used in the ix
      const priceRaw = url.searchParams.get('price');
      if (priceRaw) {
        try { out.priceLamports = BigInt(priceRaw); } catch (_) {}
      }
    }
    return out;
  } catch (_) { return null; }
}

function getMode(
  saveMap: SaveMapParams | null,
  registry: RegistryParams | null,
  nextTarget: ReturnType<typeof getNextTarget>,
): Mode {
  if (registry) return 'registry';
  if (saveMap)  return 'save-map';
  if (nextTarget) return 'connect';
  return 'memo';
}

export default function App() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, wallet } = useWallet();
  const nextTarget     = useMemo(getNextTarget, []);
  const saveMapParams  = useMemo(getSaveMapParams, []);
  const registryParams = useMemo(getRegistryParams, []);
  const mode: Mode     = useMemo(
    () => getMode(saveMapParams, registryParams, nextTarget),
    [saveMapParams, registryParams, nextTarget],
  );

  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [memoText, setMemoText] = useState<string>(pickInitialMemo);
  const [sending, setSending] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pubkeyB58 = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  // Fetch balance on connect + every 15s while connected.
  useEffect(() => {
    if (!publicKey) {
      setBalanceLamports(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed');
        if (!cancelled) setBalanceLamports(lamports);
      } catch (err) {
        // RPC blip — keep the previous balance, don't error.
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [connection, publicKey]);

  const sendMemo = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }
    const trimmed = memoText.trim();
    if (!trimmed) {
      setError('Memo cannot be empty');
      return;
    }
    if (trimmed.length > 500) {
      setError('Memo too long (max 500 chars to fit in one tx)');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const ix = buildMemoInstruction(trimmed, publicKey);
      const tx = new Transaction().add(ix);

      // v0.9.72 — Pin blockhash + fee payer BEFORE sendTransaction so the
      // wallet-adapter signs against this specific pair. Then confirm
      // against the SAME pair. The earlier shape (fetch fresh blockhash
      // post-send and confirm against that) opens a future validity
      // window that the tx — signed against an older window — can never
      // land in, producing the "block height exceeded" error.
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash    = latest.blockhash;
      tx.feePayer           = publicKey;
      const sig = await sendTransaction(tx, connection);

      const result = await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        'confirmed'
      );
      if (result.value.err) {
        throw new Error('Tx failed: ' + JSON.stringify(result.value.err));
      }
      setLastSig(sig);
      // Refresh balance after a successful tx.
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      setBalanceLamports(lamports);
    } catch (err: any) {
      // User-rejected: not an error, just a cancelled flow.
      if (err?.message && /user rejected|user denied|cancelled/i.test(err.message)) {
        setError(null);
        return;
      }
      setError(err?.message || String(err));
    } finally {
      setSending(false);
    }
  }, [connection, memoText, publicKey, sendTransaction]);

  // When the player came from "Play" on the landing page, hand off to the
  // game with the wallet address in the URL. The game's crWallet IIFE picks
  // it up on first paint and stashes it in localStorage.cr_wallet.
  const continueToTarget = useCallback(() => {
    if (!nextTarget || !pubkeyB58) return;
    const url = new URL(nextTarget.path, window.location.href);
    url.searchParams.set('wallet', pubkeyB58);
    if (wallet?.adapter.name) url.searchParams.set('adapter', wallet.adapter.name);
    window.location.href = url.toString();
  }, [nextTarget, pubkeyB58, wallet]);

  // Phase 0.9.4 — save_map call. Builds the Anchor instruction by hand
  // (no @coral-xyz/anchor dep), prompts the wallet to sign, then redirects
  // back to the game with the tx signature so the in-game Maps list can
  // show "saved on-chain · view ↗".
  const sendSaveMap = useCallback(async () => {
    if (!publicKey)     { setError('Wallet not connected'); return; }
    if (!saveMapParams) { setError('Missing save_map params'); return; }

    setSending(true);
    setError(null);
    try {
      const contentHash = fromHex(saveMapParams.hashHex);
      const ix = buildSaveMapInstruction({
        owner: publicKey,
        name: saveMapParams.name,
        contentHash,
      });
      const tx = new Transaction().add(ix);

      // v0.9.72 — see memo flow above for the rationale; same fix applied
      // to save_map: pin blockhash before send, confirm against same pair.
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash    = latest.blockhash;
      tx.feePayer           = publicKey;
      const sig = await sendTransaction(tx, connection);

      const result = await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        'confirmed'
      );
      if (result.value.err) {
        throw new Error('Tx failed: ' + JSON.stringify(result.value.err));
      }

      setLastSig(sig);

      // Hand the game a recap. /play/?savedMap=<name>&sig=<sig>
      // The crWallet IIFE strips ?wallet/?adapter; the game's Maps module
      // listens for ?savedMap and decorates the matching localStorage entry
      // with { onChain: true, sig, savedAt }.
      const back = new URL(saveMapParams.returnTo, window.location.href);
      back.searchParams.set('savedMap', saveMapParams.name);
      back.searchParams.set('sig', sig);
      // Preserve the wallet hand-off so the game stays connected on return.
      back.searchParams.set('wallet', publicKey.toBase58());
      if (wallet?.adapter.name) back.searchParams.set('adapter', wallet.adapter.name);
      // Brief pause so the user sees the success banner before redirect.
      window.setTimeout(() => { window.location.href = back.toString(); }, 1200);
    } catch (err: any) {
      if (err?.message && /user rejected|user denied|cancelled/i.test(err.message)) {
        setError(null);
        return;
      }
      setError(err?.message || String(err));
    } finally {
      setSending(false);
    }
  }, [connection, publicKey, saveMapParams, sendTransaction, wallet]);

  // Phase 0.9.6 — registry tx dispatcher. Builds the right ix from
  // registryParams.action, signs, confirms, then redirects back to the game
  // with a sub-action recap so the in-game UI can show "saved on-chain · view ↗".
  const sendRegistryTx = useCallback(async () => {
    if (!publicKey)        { setError('Wallet not connected'); return; }
    if (!registryParams)   { setError('Missing registry params'); return; }

    setSending(true);
    setError(null);
    try {
      // v0.9.8c — Explicit type so TS strict mode doesn't trip on
      // implicit-any. The switch must produce an ix in every reachable case;
      // we throw on missing-required-fields above each builder call so
      // execution can't continue with a half-built ix.
      let ix: import('@solana/web3.js').TransactionInstruction;
      switch (registryParams.action) {
        case 'save-entity': {
          if (!registryParams.hashHex) throw new Error('Missing hash');
          ix = buildSaveEntityIx({
            owner: publicKey,
            entityType: registryParams.entityType,
            name: registryParams.name,
            contentHash: fromHexRegistry(registryParams.hashHex),
            royaltyBps: registryParams.royaltyBps ?? 0,
          });
          break;
        }
        case 'list-entity': {
          if (!registryParams.priceLamports) throw new Error('Missing price');
          ix = buildListEntityIx({
            owner: publicKey,
            entityType: registryParams.entityType,
            name: registryParams.name,
            priceLamports: registryParams.priceLamports,
          });
          break;
        }
        case 'buy-entity': {
          if (!registryParams.seller) throw new Error('Missing seller');
          ix = buildBuyEntityIx({
            buyer: publicKey,
            seller: new PublicKey(registryParams.seller),
            entityType: registryParams.entityType,
            name: registryParams.name,
          });
          break;
        }
        case 'cancel-listing': {
          ix = buildCancelListingIx({
            seller: publicKey,
            entityType: registryParams.entityType,
            name: registryParams.name,
          });
          break;
        }
        case 'delete-entity': {
          // v0.9.8h — Closes the entity PDA, refunds rent (~0.0011 SOL).
          // Only owner can call (Anchor `has_one = owner` on the account).
          ix = buildDeleteEntityIx({
            owner: publicKey,
            entityType: registryParams.entityType,
            name: registryParams.name,
          });
          break;
        }
        case 'record-run': {
          if (!registryParams.runAsset || !registryParams.runTimeframe ||
              registryParams.runScore == null || !registryParams.runMapHash ||
              registryParams.runNonce == null) {
            throw new Error('Missing run-record fields');
          }
          ix = buildRecordRunIx({
            player:        publicKey,
            nonce:         registryParams.runNonce,
            asset:         registryParams.runAsset,
            timeframe:     registryParams.runTimeframe,
            score:         registryParams.runScore,
            sharpeX100:    registryParams.runSharpeX100   ?? 0,
            durationSecs:  registryParams.runDurationSecs ?? 0,
            mapHash:       fromHexRegistry(registryParams.runMapHash),
          });
          break;
        }
        default: {
          // Exhaustive switch guard. RegistryAction is a string-union of the
          // five cases above; this branch is unreachable. Throwing here keeps
          // TS strict-mode 'definitely-assigned' analysis happy without a
          // sentinel value.
          const _exhaustive: never = registryParams.action;
          throw new Error('Unhandled registry action: ' + _exhaustive);
        }
      }

      const tx = new Transaction().add(ix);

      // v0.9.72 — see memo flow for the rationale; same fix applied to
      // registry actions: pin blockhash before send, confirm same pair.
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash    = latest.blockhash;
      tx.feePayer           = publicKey;
      const sig = await sendTransaction(tx, connection);

      const result = await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        'confirmed',
      );
      if (result.value.err) {
        throw new Error('Tx failed: ' + JSON.stringify(result.value.err));
      }

      setLastSig(sig);

      // Hand back a recap to the game.
      const back = new URL(registryParams.returnTo, window.location.href);
      back.searchParams.set('regAction', registryParams.action);
      back.searchParams.set('regType',   String(registryParams.entityType));
      back.searchParams.set('regName',   registryParams.name);
      back.searchParams.set('sig',       sig);
      back.searchParams.set('wallet',    publicKey.toBase58());
      if (wallet?.adapter.name) back.searchParams.set('adapter', wallet.adapter.name);
      window.setTimeout(() => { window.location.href = back.toString(); }, 1200);
    } catch (err: any) {
      if (err?.message && /user rejected|user denied|cancelled/i.test(err.message)) {
        setError(null);
        return;
      }
      setError(err?.message || String(err));
    } finally {
      setSending(false);
    }
  }, [connection, publicKey, registryParams, sendTransaction, wallet]);

  return (
    <div className="page">
      <header className="hd">
        <div className="brand">
          <span className="brand-ico">🪙</span>
          <span className="brand-text">ChartRunner · Solana connect</span>
        </div>
        <span className="cluster-pill">devnet</span>
      </header>

      {mode === 'connect' && nextTarget?.isPlay && (
        <section className="banner banner-ok" style={{ margin: '0 0 16px' }}>
          {connected && pubkeyB58 ? (
            <>
              <div>
                <strong>Wallet ready.</strong> Connected as{' '}
                <code className="sig">{truncatePubkey(pubkeyB58)}</code> — your Profile, Maps,
                and Workbench data will load under this wallet.
              </div>
              <button className="btn-link" onClick={continueToTarget} style={{ fontWeight: 700 }}>
                ▶ Continue to ChartRunner →
              </button>
            </>
          ) : (
            <div>
              <strong>One step before you play.</strong> Connect a Solana wallet (Phantom,
              Backpack, or Solflare) so your Profile, Maps, and Workbench can load.
            </div>
          )}
        </section>
      )}

      {mode === 'save-map' && (
        <section className="banner banner-ok" style={{ margin: '0 0 16px' }}>
          <div>
            <strong>Save map on-chain.</strong>{' '}
            {connected
              ? 'Sign the transaction below to anchor this map under your wallet.'
              : 'Connect your wallet to sign the on-chain save.'}
          </div>
        </section>
      )}

      {mode === 'registry' && registryParams && (
        <section className="banner banner-ok" style={{ margin: '0 0 16px' }}>
          <div>
            <strong>
              {registryParams.action === 'save-entity'    && 'Save '}
              {registryParams.action === 'list-entity'    && 'List '}
              {registryParams.action === 'buy-entity'     && 'Buy '}
              {registryParams.action === 'cancel-listing' && 'Cancel listing for '}
              {ENTITY_TYPE_NAMES[registryParams.entityType]} on-chain.
            </strong>{' '}
            {connected
              ? 'Sign the transaction below to commit it to the chartrunner_registry program.'
              : 'Connect your wallet to sign.'}
          </div>
        </section>
      )}

      <main className="cards">
        <section className="card">
          <h2 className="card-h">Wallet</h2>
          <WalletMultiButton />
          {connected && pubkeyB58 && (
            <dl className="meta">
              <div>
                <dt>Wallet</dt>
                <dd>{wallet?.adapter.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>
                  <a
                    href={addressUrl(pubkeyB58, CLUSTER)}
                    target="_blank"
                    rel="noreferrer"
                    title={pubkeyB58}
                  >
                    {truncatePubkey(pubkeyB58)} ↗
                  </a>
                </dd>
              </div>
              <div>
                <dt>Balance</dt>
                <dd>
                  {lamportsToSol(balanceLamports)} SOL
                  {balanceLamports !== null && balanceLamports < 100_000 && (
                    <>
                      {' '}
                      <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="faucet-link">
                        get devnet SOL ↗
                      </a>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {mode === 'registry' && registryParams ? (
          <section className="card">
            <h2 className="card-h">
              {registryParams.action === 'save-entity'    && '🪙 Save '}
              {registryParams.action === 'delete-entity'  && '🗑 Unanchor '}
              {registryParams.action === 'list-entity'    && '📤 List '}
              {registryParams.action === 'buy-entity'     && '💰 Buy '}
              {registryParams.action === 'cancel-listing' && '✖ Cancel listing for '}
              {registryParams.action === 'record-run'     && '🏆 Record run on-chain'}
              {registryParams.action !== 'record-run' && ENTITY_TYPE_NAMES[registryParams.entityType]}
            </h2>
            <p className="card-sub">
              {registryParams.action === 'save-entity' && (
                <>Anchors a SHA-256 of this {ENTITY_TYPE_NAMES[registryParams.entityType].toLowerCase()} under
                your wallet in the chartrunner_registry program. Royalty {registryParams.royaltyBps ?? 0}/10000
                bps. ~0.0011 SOL rent.</>
              )}
              {registryParams.action === 'list-entity' && (
                <>Lists this entity for sale on the in-game P2P Marketplace. Other players sign a buy
                tx; SOL routes to your wallet (minus 5% protocol fee).</>
              )}
              {registryParams.action === 'buy-entity' && (
                <>Pays the seller for a license to this entity. You'll get a License PDA proving the
                purchase. Original creator keeps royalty rights for resales.</>
              )}
              {registryParams.action === 'cancel-listing' && (
                <>Removes this listing from the marketplace. Listing rent (~0.001 SOL) refunds to you.</>
              )}
              {registryParams.action === 'delete-entity' && (
                <>Closes the on-chain PDA for this entity. Rent (~0.0011 SOL) refunds to your wallet.
                Your local copy is preserved — you can re-anchor it later if you want.</>
              )}
              {registryParams.action === 'record-run' && (
                <>Anchors this completed run on-chain so other players see it as a ghost overlay
                on their own runs of the same asset + timeframe. Stores score, Sharpe, duration,
                and map hash. ~0.0011 SOL rent.</>
              )}
            </p>
            <dl className="meta">
              {registryParams.action === 'record-run' ? (
                <>
                  <div>
                    <dt>Asset · TF</dt>
                    <dd><code className="sig">{registryParams.runAsset} · {registryParams.runTimeframe}</code></dd>
                  </div>
                  <div>
                    <dt>Score</dt>
                    <dd><code className="sig">{registryParams.runScore?.toString()}</code></dd>
                  </div>
                  <div>
                    <dt>Sharpe</dt>
                    <dd>{((registryParams.runSharpeX100 ?? 0) / 100).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{registryParams.runDurationSecs}s</dd>
                  </div>
                </>
              ) : (
              <div>
                <dt>Entity</dt>
                <dd>
                  <code className="sig">{registryParams.name}</code>{' '}
                  <span style={{ opacity: 0.6, fontSize: 11 }}>
                    ({ENTITY_TYPE_NAMES[registryParams.entityType]})
                  </span>
                </dd>
              </div>
              )}
              {registryParams.hashHex && (
                <div>
                  <dt>Content hash</dt>
                  <dd>
                    <code className="sig" title={registryParams.hashHex}>
                      {registryParams.hashHex.slice(0, 8)}…{registryParams.hashHex.slice(-8)}
                    </code>
                  </dd>
                </div>
              )}
              {/* v0.9.8d — Coerce to boolean. Without `!!`, `bigint && JSX`
                  returns `0n` when priceLamports is zero, and React rejects
                  bigint as a ReactNode (TS2322). */}
              {!!registryParams.priceLamports && (
                <div>
                  <dt>Price</dt>
                  <dd>{registryLamportsToSol(registryParams.priceLamports).toFixed(4)} SOL</dd>
                </div>
              )}
              {registryParams.seller && (
                <div>
                  <dt>Seller</dt>
                  <dd>
                    <code className="sig" title={registryParams.seller}>
                      {truncatePubkey(registryParams.seller)}
                    </code>
                  </dd>
                </div>
              )}
              <div>
                <dt>Program</dt>
                <dd><code className="sig">chartrunner_registry</code></dd>
              </div>
            </dl>
            <div className="memo-meta" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>devnet</span>
              <button
                className="btn-primary"
                onClick={sendRegistryTx}
                disabled={!connected || sending}
              >
                {sending ? 'Signing… (waiting for confirmation)' : 'Sign + send'}
              </button>
            </div>

            {error && (
              <div className="banner banner-err">
                <strong>Failed:</strong> {error}
                <button className="banner-x" onClick={() => setError(null)} aria-label="Dismiss">×</button>
              </div>
            )}

            {lastSig && (
              <div className="banner banner-ok">
                <div>
                  <strong>Confirmed.</strong> Returning to game…{' '}
                  <code className="sig">{truncatePubkey(lastSig)}</code>
                </div>
                <a className="btn-link" href={txUrl(lastSig, CLUSTER)} target="_blank" rel="noreferrer">
                  View on Explorer ↗
                </a>
              </div>
            )}
          </section>
        ) : mode === 'save-map' && saveMapParams ? (
          <section className="card">
            <h2 className="card-h">Save map on-chain</h2>
            <p className="card-sub">
              ChartRunner is asking you to anchor this map's identity on Solana devnet.
              The map JSON itself stays in your browser — only the SHA-256 hash + name +
              timestamp go on-chain. Costs ~0.0009 SOL of rent (one-time per map name).
            </p>
            <dl className="meta">
              <div>
                <dt>Map name</dt>
                <dd><code className="sig">{saveMapParams.name}</code></dd>
              </div>
              <div>
                <dt>Content hash</dt>
                <dd>
                  <code className="sig" title={saveMapParams.hashHex}>
                    {saveMapParams.hashHex.slice(0, 8)}…{saveMapParams.hashHex.slice(-8)}
                  </code>
                </dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd><code className="sig">chartrunner_maps</code></dd>
              </div>
            </dl>
            <div className="memo-meta" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>devnet · ~0.0009 SOL rent</span>
              <button
                className="btn-primary"
                onClick={sendSaveMap}
                disabled={!connected || sending}
              >
                {sending ? 'Signing… (waiting for confirmation)' : '🪙 Save on-chain'}
              </button>
            </div>

            {error && (
              <div className="banner banner-err">
                <strong>Failed:</strong> {error}
                <button className="banner-x" onClick={() => setError(null)} aria-label="Dismiss">×</button>
              </div>
            )}

            {lastSig && (
              <div className="banner banner-ok">
                <div>
                  <strong>Saved on-chain.</strong> Returning to game…{' '}
                  <code className="sig">{truncatePubkey(lastSig)}</code>
                </div>
                <a className="btn-link" href={txUrl(lastSig, CLUSTER)} target="_blank" rel="noreferrer">
                  View on Explorer ↗
                </a>
              </div>
            )}
          </section>
        ) : (
        <section className="card">
          <h2 className="card-h">Sign a memo on devnet</h2>
          <p className="card-sub">
            Writes a UTF-8 memo to the Solana Memo program. Real signed transaction; the wallet
            popup will show "Devnet" and "Approve". Costs ~5,000 lamports.
          </p>
          <textarea
            className="memo-input"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            rows={3}
            placeholder="Memo text (UTF-8, max 500 chars)"
            disabled={sending}
          />
          <div className="memo-meta">
            <span>{memoText.length} / 500</span>
            <button
              className="btn-primary"
              onClick={sendMemo}
              disabled={!connected || sending}
            >
              {sending ? 'Sending… (waiting for confirmation)' : 'Send memo to devnet'}
            </button>
          </div>

          {error && (
            <div className="banner banner-err">
              <strong>Failed:</strong> {error}
              <button className="banner-x" onClick={() => setError(null)} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {lastSig && (
            <div className="banner banner-ok">
              <div>
                <strong>Sent + confirmed.</strong> Signature{' '}
                <code className="sig">{truncatePubkey(lastSig)}</code>
              </div>
              <a
                className="btn-link"
                href={txUrl(lastSig, CLUSTER)}
                target="_blank"
                rel="noreferrer"
              >
                View on Explorer ↗
              </a>
            </div>
          )}
        </section>
        )}

        <footer className="ft">
          <a href="../" className="ft-back">← Back to ChartRunner</a>
          <span className="ft-meta">
            Source: <a href="https://github.com/ssjjul3/chartrunner" target="_blank" rel="noreferrer">github.com/ssjjul3/chartrunner</a>{' '}
            · MIT
          </span>
        </footer>
      </main>
    </div>
  );
}
