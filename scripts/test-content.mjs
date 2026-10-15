// Проверка покрытия контента (TZ.md §12): npm run test:content
// Требует запущенный preview (npm run build && npm run preview -- --port 4401) либо URL аргументом.
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const url = process.argv[2] ?? 'http://localhost:4401/thegarden/';
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const promos = json('src/data/promos.json');
const price = json('src/data/price.json');
const site = json('src/data/site.json');
const loyalty = json('src/data/loyalty.json');

const base = join(os.homedir(), 'AppData/Local/ms-playwright');
const dir = readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().pop();
const sub = readdirSync(join(base, dir)).find((d) => d.startsWith('chrome-'));
const browser = await chromium.launch({ executablePath: join(base, dir, sub, 'chrome.exe') });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });

const dom = await page.evaluate(() => {
  const days = (studio) => {
    const s = new Set();
    document.querySelectorAll('[data-promo-card]').forEach((c) => {
      (c.dataset[studio] || '').split(',').filter(Boolean).forEach((d) => s.add(Number(d)));
    });
    return [...s].sort((a, b) => a - b);
  };
  const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  return {
    promoCards: document.querySelectorAll('[data-promo-card]').length,
    seasonal: document.querySelectorAll('.sale__seasonal-list li').length,
    pushkinDays: days('daysPushkin'),
    frunzDays: days('daysFrunzenskaya'),
    calendarDays: document.querySelectorAll('[data-day]').length,
    priceRows: document.querySelectorAll('.price__row').length,
    priceGroups: document.querySelectorAll('.price__group').length,
    priceCats: document.querySelectorAll('[data-panel]').length,
    slides: document.querySelectorAll('[data-slide]').length,
    mosaic: document.querySelectorAll('[data-mosaic-item]').length,
    curtain: document.querySelectorAll('.curtain__frame').length,
    loyaltyRows: document.querySelectorAll('.loyalty__row').length,
    loyaltyFoot: document.querySelectorAll('.loyalty__foot-row').length,
    loyaltyTable: document.querySelectorAll('table.loyalty__table').length,
    socialLinks: document.querySelectorAll('.social__link').length,
    hrefs,
    legal: !!document.querySelector('.footer__legal details'),
    imgs: [...document.images].filter((i) => !i.alt && !i.closest('[aria-hidden="true"]')).length,
  };
});
await browser.close();

const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const expected = {
  promoCards: promos.promos.length,
  seasonal: promos.seasonal.length,
  priceRows: sum(price.categories, (c) => sum(c.groups, (g) => g.items.length)),
  priceGroups: sum(price.categories, (c) => c.groups.length),
  priceCats: price.categories.length,
  slides: sum(site.studios, (s) => s.photos.length),
  loyaltyRows: sum(loyalty.programs, (p) => p.items.length),
  loyaltyFoot: loyalty.programs.length,
};
const dayOf = (k) => [...new Set(promos.promos.flatMap((p) => (p.dates === 'all-month' ? [] : p.dates[k] ?? [])))].sort((a, b) => a - b);

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : '  ожидалось ' + JSON.stringify(want)}`);
};

check('карточки акций', dom.promoCards, expected.promoCards);
check('сезонные акции', dom.seasonal, expected.seasonal);
check('даты Пушкина в календаре', dom.pushkinDays, dayOf('pushkin'));
check('даты СПб в календаре', dom.frunzDays, dayOf('frunzenskaya'));
check('дней в календаре', dom.calendarDays, 31);
check('направлений прайса', dom.priceCats, expected.priceCats);
check('групп прайса', dom.priceGroups, expected.priceGroups);
check('строк прайса (215)', dom.priceRows, expected.priceRows);
check('фото студий в каруселях (17)', dom.slides, expected.slides);
check('мозаика работ (9)', dom.mosaic, 9);
check('кадры шторки (3)', dom.curtain, 3);
check('пунктов лояльности (19)', dom.loyaltyRows, expected.loyaltyRows);
check('сносок лояльности (3)', dom.loyaltyFoot, expected.loyaltyFoot);
check('<table> лояльности', dom.loyaltyTable, 1);
check('ссылок «на связи» (9)', dom.socialLinks, 9);
check('юр. блок <details>', dom.legal, true);

const mustLink = [
  site.phoneHref,
  `mailto:${site.email}`,
  site.channel.telegram,
  site.channel.vk,
  site.privacy,
  ...site.studios.flatMap((s) => [s.telegram, s.whatsapp, s.max]),
];
const missing = mustLink.filter((h) => !dom.hrefs.includes(h));
check('обязательные ссылки на месте', missing, []);

console.log(failed ? `\nПровалов: ${failed}` : '\nВсе проверки покрытия пройдены');
process.exit(failed ? 1 : 0);
