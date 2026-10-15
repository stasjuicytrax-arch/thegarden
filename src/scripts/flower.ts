// Хромовый пион (TZ.md §6.1): процедурная геометрия, MeshPhysicalMaterial, env из фото студии.
// three.js грузится динамически после первого кадра; при отсутствии WebGL2 и т.п. остаётся SVG-fallback.
import type { WebGLRenderTarget } from 'three';
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

  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(`${BASE}/models/peony.glb`);
  const model = gltf.scene;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 320ms ease-out;will-change:transform;';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 3.4, 4.3);
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
  model.traverse((o) => {
    if ((o as import('three').Mesh).isMesh) (o as import('three').Mesh).material = material;
  });
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  // Готовая модель пиона (scripts/make-peony.mjs → public/models/peony.glb, ~55k треугольников, meshopt).
  // Цветок лежит лицом вверх, диаметр ≈ 2.5; материал хрома и env — прежние.
  const flower = new THREE.Group();
  flower.add(model);
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

  // раскрытие 1800ms: масштаб 0.6 → 1 и доворот, затем «дыхание» ±1.5% с периодом 6 с
  const t0 = performance.now() + 300;
  const OPEN = 1.8;
  const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

  let visible = true;
  let running = false;
  const frame = (now: number) => {
    if (dead || !visible || document.hidden) {
      running = false;
      return;
    }
    const tt = Math.max((now - t0) / 1000, 0);
    const o = easeOut(Math.min(tt / OPEN, 1));
    const breathe = o >= 1 ? Math.sin(((tt - OPEN) / 6) * Math.PI * 2) * 0.015 : 0;
    model.scale.setScalar(0.6 + 0.4 * o + breathe);
    model.rotation.y = (1 - o) * ((-70 * Math.PI) / 180);
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
