import { gsap, prefersReducedMotion } from './motion';

/** Вордмарк поднимается scrub-ом по последним 50vh страницы. */
export function initFooter(): void {
  const footer = document.querySelector<HTMLElement>('[data-footer]');
  const word = document.querySelector<HTMLElement>('[data-footer-word]');
  if (!footer || !word || prefersReducedMotion()) return;

  gsap.fromTo(
    word,
    { yPercent: 35 },
    {
      yPercent: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: footer,
        start: 'bottom bottom+=50%',
        end: 'bottom bottom',
        scrub: true,
      },
    }
  );
}
