import { gsap, SplitText, prefersReducedMotion } from './motion';

function animateStatement(statement: HTMLElement): void {
  const pieces = Array.from(statement.querySelectorAll<HTMLElement>('[data-intro-piece]'));
  const circles = Array.from(statement.querySelectorAll<HTMLElement>('[data-reveal-circle]'));

  const splits = pieces.map((piece) => new SplitText(piece, { type: 'words' }));

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: statement,
      start: 'top 80%',
      once: true,
    },
  });

  splits.forEach((split, i) => {
    tl.from(
      split.words,
      { opacity: 0, y: 10, duration: 0.4, stagger: 0.03, ease: 'expo.out' },
      i === 0 ? 0 : '-=0.1'
    );

    const circle = circles[i];
    if (circle) {
      tl.from(
        circle,
        { clipPath: 'circle(0% at 50% 50%)', scale: 1.08, duration: 0.5, ease: 'expo.out' },
        '<'
      );
    }
  });
}

export function initIntro(): void {
  const statement = document.querySelector<HTMLElement>('[data-intro-statement]');
  const fades = document.querySelectorAll<HTMLElement>('[data-intro-fade]');

  if (prefersReducedMotion()) return;

  if (statement) animateStatement(statement);

  if (fades.length) {
    gsap.from(fades, {
      opacity: 0,
      y: 28,
      duration: 0.64,
      stagger: 0.07,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: fades[0],
        start: 'top 85%',
        once: true,
      },
    });
  }
}
