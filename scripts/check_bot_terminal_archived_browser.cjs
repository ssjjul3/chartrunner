const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const launchOptions = { headless: true };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message || String(err)));

  const fileUrl = 'file://' + path.resolve('ChartRunner_Prototype.html') + '?crLiveGame=1';
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#win-bot', { state: 'attached', timeout: 10000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-cr-live-game') === '1', { timeout: 10000 });

  const result = await page.evaluate(() => {
    const metrics = selector => Array.from(document.querySelectorAll(selector)).map(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      return {
        id: el.id || '',
        tag: el.tagName,
        title: el.getAttribute('title') || '',
        display: cs.display,
        visibility: cs.visibility,
        width: r.width,
        height: r.height,
        visible,
      };
    });

    let snapshot = null;
    try {
      snapshot = window.crCoachProviders && typeof window.crCoachProviders.buildCoachSnapshot === 'function'
        ? window.crCoachProviders.buildCoachSnapshot()
        : null;
    } catch (_) {}

    return {
      liveAttr: document.documentElement.getAttribute('data-cr-live-game'),
      liveFlag: !!(window.cr && window.cr.isLiveGameSurface),
      botLaunchers: metrics('[data-prog="bot"]'),
      botWindow: metrics('#win-bot'),
      terminalLaunchers: metrics('[data-prog="terminal"]'),
      coachText: window.crCoach && typeof window.crCoach.getHistory === 'function'
        ? window.crCoach.getHistory().map(m => m.text || '').join(' ')
        : '',
      botTerminalRole: snapshot && snapshot.boundary ? snapshot.boundary.botTerminalRole : '',
    };
  });

  await browser.close();

  console.log(JSON.stringify(result, null, 2));

  assert(pageErrors.length === 0, 'Browser page errors: ' + pageErrors.join(' | '));
  assert(result.liveAttr === '1' && result.liveFlag, 'Live /play flag was not active');
  assert(result.botLaunchers.length > 0, 'Expected Bot Terminal launchers to remain in archived DOM');
  assert(result.botWindow.length === 1, 'Expected archived Bot Terminal window DOM');
  assert(result.botLaunchers.every(item => !item.visible), 'Visible Bot Terminal launcher found: ' + JSON.stringify(result.botLaunchers));
  assert(result.botWindow.every(item => !item.visible), 'Visible Bot Terminal window found: ' + JSON.stringify(result.botWindow));
  assert(result.terminalLaunchers.some(item => item.visible), 'Terminal launcher should remain visible');
  assert(/private ops|archived/i.test(result.coachText), 'Coach boot text does not mention private/archive boundary');
  assert(/private ops|archived/i.test(result.botTerminalRole), 'Coach snapshot botTerminalRole does not mention private/archive boundary');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
