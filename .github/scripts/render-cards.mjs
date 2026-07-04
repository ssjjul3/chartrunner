// Renders card HTML -> PNG (1200x630 etc.) using Playwright/Chromium.
// Run in CI (GitHub Actions) where system libs exist; the sandbox cannot run Chromium.
//   npm i -D playwright && npx playwright install --with-deps chromium && node chartrunner-prototype/tools/render-cards.mjs
import { chromium } from 'playwright';

const root = process.cwd();
const jobs = [
  // canonical OG/Twitter share card for the landing + game link previews
  { html: 'chartrunner-prototype/share-card.html', out: 'chartrunner-prototype/og-card.png', w: 1200, h: 630, sel: '#card' },
  // add more cards here (e.g. per-type share cards) as needed:
  // { html: 'chartrunner-prototype/cards/pnl.html', out: 'chartrunner-prototype/cards/pnl.png', w:1200, h:630, sel:'#card' },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  await page.goto('file://' + root + '/' + j.html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // let webfonts settle
  const el = j.sel ? await page.$(j.sel) : null;
  await (el || page).screenshot({ path: j.out });
  await page.close();
  console.log('rendered', j.out, `${j.w}x${j.h}`);
}
await browser.close();
