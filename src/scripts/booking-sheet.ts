import { lockScroll, unlockScroll } from './scroll-lock';
import { getStudio, getStudioData, getBookingUrl, setStudio, onStudioChange, type StudioId } from './studio-state';

let dialog: HTMLDialogElement | null = null;

interface PromoContext {
  label: string;
  dates: string;
}

function readPromoFromTrigger(trigger: HTMLElement | null): PromoContext | null {
  const label = trigger?.dataset.promoLabel;
  const dates = trigger?.dataset.promoDates;
  if (!label) return null;
  return { label, dates: dates ?? '' };
}

function paintPromo(promo: PromoContext | null): void {
  const el = dialog?.querySelector<HTMLElement>('[data-booking-promo]');
  if (!el) return;
  if (!promo) {
    el.hidden = true;
    el.removeAttribute('data-filled');
    return;
  }
  el.hidden = false;
  el.setAttribute('data-filled', '');
  el.textContent = `Акция: ${promo.label}${promo.dates ? ` — ${promo.dates}` : ''}`;
}

function paintStudio(id: StudioId | null): void {
  if (!dialog) return;

  dialog.querySelectorAll<HTMLButtonElement>('[data-studio-row]').forEach((row) => {
    row.setAttribute('aria-pressed', String(row.dataset.studio === id));
  });

  const cta = dialog.querySelector<HTMLElement>('[data-booking-cta]');
  const studio = getStudioData(id);
  if (!cta || !studio) {
    if (cta) cta.hidden = true;
    return;
  }

  cta.hidden = false;
  const main = dialog.querySelector<HTMLAnchorElement>('[data-booking-main-cta]');
  if (main) main.href = getBookingUrl(studio.id);

  const tg = dialog.querySelector<HTMLAnchorElement>('[data-booking-telegram]');
  if (tg) tg.href = studio.telegram;
  const wa = dialog.querySelector<HTMLAnchorElement>('[data-booking-whatsapp]');
  if (wa) wa.href = studio.whatsapp;
  const max = dialog.querySelector<HTMLAnchorElement>('[data-booking-max]');
  if (max) max.href = studio.max;
}

export function openBookingSheet(trigger?: HTMLElement | null): void {
  if (!dialog || dialog.open) return;

  paintPromo(readPromoFromTrigger(trigger ?? null));
  paintStudio(getStudio());

  dialog.showModal();
  requestAnimationFrame(() => dialog?.classList.add('booking-sheet--open'));
  lockScroll();
}

export function closeBookingSheet(): void {
  if (!dialog || !dialog.open) return;
  dialog.classList.remove('booking-sheet--open');
  dialog.style.transform = '';
  unlockScroll();
  const d = dialog;
  const onEnd = () => {
    d.removeEventListener('transitionend', onEnd);
    d.close();
  };
  d.addEventListener('transitionend', onEnd);
  setTimeout(() => d.open && d.close(), 400);
}

function initDrag(sheet: HTMLDialogElement): void {
  const handle = sheet.querySelector<HTMLElement>('[data-booking-drag]');
  if (!handle) return;

  let startY = 0;
  let dy = 0;
  let dragging = false;

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (dy > 120) {
      closeBookingSheet();
    } else {
      sheet.style.transform = '';
    }
  };

  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    dy = 0;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

export function initBookingSheet(): void {
  dialog = document.querySelector<HTMLDialogElement>('#booking-sheet');
  if (!dialog) return;

  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-open-booking]');
    if (trigger) openBookingSheet(trigger);
  });

  dialog.querySelector('[data-booking-close]')?.addEventListener('click', () => closeBookingSheet());

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeBookingSheet();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeBookingSheet();
  });

  dialog.querySelectorAll<HTMLButtonElement>('[data-studio-row]').forEach((row) => {
    row.addEventListener('click', () => setStudio(row.dataset.studio as StudioId));
  });

  onStudioChange(paintStudio);
  initDrag(dialog);
}
