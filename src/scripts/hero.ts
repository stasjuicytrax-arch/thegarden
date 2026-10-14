import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

function runLoadSequence(hero: HTMLElement): void {
  const lines = hero.querySelectorAll<HTMLElement>('[data-hero-line]');
  const flower = hero.querySelector<HTMLElement>('[data-hero-flower]');
  const fades = hero.querySelectorAll<HTMLElement>('[data-hero-fade]');

  const tl = gsap.timeline({ defaults: { ease: 'none' } });

  tl.from(lines, {
    yPercent: 110,
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.11,
  });

  if (flower) {
    tl.from(
      flower,
      {
        opacity: 0,
        scale: 0.92,
        y: 28,
        duration: 1.8,
        ease: 'expo.out',
      },
      0.3
    );
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

function initFieldShift(hero: HTMLElement): void {
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: '60% top',
    onEnter: () => hero.setAttribute('data-field', 'peony'),
    onLeaveBack: () => hero.setAttribute('data-field', 'pearl'),
  });
}

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  if (!prefersReducedMotion()) {
    runLoadSequence(hero);
    initFieldShift(hero);
  }
}
