import { getStudio, setStudio, onStudioChange, type StudioId } from './studio-state';

let initialized = false;

function paint(root: HTMLElement, id: StudioId | null): void {
  const thumb = root.querySelector<HTMLElement>('.studio-switch__thumb');
  const chips = root.querySelectorAll<HTMLButtonElement>('.studio-switch__chip');

  chips.forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.studio === id));
  });

  if (!thumb) return;

  if (!id) {
    thumb.style.clipPath = 'inset(0 100% 0 0 round 9999px)';
    return;
  }

  const active = root.querySelector<HTMLButtonElement>(`.studio-switch__chip[data-studio="${id}"]`);
  if (!active) return;

  const rootRect = root.getBoundingClientRect();
  const chipRect = active.getBoundingClientRect();
  const left = chipRect.left - rootRect.left - 2;
  const right = rootRect.right - chipRect.right - 2;
  thumb.style.clipPath = `inset(0 ${Math.max(0, right)}px 0 ${Math.max(0, left)}px round 9999px)`;
}

export function initStudioSwitches(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-studio-switch]');
  roots.forEach((root) => {
    paint(root, getStudio());
    root.querySelectorAll<HTMLButtonElement>('.studio-switch__chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        setStudio(chip.dataset.studio as StudioId);
      });
    });
  });

  if (!initialized) {
    initialized = true;
    onStudioChange((id) => {
      document.querySelectorAll<HTMLElement>('[data-studio-switch]').forEach((root) => paint(root, id));
    });
    window.addEventListener('resize', () => {
      document.querySelectorAll<HTMLElement>('[data-studio-switch]').forEach((root) => paint(root, getStudio()));
    });
  }
}
