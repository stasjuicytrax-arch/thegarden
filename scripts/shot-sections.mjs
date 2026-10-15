// Скриншоты по секциям: node scripts/shot-sections.mjs <out-dir> [width height]
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
const out = process.argv[2] ?? 'shots';
const w = Number(process.argv[3] ?? 1440);
const h = Number(process.argv[4] ?? 900);
mkdirSync(out, { recursive: true });
const base = join(os.homedir(), 'AppData/Local/ms-playwright');
const dir = readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().pop();
const sub = readdirSync(join(base, dir)).find((d) => d.startsWith('chrome-'));
const browser = await chromium.launch({ executablePath: join(base, dir, sub, 'chrome.exe') });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('console', (m) => ['error'].includes(m.type()) && console.log('console error:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:4401/thegarden/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const ids = ['about', 'sale', 'price', 'studios', 'works', 'loyalty', 'social', 'contacts', 'footer'];
for (const id of ids) {
  const y = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
  }, id);
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 72)), y);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, `sec-${w}-${id}.png`) });
  console.log(id, y);
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('horizontal overflow px:', overflow);
await browser.close();
