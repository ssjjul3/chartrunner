import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';

import { buildMemoInstruction } from './lib/memo';
import { txUrl, addressUrl, FAUCET_URL } from './lib/explorer';
import { lamportsToSol, truncatePubkey } from './lib/format';

const CLUSTER = 'devnet' as const;

function pickInitialMemo(): string {
  // Deep-link from the game's topbar: ?memo=BTC-15m-funding_shorts-... lands here pre-filled.
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('memo');
  if (fromQuery && fromQuery.length > 0) return fromQuery.slice(0, 400);
  // Default — informative, identifies the source app.
  return 'ChartRunner devnet · proof of strategy · ' + new Date().toISOString();
}

export default function App() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, wallet } = useWallet();

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

  return (
    <div className="page">
      <header className="hd">
        <div className="brand">
          <span className="brand-ico">🪙</span>
          <span className="brand-text">ChartRunner · Solana connect</span>
        </div>
        <span className="cluster-pill">devnet</span>
      </header>

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
