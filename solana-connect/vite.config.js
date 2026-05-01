import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// IMPORTANT: base must match the path where this app is hosted.
// On GitHub Pages it's served from /<repo>/solana-connect/.
// VITE_BASE is set by the deploy workflow; defaults to '/' for local dev.
var base = process.env.VITE_BASE || '/';
export default defineConfig({
    base: base,
    plugins: [
        react(),
        // @solana/web3.js needs Buffer + process polyfills in browser bundles.
        nodePolyfills(),
    ],
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    server: {
        port: 5173,
        open: true,
    },
});
