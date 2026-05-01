import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';

import { buildMemoInstruction } from './lib/memo';
import { txUrl, addressUrl, FAUCET_URL } from './lib/explorer';
import { lamportsToSol, truncatePubkey } from './lib/format';
import { buildSaveMapInstruction, fromHex } from './lib/cr-maps-program';

const CLUSTER = 'devnet' as const;

// Phase 0.9.4 — three operating modes selected from URL params:
//   mode = 'memo'      → default; freeform memo demo (existing behavior)
//   mode = 'connect'   → ?next=play; wallet-only handshake before /play/
//   mode = 'save-map'  → ?action=save-map&name=&hash=&return=; one-shot
//                        save_map tx, then redirect back to the game
type Mode = 'memo' | 'connect' | 'save-map';

interface SaveMapParams {
  name: string;
  hashHex: string;
  returnTo: string;   // e.g. /play/
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

function getMode(saveMap: SaveMapParams | null, nextTarget: ReturnType<typeof getNextTarget>): Mode {
  if (saveMap) return 'save-map';
  if (nextTarget) return 'connect';
  return 'memo';
}

export default function App() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, wallet } = useWallet();
  const nextTarget    = useMemo(getNextTarget, []);
  const saveMapParams = useMemo(getSaveMapParams, []);
  const mode: Mode    = useMemo(() => getMode(saveMapParams, nextTarget),
    [saveMapParams, nextTarget]);

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

      // wallet-adapter handles: blockhash injection, fee payer, signing,
      // submitting via the connection, and returning the signature.
      const sig = await sendTransaction(tx, connection);

      // Confirm with a FRESH blockhash (the signed tx's blockhash may have
      // expired before confirmation completes; use the latest).
      const latest = await connection.getLatestBlockhash('confirmed');
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

      const sig = await sendTransaction(tx, connection);

      const latest = await connection.getLatestBlockhash('confirmed');
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

        {mode === 'save-map' && saveMapParams ? (
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
            Source: <a href="https://github.com/" target="_blank" rel="noreferrer">github.com/&lt;you&gt;/chartrunner</a>{' '}
            · MIT
          </span>
        </footer>
      </main>
    </div>
  );
}
