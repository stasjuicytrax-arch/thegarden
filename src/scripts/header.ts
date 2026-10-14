const HIDE_THRESHOLD = 120;

function initHideOnScroll(header: HTMLElement): void {
  let lastY = window.scrollY;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const goingDown = y > lastY;
      const hidden = goingDown && y > HIDE_THRESHOLD;
      header.setAttribute('data-hidden', String(hidden));
      lastY = y;
    },
    { passive: true }
  );
}

function initActiveAnchor(links: NodeListOf<HTMLAnchorElement>): void {
  const targets = Array.from(links)
    .map((link) => {
      const id = link.getAttribute('data-nav-link');
      const section = id ? document.querySelector(id) : null;
      return section ? { link, section } : null;
    })
    .filter((v): v is { link: HTMLAnchorElement; section: Element } => v !== null);

  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const match = targets.find((t) => t.section === entry.target);
        if (!match) return;
        if (entry.isIntersecting) {
          targets.forEach((t) => t.link.removeAttribute('aria-current'));
          match.link.setAttribute('aria-current', 'true');
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  targets.forEach((t) => observer.observe(t.section));
}

export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  initHideOnScroll(header);
  initActiveAnchor(header.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
}
