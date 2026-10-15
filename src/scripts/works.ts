import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

export function initWorks(): void {
  const root = document.querySelector<HTMLElement>('[data-works]');
  if (!root || prefersReducedMotion()) return;

  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-mosaic-item]'));

  items.forEach((item) => {
    const photo = item.querySelector<HTMLElement>('[data-mosaic-photo]');
    const depth = Number(item.dataset.depth ?? 8);

    // появление диафрагмой (один раз)
    if (photo) {
      gsap.fromTo(
        photo,
        { clipPath: 'circle(0% at 50% 50%)', scale: 1.08 },
        {
          clipPath: 'circle(75% at 50% 50%)',
          scale: 1,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: item, start: 'top 85%', once: true },
          clearProps: 'clipPath',
        }
      );
    }

    // параллакс 4–12% по глубине: у каждого фото своя скорость
    gsap.fromTo(
      item,
      { yPercent: depth },
      {
        yPercent: -depth,
        ease: 'none',
        scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });

  ScrollTrigger.refresh();
}
