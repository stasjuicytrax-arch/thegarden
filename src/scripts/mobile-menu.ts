import { lockScroll, unlockScroll } from './scroll-lock';

let dialog: HTMLDialogElement | null = null;
let toggleButtons: NodeListOf<HTMLButtonElement> | null = null;

function syncToggles(open: boolean): void {
  toggleButtons?.forEach((btn) => btn.setAttribute('aria-expanded', String(open)));
}

export function openMobileMenu(originBtn?: HTMLElement | null): void {
  if (!dialog || dialog.open) return;

  const origin = originBtn ?? toggleButtons?.[0];
  if (origin) {
    const rect = origin.getBoundingClientRect();
    dialog.style.setProperty('--origin-x', `${rect.left + rect.width / 2}px`);
    dialog.style.setProperty('--origin-y', `${rect.top + rect.height / 2}px`);
  }

  dialog.showModal();
  requestAnimationFrame(() => dialog?.classList.add('mobile-menu--open'));
  lockScroll();
  syncToggles(true);
}

export function closeMobileMenu(): void {
  if (!dialog || !dialog.open) return;
  dialog.classList.remove('mobile-menu--open');
  syncToggles(false);
  unlockScroll();
  const d = dialog;
  const onEnd = () => {
    d.removeEventListener('transitionend', onEnd);
    d.close();
  };
  d.addEventListener('transitionend', onEnd);
  // На случай reduced-motion / отсутствия transition — закрыть и без события.
  setTimeout(() => d.open && d.close(), 400);
}

export function initMobileMenu(): void {
  dialog = document.querySelector<HTMLDialogElement>('#mobile-menu');
  toggleButtons = document.querySelectorAll<HTMLButtonElement>('[data-menu-toggle]');
  if (!dialog) return;

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (dialog?.open) closeMobileMenu();
      else openMobileMenu(btn);
    });
  });

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeMobileMenu();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeMobileMenu();
  });

  dialog.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu());
  });
}
