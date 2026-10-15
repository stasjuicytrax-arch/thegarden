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
  camera.position.set(0, 2.3, 5.0);
  camera.lookAt(0, 0.55, 0);

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

  // Мягкий лепесток: широкая округлая «ложка» — узкое основание, максимум ширины на ~60% длины,
  // скруглённый кончик; чашеобразный прогиб по ширине, продольный изгиб, загиб края наружу
  // и волнистый край (2–4% ширины). Гладкие нормали (computeVertexNormals), материал двусторонний.
  // 18×18 сегментов: ≤ 650 треугольников на лепесток, вся сцена ≈ 51k.
  const SEG = 18;
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const petalGeo = (len: number, wid: number, cup: number, curl: number, seed: number) => {
    const g = new THREE.PlaneGeometry(1, 1, SEG, SEG);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) * 2; // -1..1 поперёк
      const v = p.getY(i) + 0.5; // 0..1 вдоль
      // контур: узкое основание → плечи → скруглённый кончик (без острой точки)
      const peak = 0.6;
      const w =
        v < peak
          ? 0.28 + 0.72 * smooth(v / peak)
          : Math.sqrt(Math.max(0, 1 - Math.pow((v - peak) / (1 - peak), 2.2))) * 0.985 + 0.015;
      const edge = Math.abs(u);
      // волнистый край: смещение по ширине 2–4% и мелкая рябь по нормали
      const ripple = Math.sin(v * 15 + seed * 2.3 + u * 2.0);
      const x = u * 0.5 * wid * w * (1 + 0.03 * ripple * edge);
      const frill = 0.03 * len * edge * edge * edge * Math.sin(v * 11 + seed) * smooth(v);
      // чашка по ширине + продольный изгиб + загиб кончика наружу (curl < 0)
      const z =
        cup * edge * edge * (0.25 + 0.75 * v) +
        0.16 * len * Math.pow(v, 1.5) +
        curl * Math.pow(v, 3) +
        frill;
      p.setXYZ(i, x, v * len, z);
    }
    g.computeVertexNormals();
    return g;
  };

  const GOLDEN = 137.508 * (Math.PI / 180);
  const tiers = [
    // внешние — крупные и раскрытые, к центру лепестков больше, они мельче и стоят плотнее
    { n: 5, len: 1.25, wid: 0.92, tilt: 1.08, y: 0.0, cup: 0.3 },
    { n: 8, len: 1.15, wid: 0.84, tilt: 0.96, y: 0.2, cup: 0.27 },
    { n: 12, len: 1.04, wid: 0.74, tilt: 0.74, y: 0.45, cup: 0.24 },
    { n: 16, len: 0.92, wid: 0.62, tilt: 0.5, y: 0.7, cup: 0.2 },
    { n: 20, len: 0.78, wid: 0.5, tilt: 0.3, y: 0.92, cup: 0.17 },
  ];
  const flower = new THREE.Group();
  const petals: { pivot: Group; from: number; to: number; delay: number }[] = [];
  tiers.forEach((t, ti) => {
    for (let i = 0; i < t.n; i++) {
      // у каждого лепестка свой шум и небольшой разброс размера/угла — без «штамповки»
      const jitter = Math.sin((ti * 31 + i) * 12.9898) * 0.5;
      const geo = petalGeo(t.len * (1 + 0.06 * jitter), t.wid, t.cup, -0.12, ti * 3.1 + i * 0.7);
      const pivot = new THREE.Group();
      pivot.position.y = t.y;
      pivot.rotation.y = i * ((Math.PI * 2) / t.n) + ti * GOLDEN;
      pivot.add(new THREE.Mesh(geo, material));
      flower.add(pivot);
      petals.push({
        pivot,
        from: 0.22,
        to: t.tilt + 0.05 * jitter,
        delay: (4 - ti) * 0.16 + i * 0.01,
      });
    }
  });
  // плотная середина: 18 мелких лепестков бутона
  for (let i = 0; i < 18; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = 1.02;
    pivot.rotation.y = i * GOLDEN;
    pivot.add(new THREE.Mesh(petalGeo(0.55, 0.3, 0.1, -0.04, 7 + i), material));
    flower.add(pivot);
    petals.push({ pivot, from: 0.08, to: 0.1 + (i % 4) * 0.045, delay: 0.55 });
  }
  flower.position.y = -0.15;
  flower.scale.y = 1.0;
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
    for (const pt of petals) pt.pivot.children[0].rotation.x = -tilt(pt, tt);
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
