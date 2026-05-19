const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const js = readFileSync(join(root, "app.js"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "tonconnect-manifest.json"), "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(source, values, label) {
  values.forEach((value) => {
    assert(source.includes(value), `${label} missing: ${value}`);
  });
}

execFileSync(process.execPath, ["--check", join(root, "app.js")], { stdio: "inherit" });

includesAll(
  html,
  [
    "https://telegram.org/js/telegram-web-app.js",
    'id="chartCanvas"',
    'id="telegramStatus"',
    'id="telegramUser"',
    'id="walletTitle"',
    'id="walletBadge"',
    'data-action="run"',
    'data-action="long"',
    'data-action="short"',
    'data-action="bracket"',
    'data-action="rescue"',
    'data-panel="mission"',
    'data-panel="abilities"',
    'data-panel="stats"'
  ],
  "DOM"
);

includesAll(
  html,
  [
    "live candles",
    "liquidity",
    "bears",
    "bracket",
    "rescue",
    "Your chart is the level.",
    "TON Wallet",
    "Telegram Mini App",
    "TON mainnet / Telegram wallets"
  ],
  "ChartRunner copy"
);

includesAll(
  css,
  ["env(safe-area-inset-top)", "@media (min-width: 760px)", ".bottom-sheet"],
  "CSS"
);
includesAll(
  js,
  [
    "function drawChart",
    "function useAbility",
    "function initTelegramMiniApp",
    "window.Telegram && window.Telegram.WebApp",
    "webApp.ready()",
    "webApp.expand()",
    "setHeaderColor",
    "setBackgroundColor",
    "initDataUnsafe",
    "chartrunner.walletState",
    "window.localStorage",
    "function openWalletConnect",
    "function useDemoWallet",
    "TELEGRAM_WALLET_URL",
    "TONKEEPER_UNIVERSAL_URL",
    "function renderWalletState",
    "setInterval(updateTimer"
  ],
  "JS"
);

assert(manifest.name === "ChartRunner", "TON manifest name should be ChartRunner");
assert(manifest.url.startsWith("https://"), "TON manifest url should be HTTPS");
assert(/^https:\/\/.+\.(png|ico)$/.test(manifest.iconUrl), "TON manifest iconUrl should be HTTPS PNG or ICO");

const htmlUrls = [...html.matchAll(/https?:\/\/[^"'\s<>)]+/g)].map((match) => match[0]);
const allowedHtmlUrls = [
  "https://telegram.org/js/telegram-web-app.js"
];
htmlUrls.forEach((url) => {
  assert(allowedHtmlUrls.includes(url), `Unexpected hard external HTML dependency: ${url}`);
});

const jsUrls = [...js.matchAll(/https?:\/\/[^"'\s<>)`]+/g)].map((match) => match[0]);
const allowedJsPrefixes = [
  "https://t.me/wallet",
  "https://app.tonkeeper.com/ton-connect"
];
jsUrls.forEach((url) => {
  assert(
    allowedJsPrefixes.some((prefix) => url.startsWith(prefix)),
    `Unexpected hard external JS dependency: ${url}`
  );
});

assert(!css.match(/https?:\/\//), "CSS should not load external network dependencies");
assert(!html.includes("unpkg.com"), "No bundled TON Connect CDN dependency should be required");
assert(!js.includes("TON_CONNECT_UI"), "No hard TON Connect UI runtime should be required");
console.log(
  "Smoke test passed: Telegram SDK, WebApp guards, wallet UI/state, DOM, JS syntax, and dependency checks are valid."
);
