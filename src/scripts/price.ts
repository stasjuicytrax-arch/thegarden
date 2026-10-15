import { gsap, prefersReducedMotion } from './motion';

const ANIMATED_ROWS = 12;

/** Подпись цены: выбранный уровень крупно, две другие — мелко серым («3000 · 3300»). */
function renderTiers(root: HTMLElement, tier: number): void {
  root.querySelectorAll<HTMLElement>('[data-tiers]').forEach((el) => {
    const values = (el.dataset.tiers ?? '').split('|');
    if (values.length !== 3) return;
    const main = values[tier];
    const others = values.filter((_, i) => i !== tier).join(' · ');
    el.textContent = '';
    el.append(document.createTextNode(main));
    const small = document.createElement('span');
    small.className = 'price__other';
    small.textContent = others;
    el.append(small);
  });
}

export function initPrice(): void {
  const root = document.querySelector<HTMLElement>('[data-price]');
  if (!root) return;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));
  const wrap = root.querySelector<HTMLElement>('[data-price-wrap]')!;
  const reduced = prefersReducedMotion();
  let tier = 0;

  renderTiers(root, tier);

  root.querySelectorAll<HTMLButtonElement>('[data-tier]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tier = Number(btn.dataset.tier);
      root.querySelectorAll<HTMLButtonElement>('[data-tier]').forEach((b) =>
        b.setAttribute('aria-pressed', String(Number(b.dataset.tier) === tier))
      );
      renderTiers(root, tier);
    });
  });

  const select = (id: string, focus = false) => {
    const next = panels.find((p) => p.dataset.panel === id);
    const current = panels.find((p) => !p.hidden);
    if (!next || next === current) return;

    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });

    const from = wrap.offsetHeight;
    if (current) current.hidden = true;
    next.hidden = false;

    if (reduced) return;
    // FLIP высоты листа 320ms; строки поднимаются шагом 20ms (не более 12)
    const to = wrap.offsetHeight;
    gsap.fromTo(
      wrap,
      { height: from },
      { height: to, duration: 0.32, ease: 'power2.inOut', clearProps: 'height' }
    );
    const rows = Array.from(next.querySelectorAll<HTMLElement>('[data-row]')).slice(0, ANIMATED_ROWS);
    gsap.fromTo(
      rows,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.32, stagger: 0.02, ease: 'power2.out', clearProps: 'transform,opacity' }
    );
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.tab!));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[n].dataset.tab!, true);
    });
  });
}
