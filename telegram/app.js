const chartCanvas = document.querySelector("#chartCanvas");
const ctx = chartCanvas.getContext("2d");
const resultLine = document.querySelector("#resultLine");
const timer = document.querySelector("#timer");
const streak = document.querySelector("#streak");
const score = document.querySelector("#score");
const candleCount = document.querySelector("#candleCount");
const liquidityState = document.querySelector("#liquidityState");
const bearPressure = document.querySelector("#bearPressure");
const accuracy = document.querySelector("#accuracy");
const telegramDot = document.querySelector("#telegramDot");
const telegramStatus = document.querySelector("#telegramStatus");
const telegramUser = document.querySelector("#telegramUser");
const walletTitle = document.querySelector("#walletTitle");
const walletDescription = document.querySelector("#walletDescription");
const walletBadge = document.querySelector("#walletBadge");
const walletNetwork = document.querySelector("#walletNetwork");
const walletNotes = document.querySelectorAll("[data-wallet-note]");

const WALLET_STORAGE_KEY = "chartrunner.walletState";
const TELEGRAM_WALLET_URL = "https://t.me/wallet?startattach=wallet";
const TONKEEPER_UNIVERSAL_URL = "https://app.tonkeeper.com/ton-connect";
const TON_CONNECT_MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

const state = {
  seconds: 42,
  streak: 7,
  score: 1240,
  wins: 17,
  losses: 8,
  bracket: false,
  rescueCharges: 1,
  wallet: { status: "disconnected", mode: "browser-demo" },
  candles: [
    { open: 104, close: 108, high: 111, low: 101, volume: 0.68 },
    { open: 108, close: 106, high: 110, low: 103, volume: 0.52 },
    { open: 106, close: 113, high: 116, low: 105, volume: 0.86 },
    { open: 113, close: 117, high: 121, low: 111, volume: 0.78 },
    { open: 117, close: 114, high: 119, low: 110, volume: 0.58 },
    { open: 114, close: 121, high: 124, low: 112, volume: 0.9 },
    { open: 121, close: 126, high: 129, low: 119, volume: 0.82 },
    { open: 126, close: 123, high: 128, low: 120, volume: 0.63 },
    { open: 123, close: 130, high: 133, low: 122, volume: 0.94 },
    { open: 130, close: 136, high: 139, low: 128, volume: 0.88 },
    { open: 136, close: 132, high: 138, low: 129, volume: 0.7 },
    { open: 132, close: 139, high: 142, low: 131, volume: 0.92 },
    { open: 139, close: 146, high: 149, low: 137, volume: 1 },
    { open: 146, close: 143, high: 148, low: 140, volume: 0.64 },
    { open: 143, close: 151, high: 154, low: 142, volume: 0.95 },
    { open: 151, close: 156, high: 160, low: 149, volume: 0.86 },
    { open: 156, close: 153, high: 158, low: 150, volume: 0.72 },
    { open: 153, close: 160, high: 164, low: 151, volume: 0.98 }
  ]
};

function safeStorageRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be blocked in some Mini App privacy modes; gameplay should continue.
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore blocked storage and render an in-memory disconnected state.
  }
}

function loadWalletState() {
  const stored = safeStorageRead(WALLET_STORAGE_KEY);
  if (!stored) return { status: "disconnected", mode: "browser-demo" };

  try {
    return JSON.parse(stored);
  } catch (error) {
    return { status: "disconnected", mode: "browser-demo" };
  }
}

function saveWalletState(nextState) {
  state.wallet = nextState;
  safeStorageWrite(WALLET_STORAGE_KEY, JSON.stringify(nextState));
  renderWalletState();
}

function walletModeLabel() {
  if (state.wallet.status === "connected" && state.wallet.mode === "demo") return "demo wallet mode";
  if (state.wallet.status === "pending") return "wallet handoff pending";
  if (state.wallet.status === "connected") return "connected wallet mode";
  return "browser demo mode";
}

function renderWalletState() {
  const connected = state.wallet.status === "connected";
  const pending = state.wallet.status === "pending";
  walletBadge.classList.toggle("is-connected", connected);

  if (connected) {
    walletTitle.textContent =
      state.wallet.mode === "demo" ? "Demo wallet connected" : "TON wallet connected";
    walletDescription.textContent =
      state.wallet.mode === "demo"
        ? "Prototype state only. Real signed runs need a deployed TON Connect bridge."
        : "Runs are marked for TON-linked play through Telegram wallet identity.";
    walletBadge.textContent = state.wallet.label || "Connected";
    walletNetwork.textContent = "TON mainnet / Telegram wallet mode";
  } else if (pending) {
    walletTitle.textContent = "Wallet handoff opened";
    walletDescription.textContent =
      "Complete connection in Telegram Wallet or Tonkeeper. Use Demo Connect for local prototype testing.";
    walletBadge.textContent = "Pending";
    walletNetwork.textContent = "TON Connect handoff";
  } else {
    walletTitle.textContent = "Connect for wallet mode";
    walletDescription.textContent =
      "Use a Telegram wallet or TON wallet to mark runs as connected. Browser play stays in prototype demo mode.";
    walletBadge.textContent = "Disconnected";
    walletNetwork.textContent = "TON mainnet / Telegram wallets";
  }

  walletNotes.forEach((note) => {
    note.textContent = connected ? "Wallet mode" : "Demo mode";
  });
}

