import { getStudio, onStudioChange, type StudioId } from './studio-state';

/**
 * Строки выбранной студии — сверху внутри своего списка («Будем на связи» и «Контакты»).
 * Порядок задаётся через flex `order`; не-студийные строки сохраняют inline-order из разметки.
 */
export function initSocial(): void {
  const lists = Array.from(
    document.querySelectorAll<HTMLElement>('[data-social-list], .contacts__rows')
  );
  if (!lists.length) return;

  const paint = (id: StudioId | null) => {
    lists.forEach((list) => {
      const rows = Array.from(list.querySelectorAll<HTMLElement>(':scope > li[data-studio-row]'));
      rows.forEach((li) => {
        const base = Number(li.dataset.baseOrder ?? li.style.order ?? 0);
        li.dataset.baseOrder = String(base);
        li.style.order = id && li.dataset.studioRow === id ? String(base - 100) : String(base);
      });
    });
  };
  paint(getStudio());
  onStudioChange(paint);
}
