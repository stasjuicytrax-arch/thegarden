import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';
import { getStudio, onStudioChange, type StudioId } from './studio-state';

function runLoadSequence(hero: HTMLElement): void {
  const lines = hero.querySelectorAll<HTMLElement>('[data-hero-line]');
  const frame = hero.querySelector<HTMLElement>('[data-hero-frame]');
  const fades = hero.querySelectorAll<HTMLElement>('[data-hero-fade]');

  const tl = gsap.timeline({ defaults: { ease: 'none' } });

  tl.from(lines, {
    yPercent: 110,
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.11,
  });

  if (frame) {
    tl.from(frame, { opacity: 0, y: 28, duration: 1.1, ease: 'expo.out' }, 0.3);
  }

  tl.from(
    fades,
    {
      opacity: 0,
      y: 28,
      duration: 0.64,
      ease: 'expo.out',
      stagger: 0.07,
    },
    1.1
  );
}

/** Фото выбранной студии в круге; смена — кроссфейд 600ms (transition в CSS). */
function initStudioPhotos(hero: HTMLElement): void {
  const photos = Array.from(hero.querySelectorAll<HTMLElement>('[data-hero-photo]'));
  const paint = (id: StudioId | null) => {
    const active: StudioId = id ?? 'pushkin';
    photos.forEach((p) => {
      if (p.dataset.heroPhoto === active) p.setAttribute('data-active', '');
      else p.removeAttribute('data-active');
    });
  };
  paint(getStudio());
  onStudioChange(paint);
}

/** Радиус круга до скролла (px) — те же формулы, что в CSS (--r). */
function restRadius(): number {
  const w = window.innerWidth;
  return w < 768 ? 0.47 * w : Math.min(0.258 * w, 387);
}

function initDiaphragm(hero: HTMLElement): void {
  const disc = hero.querySelector<HTMLElement>('[data-hero-disc]');
  const photos = hero.querySelectorAll<HTMLElement>('[data-hero-photo]');
  const title = hero.querySelector<HTMLElement>('[data-hero-title]');
  const lead = hero.querySelector<HTMLElement>('[data-hero-lead]');
  if (!disc) return;

  const mobile = () => window.matchMedia('(max-width: 767px)').matches;

  // центр круга и радиус, достаточный, чтобы закрыть весь hero
  const fullRadius = () => {
    const r = hero.getBoundingClientRect();
    const cs = getComputedStyle(hero);
    const cx = (parseFloat(cs.getPropertyValue('--cx')) / 100) * r.width;
    const cy = (parseFloat(cs.getPropertyValue('--cy')) / 100) * r.height;
    return Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 4;
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=100%',
      scrub: 0.8,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(
    disc,
    { '--r': () => `${restRadius()}px` },
    { '--r': () => `${fullRadius()}px`, ease: 'power1.inOut', duration: 1 },
    0
  );
  tl.fromTo(photos, { '--photo-scale': 1.15 }, { '--photo-scale': 1, duration: 1 }, 0);
  if (title) tl.to(title, { yPercent: -45, opacity: 0, duration: 0.55 }, 0);
  if (lead) tl.to(lead, { opacity: 0, duration: 0.4 }, 0);
  void mobile;
}

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  initStudioPhotos(hero);

  // reduced-motion: без пина и анимаций — круг с фото
  if (prefersReducedMotion()) return;

  runLoadSequence(hero);
  initDiaphragm(hero);
  ScrollTrigger.refresh();
}
