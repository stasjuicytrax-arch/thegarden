// Скриншоты hero при прогрессе раскрытия 0 / 0.5 / 1: node scripts/shot-hero-scroll.mjs <out-dir> [url]
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const out = process.argv[2] ?? 'shots';
const url = process.argv[3] ?? 'http://localhost:4401/thegarden/';
mkdirSync(out, { recursive: true });
const base = join(os.homedir(), 'AppData/Local/ms-playwright');
const dir = readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().pop();
const sub = readdirSync(join(base, dir)).find((d) => d.startsWith('chrome-'));
const browser = await chromium.launch({
  executablePath: join(base, dir, sub, 'chrome.exe'),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

for (const [name, w, h, pinFrac] of [['desktop', 1440, 900, 1.0], ['mobile', 390, 844, 1.0]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => m.type() === 'error' && console.log(name, 'console error:', m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const pinLen = Math.round(h * pinFrac);
  for (const prog of [0, 0.5, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(pinLen * prog));
    await page.waitForTimeout(2600); // scrub 0.8 + долёт
    const hero = await page.evaluate(() => {
      const r = document.querySelector('[data-hero]').getBoundingClientRect();
      return [Math.round(r.top), Math.round(r.height), window.scrollY];
    });
    console.log(name, 'progress', prog, 'hero top/h/scrollY', hero.join('/'));
    await page.screenshot({ path: join(out, `hero-scroll-${name}-${prog}.png`) });
  }
  await page.close();
}
await browser.close();
