#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');

const url = process.env.CHARTRUNNER_MOBILE_URL || 'http://127.0.0.1:8787/telegram/';

async function withPage(viewport, fn){
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || 'chrome',
  });
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
  page.on('console', msg => {
    const text = msg.text();
    if(/\b(error|TypeError|ReferenceError)\b/i.test(text)) console.log('[browser]', text);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#cv', { timeout: 15000 });
  await page.waitForFunction(() => !!window.crMobilePhoneFirst, null, { timeout: 15000 });
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

function assert(ok, msg){
  if(!ok) throw new Error(msg);
}

(async () => {
  await withPage({ width: 390, height: 844 }, async page => {
    const portrait = await page.evaluate(() => {
      const api = window.crMobilePhoneFirst;
      const state = api.getState();
      return {
        version: api.version,
        layout: document.body.getAttribute('data-cr-mobile-layout'),
        mode: state.mode,
        shellReady: document.body.classList.contains('crMobileShellReady'),
        modeCount: document.querySelectorAll('[data-cr-mobile-mode]').length,
        topLabelsHidden: Array.from(document.querySelectorAll('#crOSBar .cr-bar-btn .lbl'))
          .every(el => getComputedStyle(el).display === 'none'),
      };
    });
    assert(portrait.version === '1.0.127', 'mobile API version should be 1.0.127');
    assert(portrait.layout === 'portrait-phone', 'portrait viewport should be classified as portrait-phone');
    assert(portrait.mode === 'move', 'default mobile mode should be move');
    assert(portrait.shellReady, 'body should expose crMobileShellReady');
    assert(portrait.modeCount >= 6, 'mobile mode dock should expose Move/Inspect/Tool/Laser/Blue/Widget');
    assert(portrait.topLabelsHidden, 'portrait topbar command labels should be icon-first');

    const modeResult = await page.evaluate(() => {
      const api = window.crMobilePhoneFirst;
      api.setMode('inspect');
      const inspect = api.getState();
      api.setMode('move');
      return {
        inspectMode: inspect.mode,
        bodyMode: document.body.getAttribute('data-cr-mobile-mode'),
        chip: document.getElementById('crMobileArmedChip')?.textContent || '',
      };
    });
    assert(modeResult.inspectMode === 'inspect', 'setMode("inspect") should change state');
    assert(modeResult.bodyMode === 'move', 'setMode("move") should restore body data mode');
    assert(/Move/i.test(modeResult.chip), 'context chip should describe current mode');

    const laserResult = await page.evaluate(() => {
      const api = window.crMobilePhoneFirst;
      api.armLaserFamily('blue');
      const afterBlue = api.getState();
      api.armLaserFamily('normal');
      const afterNormal = api.getState();
      api.cancelLaserFamilies();
      return { afterBlue, afterNormal, final: api.getState().laserFamily };
    });
    assert(laserResult.afterBlue.normalLaserActive === false, 'arming blue laser should clear normal laser aim');
    assert(laserResult.afterBlue.blueLaserActive === true, 'arming blue laser should keep blue active');
    assert(laserResult.afterNormal.blueLaserActive === false, 'arming normal laser should clear blue laser');
    assert(laserResult.afterNormal.normalLaserActive === true, 'arming normal laser should start normal laser aim');
    assert(laserResult.afterNormal.laserFamily === 'normal', 'normal laser should be the active family');
    assert(laserResult.final === null, 'cancelLaserFamilies should clear active family');

    const widgetResult = await page.evaluate(() => {
      const pane = document.createElement('div');
      pane.setAttribute('data-pane-id', 'mobileSmokePane');
      pane.innerHTML = '<div class="crTerm-paneHd">Mobile Smoke</div><div class="crTerm-paneBd">ok</div>';
      document.body.appendChild(pane);
      const api = window.crMobilePhoneFirst;
      const before = api.getState().chartWidgetCount;
      api.togglePaneWidgetFromTouch(pane);
      const afterSpawn = api.getState().chartWidgetCount;
      api.togglePaneWidgetFromTouch(pane);
      const afterDelete = api.getState().chartWidgetCount;
      pane.remove();
      return { before, afterSpawn, afterDelete };
    });
    assert(widgetResult.afterSpawn === widgetResult.before + 1, 'doubletap pane should spawn one chart widget');
    assert(widgetResult.afterDelete === widgetResult.before, 'doubletap pane again should remove the matching widget');
  });

  await withPage({ width: 844, height: 390 }, async page => {
    const landscape = await page.evaluate(() => ({
      layout: document.body.getAttribute('data-cr-mobile-layout'),
      topLabelsVisible: Array.from(document.querySelectorAll('#crOSBar .cr-bar-btn .lbl'))
        .some(el => getComputedStyle(el).display !== 'none'),
    }));
    assert(landscape.layout === 'landscape-phone', 'landscape viewport should be classified as landscape-phone');
    assert(landscape.topLabelsVisible, 'landscape should allow compact topbar labels');
  });

  await withPage({ width: 820, height: 1180 }, async page => {
    const tablet = await page.evaluate(() => ({
      layout: document.body.getAttribute('data-cr-mobile-layout'),
      tabletReady: document.body.classList.contains('crMobileTablet'),
    }));
    assert(tablet.layout === 'tablet', 'tablet viewport should be classified as tablet');
    assert(tablet.tabletReady, 'tablet class should be applied');
  });

  console.log('mobile adaptive shell smoke: ok');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
