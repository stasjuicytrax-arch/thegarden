import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';

let registered = false;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Регистрирует плагины GSAP один раз и выставляет общий бюджет анимации. */
export function registerMotion(): typeof gsap {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
    if (prefersReducedMotion()) {
      gsap.globalTimeline.timeScale(100);
      ScrollTrigger.config({ limitCallbacks: true });
    }
    registered = true;
  }
  return gsap;
}

export { gsap, ScrollTrigger, SplitText, Flip };
