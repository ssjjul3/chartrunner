/* Render share cards to PNG with @napi-rs/canvas (prebuilt, no browser/system libs).
   Renders the canvas card set from chartrunner-prototype/assets/cr-share-card.js.
   CI: npm i @napi-rs/canvas @fontsource/archivo-black @fontsource/jetbrains-mono && node .github/scripts/render-cards.cjs */
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const F = path.join('node_modules', '@fontsource');
GlobalFonts.registerFromPath(path.join(F, 'archivo-black/files/archivo-black-latin-400-normal.woff2'), 'Archivo Black');
GlobalFonts.registerFromPath(path.join(F, 'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'), 'JetBrains Mono');
GlobalFonts.registerFromPath(path.join(F, 'jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2'), 'JetBrains Mono');

require(path.resolve('chartrunner-prototype/assets/cr-share-card.js')); // sets globalThis.CRShareCard

const outDir = 'chartrunner-prototype/cards';
fs.mkdirSync(outDir, { recursive: true });
const types = ['general', 'pnl', 'racing', 'monster', 'map', 'multiplayer', 'leaderboard', 'alert', 'version', 'chart'];
for (const t of types) {
  const c = createCanvas(1200, 630);
  globalThis.CRShareCard.render(c, { type: t });
  fs.writeFileSync(path.join(outDir, t + '.png'), c.toBuffer('image/png'));
}
// default link preview
const og = createCanvas(1200, 630);
globalThis.CRShareCard.render(og, { type: 'general' });
fs.writeFileSync('chartrunner-prototype/og-card.png', og.toBuffer('image/png'));

// per-type share stubs: /s/<type>.html -> correct og:image for crawlers, redirects humans to /share.html
const TITLE = { general:'ride the chart', pnl:'run result', racing:'race time', monster:'boss down',
  map:'shared map', multiplayer:'live room', leaderboard:'weekly board', alert:'level hit', version:'runtime update',
  chart:'live chart' };
fs.mkdirSync('chartrunner-prototype/s', { recursive: true });
for (const t of types) {
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>ChartRunner - ${TITLE[t]}</title>
<meta property="og:title" content="ChartRunner - ${TITLE[t]}">
<meta property="og:description" content="ChartRunner - a free trading arcade on real market charts.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://chartrunner.xyz/cards/${t}.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ChartRunner_xyz">
<meta name="twitter:image" content="https://chartrunner.xyz/cards/${t}.png">
<script>location.replace('/share.html?type=${t}'+(location.search?('&'+location.search.slice(1)):''));</script>
</head><body>Redirecting to your ChartRunner card…</body></html>`;
  fs.writeFileSync(`chartrunner-prototype/s/${t}.html`, html);
}
console.log('rendered', types.length, 'type cards + og-card.png +', types.length, 's/ stubs');
