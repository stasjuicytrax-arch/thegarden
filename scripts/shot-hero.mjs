// Скриншоты первого экрана: node scripts/shot-hero.mjs <out-dir> [suffix]
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const out = process.argv[2] ?? 'shots';
const suffix = process.argv[3] ?? '';
mkdirSync(out, { recursive: true });
const base = join(os.homedir(), 'AppData/Local/ms-playwright');
const dir = readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().pop();
const sub = readdirSync(join(base, dir)).find((d) => d.startsWith('chrome-'));
const executablePath = join(base, dir, sub, 'chrome.exe');

const browser = await chromium.launch({
  executablePath,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('response', (r) => r.status() >= 400 && console.log('HTTP', r.status(), r.url()));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(name, m.type(), m.text()));
  await page.goto('http://localhost:4401/thegarden/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  const info = await page.evaluate(() => {
    const f = document.querySelector('[data-hero-flower]').getBoundingClientRect();
    return { flower: [f.left, f.top, f.width, f.height].map(Math.round), canvas: !!document.querySelector('[data-hero-flower] canvas'), cores: navigator.hardwareConcurrency };
  });
  console.log(name, JSON.stringify(info));
  await page.screenshot({ path: join(out, `hero-${name}${suffix}.png`) });
  await page.close();
}
await browser.close();
