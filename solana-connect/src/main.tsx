import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { Adapter } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

import App from './App';

import '@solana/wallet-adapter-react-ui/styles.css';
import './styles.css';

const endpoint = clusterApiUrl('devnet');

// Empty list — wallet-adapter v0.15+ auto-discovers Wallet Standard wallets
// (Phantom, Backpack, Solflare, Glow, etc.) at runtime. No explicit adapters
// needed for the modern wallets we care about.
const wallets: Adapter[] = [];

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