function initTelegramMiniApp() {
  const webApp = window.Telegram && window.Telegram.WebApp;

  if (!webApp) {
    telegramStatus.textContent = "Browser fallback";
    telegramUser.textContent = "Open as a Telegram Mini App for user sync.";
    return null;
  }

  try {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor("#090c10");
    webApp.setBackgroundColor("#090c10");
    if (typeof webApp.setBottomBarColor === "function") webApp.setBottomBarColor("#090c10");
  } catch (error) {
    // Older Telegram clients can miss some cosmetic methods.
  }

  const user = webApp.initDataUnsafe && webApp.initDataUnsafe.user;
  const displayName = user && [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  telegramDot.classList.add("is-live");
  telegramStatus.textContent = "Telegram Mini App";
  telegramUser.textContent =
    displayName || (user && user.username ? `@${user.username}` : "Telegram user");
  return webApp;
}

function openWalletConnect() {
  const webApp = window.Telegram && window.Telegram.WebApp;
  const tonkeeperUrl = `${TONKEEPER_UNIVERSAL_URL}?manifestUrl=${encodeURIComponent(
    TON_CONNECT_MANIFEST_URL
  )}`;

  saveWalletState({
    status: "pending",
    mode: "ton-connect",
    label: "Wallet pending",
    updatedAt: Date.now()
  });

  if (webApp && typeof webApp.openTelegramLink === "function") {
    webApp.openTelegramLink(TELEGRAM_WALLET_URL);
  } else {
    window.open(tonkeeperUrl, "_blank", "noopener,noreferrer");
  }

  setResult(
    "Wallet handoff opened. If no wallet appears, use Demo Connect locally or configure TON Connect on the deployed HTTPS app.",
    "#46d9ff"
  );
}

function useDemoWallet() {
  saveWalletState({
    status: "connected",
    mode: "demo",
    label: "Demo TON wallet",
    address: "demo:chart-runner",
    updatedAt: Date.now()
  });
  setResult("Demo wallet connected. Gameplay is still local prototype state.", "#37d67a");
}

function disconnectWallet() {
  state.wallet = { status: "disconnected", mode: "browser-demo" };
  safeStorageRemove(WALLET_STORAGE_KEY);
  renderWalletState();
  setResult("Wallet disconnected. ChartRunner stays playable in browser demo mode.", "#ffd166");
}

function fitCanvas() {
  const rect = chartCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  chartCanvas.width = Math.max(320, Math.round(rect.width * ratio));
  chartCanvas.height = Math.max(320, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawChart();
}

function candleRange() {
  const lows = state.candles.map((candle) => candle.low);
  const highs = state.candles.map((candle) => candle.high);
  return {
    min: Math.min(...lows) - 8,
    max: Math.max(...highs) + 8
  };
}

function drawChart() {
  const width = chartCanvas.clientWidth;
  const height = chartCanvas.clientHeight;
  const padding = { top: 20, right: 18, bottom: 48, left: 18 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const { min, max } = candleRange();
  const slot = chartWidth / state.candles.length;
  const candleWidth = Math.max(8, Math.min(17, slot * 0.52));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#070a0e";
  ctx.fillRect(0, 0, width, height);

  const toY = (price) => padding.top + (1 - (price - min) / (max - min)) * chartHeight;
  const liquidityTop = toY(151);
  const liquidityBottom = toY(142);

  ctx.fillStyle = "rgba(255, 209, 102, 0.1)";
  ctx.fillRect(padding.left, liquidityTop, chartWidth, liquidityBottom - liquidityTop);
  ctx.fillStyle = "rgba(255, 209, 102, 0.88)";
  ctx.font = "700 11px system-ui";
  ctx.fillText("LIQUIDITY", padding.left + 8, liquidityTop + 16);

  ctx.strokeStyle = "rgba(154, 166, 178, 0.14)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  state.candles.forEach((candle, index) => {
    const x = padding.left + slot * index + slot / 2;
    const openY = toY(candle.open);
    const closeY = toY(candle.close);
    const highY = toY(candle.high);
    const lowY = toY(candle.low);
    const bullish = candle.close >= candle.open;
    const color = bullish ? "#37d67a" : "#ff5f6d";
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(4, Math.abs(closeY - openY));

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

    ctx.fillStyle = bullish ? "rgba(55, 214, 122, 0.28)" : "rgba(255, 95, 109, 0.26)";
    ctx.fillRect(x - candleWidth / 2, height - 30, candleWidth, candle.volume * 24);
  });

  const last = state.candles.at(-1);
  const lastY = toY(last.close);

  ctx.strokeStyle = "rgba(70, 217, 255, 0.74)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(padding.left, lastY);
  ctx.lineTo(width - padding.right, lastY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.bracket) {
    drawBracketLine(toY(last.close + 7), "#37d67a", "TARGET");
    drawBracketLine(toY(last.close - 8), "#ff5f6d", "STOP");
  }
}

function drawBracketLine(y, color, label) {
  const width = chartCanvas.clientWidth;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, y);
  ctx.lineTo(width - 18, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "800 11px system-ui";
  ctx.fillText(label, width - 72, y - 6);
}

function pushCandle() {
  const previous = state.candles.at(-1);
  const drift = state.bracket ? 3 : 5;
  const direction = Math.random() > 0.34 ? 1 : -1;
  const body = direction * (2 + Math.round(Math.random() * drift));
  const open = previous.close;
  const close = open + body;
  const high = Math.max(open, close) + 2 + Math.round(Math.random() * 4);
  const low = Math.min(open, close) - 2 - Math.round(Math.random() * 4);
  const volume = Math.min(1, 0.48 + Math.random() * 0.58);

  state.candles.push({ open, close, high, low, volume });
  state.candles = state.candles.slice(-20);
  candleCount.textContent = String(Number(candleCount.textContent) + 1);
  liquidityState.textContent = close > 151 ? "Breached" : close > 142 ? "Stacked" : "Below";
  bearPressure.textContent = close < open ? "Pressing" : "Fading";
  drawChart();
}

function setResult(message, color) {
  resultLine.textContent = message;
  resultLine.style.borderColor = color;
  resultLine.style.color = color;
}

function updateStats(deltaScore, didWin) {
  state.score = Math.max(0, state.score + deltaScore);
  state.streak = didWin ? state.streak + 1 : 0;
  if (didWin) state.wins += 1;
  else state.losses += 1;

  score.textContent = state.score.toLocaleString("en-US");
  streak.textContent = String(state.streak);
  accuracy.textContent = `${Math.round((state.wins / (state.wins + state.losses)) * 100)}%`;
}

function useAbility(action) {
  const last = state.candles.at(-1);
  const bullish = last.close > last.open;
  const mode = walletModeLabel();

  if (action === "run") {
    pushCandle();
    state.score += 15;
    score.textContent = state.score.toLocaleString("en-US");
    setResult(`You let the live candles print in ${mode}. Liquidity is clearer now.`, "#46d9ff");
    return;
  }

  if (action === "long") {
    const win = bullish && last.close >= 156;
    updateStats(win ? 140 : -70, win);
    setResult(
      win
        ? `Clean long in ${mode}. You rode the candle through liquidity before bears reclaimed it.`
        : `Long was early in ${mode}. The bears still had the body pinned under liquidity.`,
      win ? "#37d67a" : "#ff5f6d"
    );
    return;
  }

  if (action === "short") {
    const win = !bullish && last.high >= 154;
    updateStats(win ? 120 : -80, win);
    setResult(
      win
        ? `Good short in ${mode}. The bear trap snapped after buyers failed at the shelf.`
        : `Short missed in ${mode}. Bears were loud, but the candle never lost support.`,
      win ? "#37d67a" : "#ff5f6d"
    );
    return;
  }

  if (action === "bracket") {
    state.bracket = !state.bracket;
    setResult(
      state.bracket
        ? `Bracket armed in ${mode}. Target and stop are wrapped around the active liquidity zone.`
        : `Bracket cleared in ${mode}. You are back to raw candle reads.`,
      "#ffd166"
    );
    drawChart();
    return;
  }

  if (action === "rescue") {
    if (state.rescueCharges < 1) {
      setResult("Rescue is empty. The next read has to stand on its own.", "#ff5f6d");
      return;
    }
    state.rescueCharges -= 1;
    updateStats(-20, true);
    setResult(
      `Rescue used in ${mode}. Damage cut before the bears could drag the chart lower.`,
      "#b79cff"
    );
  }
}

function updateTimer() {
  state.seconds = state.seconds > 0 ? state.seconds - 1 : 42;
  timer.textContent = `00:${String(state.seconds).padStart(2, "0")}`;
  if (state.seconds % 5 === 0) pushCandle();
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => useAbility(button.dataset.action));
});

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.dataset.panel;
    document.querySelectorAll(".sheet-tab").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    document.querySelectorAll(".sheet-panel").forEach((sheet) => {
      sheet.classList.toggle("active", sheet.dataset.sheet === panel);
    });
  });
});

document.querySelectorAll("[data-wallet-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.walletAction;
    if (action === "connect") openWalletConnect();
    if (action === "demo") useDemoWallet();
    if (action === "disconnect") disconnectWallet();
  });
});

state.wallet = loadWalletState();
initTelegramMiniApp();
renderWalletState();
window.addEventListener("resize", fitCanvas);
fitCanvas();
setInterval(updateTimer, 1000);
