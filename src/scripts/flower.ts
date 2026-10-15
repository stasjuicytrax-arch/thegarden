// Хромовый пион (TZ.md §6.1): процедурная геометрия, MeshPhysicalMaterial, env из фото студии.
// three.js грузится динамически после первого кадра; при отсутствии WebGL2 и т.п. остаётся SVG-fallback.
import type { WebGLRenderTarget, Group } from 'three';
import { getStudio, onStudioChange, type StudioId } from './studio-state';
import { prefersReducedMotion } from './motion';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const ENV_SIZE = { w: 2048, h: 1024 };

function canRunWebGL(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (prefersReducedMotion()) return false;
  if (nav.connection?.saveData) return false;
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export function initFlower(): void {
  const host = document.querySelector<HTMLElement>('[data-hero-flower]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!host || !hero || !canRunWebGL()) return;

  const launch = () =>
    void start(host, hero).catch((err) => console.error('[flower] сцена не запущена:', err));

  // после первого кадра
  requestAnimationFrame(() => requestAnimationFrame(launch));

  // возврат из bfcache: сцена была освобождена в pagehide — поднимаем заново
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && !host.querySelector('canvas')) launch();
  });
}

async function start(host: HTMLElement, hero: HTMLElement): Promise<void> {
  const THREE = await import('three');
  const images: Record<StudioId, HTMLImageElement> = {
    pushkin: await loadImage(`${BASE}/env/pushkin.jpg`),
    frunzenskaya: await loadImage(`${BASE}/env/frunzenskaya.jpg`),
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 320ms ease-out;will-change:transform;';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 3.1, 4.6);
  camera.lookAt(0, 0.1, 0);

  // env: канвас-кроссфейд двух equirect → PMREM
  const envCanvas = document.createElement('canvas');
  envCanvas.width = ENV_SIZE.w;
  envCanvas.height = ENV_SIZE.h;
  const ectx = envCanvas.getContext('2d')!;
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: WebGLRenderTarget | null = null;
  const applyEnv = (from: StudioId, to: StudioId, t: number) => {
    ectx.globalAlpha = 1;
    ectx.drawImage(images[from], 0, 0, ENV_SIZE.w, ENV_SIZE.h);
    if (t > 0 && from !== to) {
      ectx.globalAlpha = t;
      ectx.drawImage(images[to], 0, 0, ENV_SIZE.w, ENV_SIZE.h);
    }
    envTex.needsUpdate = true;
    envRT?.dispose();
    envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;
  };
  let shown: StudioId = getStudio() ?? 'pushkin';
  applyEnv(shown, shown, 0);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf2eef6,
    metalness: 1,
    roughness: 0.08,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
  });
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  // лепесток: чашка + загиб края + лёгкий шум по краю; 24×24 сегмента
  const petalGeo = (len: number, wid: number, cup: number, curl: number, seed: number) => {
    const g = new THREE.PlaneGeometry(1, 1, 24, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i);
      const v = p.getY(i) + 0.5;
      const w = Math.sin(Math.PI * Math.pow(v, 0.7)) * 0.9 + 0.1 * v;
      const edge = Math.abs(u * 2);
      const noise = Math.sin(v * 9 + seed) * Math.cos(u * 11 + seed * 1.7) * 0.025 * edge * v;
      const z = cup * edge * edge * v + curl * Math.pow(v, 3) + noise;
      p.setXYZ(i, u * wid * w, v * len, z);
    }
    g.computeVertexNormals();
    return g;
  };

  const GOLDEN = 137.508 * (Math.PI / 180);
  const tiers = [
    { n: 5, len: 1.25, wid: 0.95, tilt: 1.15, y: 0.0 },
    { n: 8, len: 1.0, wid: 0.8, tilt: 0.9, y: 0.05 },
    { n: 11, len: 0.78, wid: 0.62, tilt: 0.62, y: 0.1 },
    { n: 14, len: 0.55, wid: 0.46, tilt: 0.38, y: 0.15 },
  ];
  const flower = new THREE.Group();
  const petals: { pivot: Group; from: number; to: number; delay: number }[] = [];
  tiers.forEach((t, ti) => {
    const geo = petalGeo(t.len, t.wid, 0.32, 0.35, ti * 3.1);
    for (let i = 0; i < t.n; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = t.y;
      pivot.rotation.y = i * ((Math.PI * 2) / t.n) + ti * GOLDEN;
      pivot.add(new THREE.Mesh(geo, material));
      flower.add(pivot);
      petals.push({ pivot, from: 0.26, to: t.tilt, delay: (3 - ti) * 0.18 + i * 0.012 });
    }
  });
  const budGeo = petalGeo(0.34, 0.26, 0.12, 0.05, 7);
  for (let i = 0; i < 12; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = 0.12;
    pivot.rotation.y = i * GOLDEN;
    pivot.add(new THREE.Mesh(budGeo, material));
    flower.add(pivot);
    petals.push({ pivot, from: 0.1, to: 0.18 + (i % 3) * 0.05, delay: 0.55 });
  }
  flower.position.y = -0.3;
  scene.add(flower);

  const fallbackEl = host.querySelector<HTMLElement>('.flower-fallback');
  host.appendChild(canvas);
  let dead = false;
  let firstFrameDone = false;

  // Курсор наклоняет цветок до ±8° — только на устройствах с точным указателем (desktop).
  const TILT = (8 * Math.PI) / 180;
  const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !mobile;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (canTilt) window.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(r.height, 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // раскрытие 1800ms изнутри наружу, затем «дыхание» ±1.5° с периодом 6 с
  const t0 = performance.now() + 300;
  const OPEN = 1.8;
  const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
  const tilt = (pt: (typeof petals)[number], tt: number) => {
    const o = easeOut(Math.min(Math.max((tt - pt.delay) / OPEN, 0), 1));
    const breathe =
      o >= 1 ? (Math.sin(((tt - pt.delay - OPEN) / 6) * Math.PI * 2) * 1.5 * Math.PI) / 180 : 0;
    return pt.from + (pt.to - pt.from) * o + breathe;
  };

  let visible = true;
  let running = false;
  const frame = (now: number) => {
    if (dead || !visible || document.hidden) {
      running = false;
      return;
    }
    const tt = Math.max((now - t0) / 1000, 0);
    for (const pt of petals) pt.pivot.children[0].rotation.x = -(Math.PI / 2 - tilt(pt, tt));
    // скролл первого экрана: поворот до 40° и опускание на 10vh
    const r = hero.getBoundingClientRect();
    const p = Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1);
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    flower.rotation.y = tt * 0.06 + p * ((40 * Math.PI) / 180);
    flower.rotation.x = pointer.y * TILT;
    flower.rotation.z = -pointer.x * TILT;
    canvas.style.transform = `translate3d(0, ${(p * 10).toFixed(2)}vh, 0)`;
    renderer.render(scene, camera);
    if (!firstFrameDone) {
      // fallback прячем только после первого реально отрисованного кадра
      firstFrameDone = true;
      requestAnimationFrame(() => {
        if (dead) return;
        canvas.style.opacity = '1';
        window.setTimeout(() => {
          if (!dead) fallbackEl?.style.setProperty('visibility', 'hidden');
        }, 340);
      });
    }
    requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!dead && !running && visible && !document.hidden) {
      running = true;
      requestAnimationFrame(frame);
    }
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  });
  io.observe(hero);
  document.addEventListener('visibilitychange', kick);
  kick();

  // смена студии: кроссфейд env 800ms
  let fade = 0;
  const unsubscribe = onStudioChange((id) => {
    const to: StudioId = id ?? 'pushkin';
    if (to === shown) return;
    const from = shown;
    shown = to;
    cancelAnimationFrame(fade);
    const s = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - s) / 800, 1);
      applyEnv(from, to, t);
      if (t < 1) fade = requestAnimationFrame(step);
    };
    fade = requestAnimationFrame(step);
  });

  // потеря контекста: возвращаем fallback, при восстановлении пересоздаём сцену
  const teardown = () => {
    dead = true;
    cancelAnimationFrame(fade);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', kick);
    unsubscribe();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pagehide', teardown);
    flower.traverse((o) => {
      if ((o as import('three').Mesh).isMesh) (o as import('three').Mesh).geometry.dispose();
    });
    material.dispose();
    envRT?.dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    canvas.remove();
    fallbackEl?.style.removeProperty('visibility');
  };
  // уход со страницы: освобождаем GPU-ресурсы
  window.addEventListener('pagehide', teardown);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    dead = true;
    canvas.style.display = 'none';
    fallbackEl?.style.removeProperty('visibility');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    teardown();
    void start(host, hero).catch((err) => console.error('[flower] пересоздание сцены:', err));
  });
}
