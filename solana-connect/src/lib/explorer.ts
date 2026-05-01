/**
 * Solana Explorer URL builders. We default to devnet; pass 'mainnet-beta'
 * explicitly when ready. Never call these from a hardcoded place — always
 * thread the cluster down so we can never accidentally point a devnet sig
 * at the mainnet explorer.
 */
export type Cluster = 'devnet' | 'mainnet-beta' | 'testnet';

export function txUrl(signature: string, cluster: Cluster = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function addressUrl(address: string, cluster: Cluster = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

export const FAUCET_URL = 'https://faucet.solana.com/';
