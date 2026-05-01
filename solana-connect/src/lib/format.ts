import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function truncatePubkey(s: string): string {
  if (!s || s.length <= 10) return s;
  return s.slice(0, 4) + '…' + s.slice(-4);
}

export function lamportsToSol(lamports: number | null): string {
  if (lamports == null) return '—';
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}
