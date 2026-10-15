import { getStudio, onStudioChange, type StudioId } from './studio-state';

/** Строки выбранной студии — сверху (flex order). */
export function initSocial(): void {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-social-list] > li, [data-contacts] [data-studio-row]')
  );
  if (!items.length) return;
  const paint = (id: StudioId | null) => {
    items.forEach((li, i) => {
      li.style.order = id && li.dataset.studioRow === id ? String(-10 + i) : String(i);
    });
  };
  paint(getStudio());
  onStudioChange(paint);
}
