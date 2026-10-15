import { gsap, ScrollTrigger, Flip, prefersReducedMotion } from './motion';
import { getStudio, onStudioChange, type StudioId } from './studio-state';
import { isSameMonth } from './calendar';

const ONLY_IN: Record<StudioId, string> = {
  pushkin: 'Только в Пушкине',
  frunzenskaya: 'Только в СПб (Фрунзенская)',
};

function parseDays(value: string | undefined): number[] {
  return value ? value.split(',').map(Number) : [];
}

function cardDays(card: HTMLElement, studio: StudioId | null): number[] {
  const p = parseDays(card.dataset.daysPushkin);
  const f = parseDays(card.dataset.daysFrunzenskaya);
  if (studio === 'pushkin') return p;
  if (studio === 'frunzenskaya') return f;
  return [...p, ...f];
}

/** Скидка «отсчитывается» 0 → значение (600ms) и фото раскрывается диафрагмой — один раз. */
function initReveals(cards: HTMLElement[]): void {
  cards.forEach((card) => {
    const el = card.querySelector<HTMLElement>('[data-promo-discount]');
    const photo = card.querySelector<HTMLElement>('[data-reveal-mirror]');
    if (!el) return;
    const value = Number(el.dataset.discountValue);
    const prefix = el.dataset.discountPrefix ?? '';
    const suffix = el.dataset.discountSuffix ?? '';
    const counter = { v: 0 };
    ScrollTrigger.create({
      trigger: card,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        el.textContent = `${prefix}0${suffix}`;
        gsap.to(counter, {
          v: value,
          duration: 0.6,
          ease: 'expo.out',
          onUpdate: () => {
            el.textContent = `${prefix}${Math.round(counter.v)}${suffix}`;
          },
          onComplete: () => {
            el.textContent = `${prefix}${value}${suffix}`;
          },
        });
        if (photo) {
          gsap.from(photo, {
            clipPath: 'circle(0% at 50% 50%)',
            scale: 1.08,
            duration: 1.1,
            ease: 'expo.out',
          });
        }
      },
    });
  });
}

export function initSale(): void {
  const root = document.querySelector<HTMLElement>('[data-sale]');
  if (!root) return;
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-promo-card]'));
  const dayBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-day]'));
  const empty = root.querySelector<HTMLElement>('[data-sale-empty]');
  const reduced = prefersReducedMotion();

  let selectedDay: number | null = null;

  const today = new Date();
  if (isSameMonth(root.dataset.month ?? '', today)) {
    dayBtns
      .find((b) => Number(b.dataset.day) === today.getDate())
      ?.setAttribute('data-today', 'true');
  }

  const paint = (animate: boolean) => {
    const studio = getStudio();
    const marked = new Set<number>();
    cards.forEach((c) => cardDays(c, studio).forEach((d) => marked.add(d)));
    dayBtns.forEach((b) => {
      const d = Number(b.dataset.day);
      const has = marked.has(d);
      b.setAttribute('data-has', String(has));
      b.setAttribute('aria-pressed', String(d === selectedDay));
      const wd = b.querySelector('.calendar__wd')?.textContent?.trim();
      const label = wd ? `${wd} ${d}` : String(d);
      b.setAttribute('aria-label', has ? `${label}, есть акции` : label);
    });

    const state = animate && !reduced ? Flip.getState(cards) : null;
    let visible = 0;
    cards.forEach((card) => {
      const allMonth = card.dataset.allMonth === '1';
      const days = cardDays(card, studio);
      const hasDates =
        parseDays(card.dataset.daysPushkin).length + parseDays(card.dataset.daysFrunzenskaya).length > 0;
      const dimNote = card.querySelector<HTMLElement>('[data-promo-dim-note]');

      // Акция не действует в выбранной студии — приглушаем с пометкой, не прячем.
      const otherOnly = !!studio && !allMonth && hasDates && days.length === 0;
      card.setAttribute('data-dimmed', String(otherOnly));
      if (dimNote) {
        dimNote.hidden = !otherOnly;
        if (otherOnly && studio) {
          dimNote.textContent = ONLY_IN[studio === 'pushkin' ? 'frunzenskaya' : 'pushkin'];
        }
      }

      const matches = selectedDay === null || allMonth || days.includes(selectedDay);
      card.hidden = !matches;
      if (matches) visible++;
    });
    if (empty) empty.hidden = visible > 0;

    if (state) Flip.from(state, { duration: 0.32, ease: 'power2.inOut' });
  };

  dayBtns.forEach((b) =>
    b.addEventListener('click', () => {
      const d = Number(b.dataset.day);
      selectedDay = selectedDay === d ? null : d;
      paint(true);
    })
  );
  onStudioChange(() => paint(true));

  paint(false);
  if (!reduced) initReveals(cards);
}
