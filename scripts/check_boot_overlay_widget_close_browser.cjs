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
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message || String(err)));

  await page.addInitScript(() => {
    try {
      localStorage.removeItem('cr_guest_session_v1');
      localStorage.removeItem('cr_stealth_auth_v1');
      localStorage.removeItem('cr_profile_name_v1');
      localStorage.setItem('cr_chart_widgets_v1', '[]');
      localStorage.setItem('cr_chart_widgets_v1::__guest__', '[]');
    } catch (_) {}
  });

  const fileUrl = 'file://' + path.resolve('ChartRunner_Prototype.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#crBootGuest', { timeout: 10000 });
  await page.click('#crBootGuest');
  await page.waitForTimeout(600);

  const beforeSession = await page.evaluate(() => localStorage.getItem('cr_guest_session_v1'));
  assert(beforeSession, 'Guest session was not created');

  await page.evaluate(() => {
    document.body.classList.remove('crSplashUp');
    const splash = document.getElementById('splash');
    if (splash) splash.style.display = 'none';

    const item = {
      id: 'cw_boot_overlay_probe',
      type: 'pane',
      sourceId: 'marketScan',
      x: 520,
      y: 360,
      w: 320,
      h: 220,
      t: Date.now(),
    };
    localStorage.setItem('cr_chart_widgets_v1', JSON.stringify([item]));
    if (typeof _cwLoad === 'function') _cwLoad();
    if (typeof renderChartWidgets === 'function') renderChartWidgets();
  });

  await page.waitForSelector('#crChartWidgetLayer .cr-widget[data-id="cw_boot_overlay_probe"] [data-close]', {
    timeout: 10000,
  });

  const hitStack = await page.evaluate(() => {
    const btn = document.querySelector('#crChartWidgetLayer .cr-widget[data-id="cw_boot_overlay_probe"] [data-close]');
    const r = btn.getBoundingClientRect();
    return document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      .slice(0, 6)
      .map(el => ({
        id: el.id || '',
        cls: typeof el.className === 'string' ? el.className : '',
        tag: el.tagName,
      }));
  });

  await page.click('#crChartWidgetLayer .cr-widget[data-id="cw_boot_overlay_probe"] [data-close]', {
    timeout: 10000,
  });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => ({
    beforeSession: localStorage.getItem('cr_guest_session_v1'),
    chartWidgets: localStorage.getItem('cr_chart_widgets_v1'),
    widgetCount: document.querySelectorAll('#crChartWidgetLayer .cr-widget').length,
    bootClass: document.getElementById('crBoot')?.className || '',
    bootPointer: getComputedStyle(document.getElementById('crBoot')).pointerEvents,
  }));

  await browser.close();

  console.log(JSON.stringify({ hitStack, result }, null, 2));

  assert(pageErrors.length === 0, 'Browser page errors: ' + pageErrors.join(' | '));
  assert(!hitStack.some(el => el.id === 'crBoot' || /crBoot/.test(el.cls)), 'Dismissed boot overlay still covers widget close: ' + JSON.stringify(hitStack));
  assert(result.beforeSession === beforeSession, 'Guest session changed while closing widget');
  assert(result.chartWidgets === '[]', 'Chart widget storage was not cleared: ' + result.chartWidgets);
  assert(result.widgetCount === 0, 'Widget remained after close');
  assert(/\bout\b/.test(result.bootClass), 'Boot overlay was not dismissed');
  assert(result.bootPointer === 'none', 'Boot overlay pointer-events should be none');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
