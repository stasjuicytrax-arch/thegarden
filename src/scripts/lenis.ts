import Lenis from 'lenis';

let lenis: Lenis | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function initLenis(): Lenis | null {
  if (prefersReducedMotion()) return null;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time: number) {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  return lenis;
}

/** Плавный переход по якорю с учётом высоты фиксированной шапки. */
export function scrollToAnchor(target: string | HTMLElement): void {
  const headerOffset = -72;
  if (lenis) {
    lenis.scrollTo(target, { offset: headerOffset, duration: 1.2 });
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}

/** Перехватывает клики по внутренним якорям (#id) по всему сайту и ведёт их через Lenis. */
export function initAnchorScrolling(): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scrollToAnchor(id);
    history.pushState(null, '', id);
  });
}
