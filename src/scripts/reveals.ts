import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

// Заголовок → текст → медиа: 28px + opacity, один раз, шаг 70ms (TZ.md §6.2, «Все секции»).
const REVEAL = [
  '.sale__head > *',
  '.price__head > *',
  '.works__head > *',
  '.loyalty__title',
  '.social__lead',
  '.studio__head > *',
  '.studio__body > *',
  '.footer__left > *',
  '.footer__links',
].join(',');

/** Смена полей: фон страницы pearl ↔ peony 640ms при пересечении 40% вьюпорта. */
function initFields(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section, #footer'));
  sections.forEach((el) => {
    const field = el.dataset.field ?? 'pearl';
    const set = () => document.body.setAttribute('data-field', field);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 40%',
      end: 'bottom 40%',
      onEnter: set,
      onEnterBack: set,
    });
  });
}

function initReveals(): void {
  gsap.set(REVEAL, { opacity: 0, y: 28 });
  ScrollTrigger.batch(REVEAL, {
    start: 'top 88%',
    once: true,
    interval: 0.1,
    batchMax: 6,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.64,
        stagger: 0.07,
        ease: 'expo.out',
        clearProps: 'transform,opacity',
      }),
  });
}

export function initPageMotion(): void {
  initFields();
  if (prefersReducedMotion()) return;
  initReveals();
  ScrollTrigger.refresh();
}
