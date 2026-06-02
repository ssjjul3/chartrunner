#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');

const url = process.env.CHARTRUNNER_MOBILE_URL || 'http://127.0.0.1:8788/ChartRunner_Prototype.html';

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
  await page.evaluate(() => {
    if(typeof hideSplash === 'function') hideSplash();
  });
  await page.waitForFunction(() => !document.body.classList.contains('crSplashUp'), null, { timeout: 15000 });
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
      const orb = document.getElementById('crMobileRunnerOrb')?.getBoundingClientRect();
      const hotkeys = document.querySelector('.crMobileHotkeys')?.getBoundingClientRect();
      const hotToggle = document.getElementById('crMobileHotToggle')?.getBoundingClientRect();
      const modeLabels = Array.from(document.querySelectorAll('#crMobileModeDock [data-cr-mobile-mode]'))
        .map(el => el.getAttribute('data-cr-mobile-mode'));
      const visibleHotkeyCount = Array.from(document.querySelectorAll('[data-cr-mobile-key]'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        }).length;
      return {
        version: api.version,
        layout: document.body.getAttribute('data-cr-mobile-layout'),
        mode: state.mode,
        shellReady: document.body.classList.contains('crMobileShellReady'),
        modeCount: modeLabels.length,
        modeLabels,
        hotkeyCount: document.querySelectorAll('[data-cr-mobile-key]').length,
        visibleHotkeyCount,
        quickCount: document.querySelectorAll('[data-cr-mobile-action]').length,
        hotTogglePresent: !!hotToggle,
        hotToggleBottomLeft: !!hotToggle && hotToggle.left < 72 && hotToggle.bottom > window.innerHeight - 120,
        hotkeysCollapsed: !document.querySelector('.crMobileHotkeys')?.classList.contains('open'),
        topLabelsHidden: Array.from(document.querySelectorAll('#crOSBar .cr-bar-btn .lbl'))
          .every(el => getComputedStyle(el).display === 'none'),
        orbBottomRight: !!orb && orb.right > window.innerWidth - 128 && orb.bottom > window.innerHeight - 132,
        hotkeysBottomLeft: !!hotkeys && hotkeys.left < 72 && hotkeys.bottom > window.innerHeight - 120,
      };
    });
    assert(portrait.layout === 'portrait-phone', 'portrait viewport should be classified as portrait-phone');
    assert(portrait.mode === 'move', 'default mobile mode should be move');
    assert(portrait.shellReady, 'body should expose crMobileShellReady');
    assert(portrait.modeCount === 4, 'mobile mode dock should expose exactly Move/Inspect/Tool/Widget');
    assert(!portrait.modeLabels.includes('laser') && !portrait.modeLabels.includes('blue'), 'laser buttons should not duplicate hotkeys in the mode dock');
    assert(portrait.version === '1.0.215', 'play mobile API version should be 1.0.215');
    assert(portrait.hotkeyCount === 5, 'bottom-left transparent hotkeys 1-5 should be present');
    assert(portrait.visibleHotkeyCount === 0, 'hotkey numbers should be collapsed by default');
    assert(portrait.hotTogglePresent, 'bottom-left HOT toggle should be present');
    assert(portrait.hotToggleBottomLeft, 'HOT toggle should be anchored bottom-left');
    assert(portrait.hotkeysCollapsed, 'hotkey tray should start collapsed');
    assert(portrait.quickCount >= 2, 'fly/shoot quick buttons should be present');
    assert(portrait.topLabelsHidden, 'portrait topbar command labels should be icon-first');
    assert(portrait.orbBottomRight, 'runner movement orb should be anchored bottom-right');
    assert(portrait.hotkeysBottomLeft, 'hotkeys should be anchored bottom-left');

    await page.click('#crMobileHotToggle');
    const hotTrayOpen = await page.evaluate(() => ({
      expanded: document.getElementById('crMobileHotToggle')?.getAttribute('aria-expanded'),
      visibleHotkeyCount: Array.from(document.querySelectorAll('[data-cr-mobile-key]'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        }).length,
    }));
    assert(hotTrayOpen.expanded === 'true', 'HOT toggle should expose expanded state');
    assert(hotTrayOpen.visibleHotkeyCount === 5, 'HOT tray should expand to hotkeys 1-5');

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

    const sheetResult = await page.evaluate(() => {
      const terminal = document.getElementById('crBarTerminal');
      terminal && terminal.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, view:window }));
      const sheet = document.getElementById('crMobileSheet');
      return {
        open: !!(sheet && sheet.classList.contains('on')),
        title: document.getElementById('crMobileSheetTitle')?.textContent || '',
        appButtons: document.querySelectorAll('[data-cr-sheet-prog]').length,
      };
    });
    assert(sheetResult.open, 'portrait terminal topbar tap should open the mobile sheet');
    assert(/Terminal/i.test(sheetResult.title), 'terminal mobile sheet should title itself');
    assert(sheetResult.appButtons >= 4, 'mobile sheet should expose app shortcuts');

    const widgetResult = await page.evaluate(() => {
      const pane = document.querySelector('[data-pane-id="terminalSession"]');
      const api = window.crMobilePhoneFirst;
      const before = api.getState().chartWidgetCount;
      api.togglePaneWidgetFromTouch(pane);
      const afterSpawn = api.getState().chartWidgetCount;
      api.togglePaneWidgetFromTouch(pane);
      const afterDelete = api.getState().chartWidgetCount;
      return { before, afterSpawn, afterDelete };
    });
    assert(widgetResult.afterSpawn === widgetResult.before + 1, 'doubletap pane should spawn one chart widget');
    assert(widgetResult.afterDelete === widgetResult.before, 'doubletap pane again should remove the matching widget');

    const themeResult = await page.evaluate(() => {
      const themes = ['platinum','solana','liquid','bw','mono'];
      return themes.map(theme => {
        if(theme === 'platinum') document.body.removeAttribute('data-os-theme');
        else document.body.setAttribute('data-os-theme', theme);
        const mode = document.querySelector('.crMobileModeBtn');
        const key = document.getElementById('crMobileHotToggle');
        const orb = document.getElementById('crMobileRunnerOrb');
        const modeStyle = mode ? getComputedStyle(mode) : null;
        const keyRect = key ? key.getBoundingClientRect() : null;
        const orbRect = orb ? orb.getBoundingClientRect() : null;
        return {
          theme,
          modeVisible: !!mode && modeStyle.display !== 'none' && modeStyle.visibility !== 'hidden',
          keySize: keyRect ? Math.min(keyRect.width, keyRect.height) : 0,
          orbSize: orbRect ? Math.min(orbRect.width, orbRect.height) : 0,
          modeColor: modeStyle ? modeStyle.color : '',
        };
      });
    });
    themeResult.forEach(row => {
      assert(row.modeVisible, row.theme + ' mobile mode button should be visible');
      assert(row.keySize >= 38, row.theme + ' hotkey touch target should stay finger-sized');
      assert(row.orbSize >= 70, row.theme + ' runner orb should stay finger-sized');
      assert(!!row.modeColor, row.theme + ' mobile mode button should receive theme color');
    });
  });

  await withPage({ width: 844, height: 390 }, async page => {
    const landscape = await page.evaluate(() => ({
      layout: document.body.getAttribute('data-cr-mobile-layout'),
      modeCount: document.querySelectorAll('#crMobileModeDock [data-cr-mobile-mode]').length,
      visibleHotkeyCount: Array.from(document.querySelectorAll('[data-cr-mobile-key]'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        }).length,
      topLabelsVisible: Array.from(document.querySelectorAll('#crOSBar .cr-bar-btn .lbl'))
        .some(el => getComputedStyle(el).display !== 'none'),
    }));
    assert(landscape.layout === 'landscape-phone', 'landscape viewport should be classified as landscape-phone');
    assert(landscape.modeCount === 4, 'landscape mode dock should not duplicate laser hotkeys');
    assert(landscape.visibleHotkeyCount === 0, 'landscape hotkey tray should stay collapsed by default');
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

  console.log('play mobile adaptive shell smoke: ok');
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
