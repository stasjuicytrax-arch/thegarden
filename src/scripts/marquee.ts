import { gsap, prefersReducedMotion } from './motion';
import { getLenis } from './lenis';

const BASE_DURATION = 18; // секунд на полный проход половины трека (базовая скорость ленты)

function createMarquee(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-marquee-track]');
  if (!track) return;

  if (prefersReducedMotion()) return; // лента стоит на месте (DESIGN-SYSTEM.md §8)

  const tween = gsap.to(track, {
    xPercent: -50,
    duration: BASE_DURATION,
    ease: 'none',
    repeat: -1,
  });

  let targetScale = 1;
  let lastEventAt = 0;

  const lenis = getLenis();
  lenis?.on('scroll', (instance) => {
    const velocity = instance.velocity;
    const direction = velocity >= 0 ? 1 : -1;
    const magnitude = 1 + Math.min(Math.abs(velocity) / 12, 4);
    targetScale = direction * magnitude;
    lastEventAt = performance.now();
  });

  gsap.ticker.add(() => {
    // Без свежих событий скролла лента плавно возвращается к базовому темпу вперёд.
    const idle = performance.now() - lastEventAt > 120;
    if (idle) targetScale += (1 - targetScale) * 0.04;
    const current = tween.timeScale();
    tween.timeScale(current + (targetScale - current) * 0.15);
  });
}

export function initMarquees(): void {
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach(createMarquee);
}
