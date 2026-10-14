import { getLenis } from './lenis';

let depth = 0;

/** Общий замок скролла для модалок (меню, шторка записи). Считает вложенность на случай
 *  двух открытых диалогов подряд, останавливает Lenis, чтобы колесо не "протекало" под модалкой. */
export function lockScroll(): void {
  depth += 1;
  if (depth > 1) return;
  document.documentElement.classList.add('scroll-locked');
  getLenis()?.stop();
}

export function unlockScroll(): void {
  depth = Math.max(0, depth - 1);
  if (depth > 0) return;
  document.documentElement.classList.remove('scroll-locked');
  getLenis()?.start();
}
