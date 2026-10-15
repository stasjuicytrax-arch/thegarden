import { gsap, prefersReducedMotion } from './motion';
import { getStudio, onStudioChange, setStudio, type StudioId } from './studio-state';

const INTERVAL = 4000;

function initCarousel(root: HTMLElement): void {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  if (slides.length < 2) return;
  const reduced = prefersReducedMotion();

  let index = 0;
  let timer = 0;
  let inView = false;

  const show = (next: number, animate: boolean) => {
    const n = (next + slides.length) % slides.length;
    if (n === index) return;
    const prev = slides[index];
    const cur = slides[n];
    index = n;
    dots.forEach((d, i) => (i === n ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));

    cur.style.zIndex = '2';
    cur.setAttribute('data-active', '');
    if (!animate || reduced) {
      prev.removeAttribute('data-active');
      cur.style.zIndex = '';
      return;
    }
    // диафрагма: новый кадр раскрывается кругом поверх предыдущего
    gsap.fromTo(
      cur,
      { clipPath: 'circle(0% at 50% 50%)' },
      {
        clipPath: 'circle(75% at 50% 50%)',
        duration: 0.8,
        ease: 'expo.out',
        onComplete: () => {
          prev.removeAttribute('data-active');
          cur.style.zIndex = '';
          gsap.set(cur, { clearProps: 'clipPath' });
        },
      }
    );
  };

  const stop = () => window.clearInterval(timer);
  const start = () => {
    stop();
    if (reduced || !inView) return;
    timer = window.setInterval(() => show(index + 1, true), INTERVAL);
  };

  dots.forEach((d, i) =>
    d.addEventListener('click', () => {
      show(i, true);
      start();
    })
  );

  // свайп
  let x0 = 0;
  let tracking = false;
  root.addEventListener('pointerdown', (e) => {
    tracking = true;
    x0 = e.clientX;
  });
  window.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 40) {
      show(index + (dx < 0 ? 1 : -1), true);
      start();
    }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1, true);
    if (e.key === 'ArrowLeft') show(index - 1, true);
  });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    start();
  }).observe(root);
}

export function initStudios(): void {
  const root = document.querySelector<HTMLElement>('[data-studios]');
  if (!root) return;

  root.querySelectorAll<HTMLElement>('[data-carousel]').forEach(initCarousel);

  // выбранная студия — первая панель
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-studio-panel]'));
  const order = (id: StudioId | null) => {
    panels.forEach((p, i) => {
      p.style.order = id && p.dataset.studioPanel === id ? '-1' : String(i);
    });
  };
  order(getStudio());
  onStudioChange(order);

  // «Записаться в …» из панели: выбирает эту студию (шторка открывается общим обработчиком)
  root.querySelectorAll<HTMLElement>('[data-studio-book]').forEach((btn) => {
    btn.addEventListener('click', () => setStudio(btn.dataset.studioBook as StudioId));
  });
}
