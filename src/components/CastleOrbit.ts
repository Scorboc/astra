import { assetUrl } from '../asset-url.ts';
import { advanceOrbit, CENTER_FRAME, clampFrame, fitFrame, FRAME_COUNT, FRAME_ORDER, frameAngle, nearestFrame } from './castle-orbit-model.ts';
import './castle-orbit.css';

interface CastleOrbitOptions {
  onExit: () => void;
  exitLabel?: string;
  standalone?: boolean;
}

// One DOM component is shared by the galaxy and the standalone /castle-orbit/ page.
export function mountCastleOrbit(parent: HTMLElement, options: CastleOrbitOptions) {
  const root = document.createElement('section');
  root.className = `castle-orbit${options.standalone ? ' castle-orbit--standalone' : ''}`;
  root.setAttribute('aria-label', 'Обсерватория. Обзор по кадрам Blender');
  root.innerHTML = `
    <div class="castle-orbit__top"><button type="button" class="castle-orbit__exit"></button></div>
    <div class="castle-orbit__stage" tabindex="0" role="group" aria-label="Обзор замка" aria-describedby="castle-orbit-hint">
      <canvas role="img" aria-label="Обсерватория, фронтальный вид"></canvas>
    </div>
    <div class="castle-orbit__status" role="status" aria-live="polite"></div>
    <div class="castle-orbit__controls" role="group" aria-label="Поворот вида замка">
      <button type="button" class="castle-orbit__left" aria-label="Повернуть вид влево">◀</button>
      <input type="range" min="0" max="20" step="1" value="10" aria-label="Угол обзора замка" />
      <button type="button" class="castle-orbit__right" aria-label="Повернуть вид вправо">▶</button>
      <button type="button" class="castle-orbit__center" aria-label="Вернуть фронтальный вид">⌖</button>
    </div>
    <p class="castle-orbit__hint" id="castle-orbit-hint">Перетащи вид мышью или пальцем. Стрелки и колесо тоже поворачивают вид — от −40° до +40°.</p>`;
  parent.append(root);
  const stage = root.querySelector<HTMLElement>('.castle-orbit__stage')!;
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const range = root.querySelector('input')!;
  const status = root.querySelector<HTMLElement>('.castle-orbit__status')!;
  const exit = root.querySelector<HTMLButtonElement>('.castle-orbit__exit')!;
  exit.textContent = options.exitLabel ?? '← Продолжить полёт';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const images = new Map<number, HTMLImageElement>();
  const loaded = new Set<number>(), failed = new Set<number>();
  const pending = new Map<number, { cancel: () => void }>();
  const cleanups: (() => void)[] = [];
  let position = CENTER_FRAME, velocity = 0, raf = 0, lastTick = 0, destroyed = false;
  let pointer: { id: number; x: number; time: number } | null = null;
  let lastMove = 0, drawRevision = 0, lastDraw = '';

  function listen(target: EventTarget, name: string, handler: EventListener, settings?: AddEventListenerOptions) {
    target.addEventListener(name, handler, settings);
    cleanups.push(() => target.removeEventListener(name, handler, settings));
  }

  function draw() {
    if (destroyed) return;
    const actual = nearestFrame(position, loaded);
    const key = `${actual}:${drawRevision}:${canvas.width}:${canvas.height}`;
    range.value = String(Math.round(position));
    range.setAttribute('aria-valuetext', `${frameAngle(position)} градусов`);
    root.dataset.frame = String(Math.round(position));
    root.dataset.actualFrame = actual === undefined ? '' : String(actual);
    root.dataset.reducedMotion = String(reduced.matches);
    if (lastDraw === key) return;
    lastDraw = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (actual === undefined) return;
    const img = images.get(actual)!;
    const rect = fitFrame(canvas.width, canvas.height, img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    canvas.setAttribute('aria-label', `Обсерватория, вид ${frameAngle(actual)} градусов. Предрендер Blender`);
  }

  function stop() {
    velocity = 0;
    cancelAnimationFrame(raf);
    raf = 0;
    lastTick = 0;
  }

  function tick(time: number) {
    raf = 0;
    if (destroyed) return;
    const next = advanceOrbit(position, velocity, lastTick ? (time - lastTick) / 1000 : 1 / 60, reduced.matches);
    position = next.position;
    velocity = next.velocity;
    lastTick = time;
    draw();
    if (velocity && !pointer) raf = requestAnimationFrame(tick);
    else lastTick = 0;
  }

  function setPosition(value: number) {
    stop();
    position = clampFrame(value);
    draw();
  }

  function fit() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(stage.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * ratio));
    draw();
  }
  const resize = new ResizeObserver(fit);
  resize.observe(stage);
  cleanups.push(() => resize.disconnect());
  fit();

  function updateStatus() {
    root.dataset.loaded = String(loaded.size);
    root.dataset.failed = String(failed.size);
    status.replaceChildren();
    if (failed.size) {
      status.append(document.createTextNode('Часть ракурсов не загрузилась. '));
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Повторить загрузку';
      retry.addEventListener('click', () => {
        const frames = [...failed];
        failed.clear();
        updateStatus();
        void preload(frames);
      }, { once: true });
      status.append(retry);
    } else if (loaded.size < FRAME_COUNT) status.textContent = `Загрузка ракурсов: ${loaded.size} из ${FRAME_COUNT}`;
  }

  function loadFrame(index: number): Promise<void> {
    return new Promise(resolve => {
      if (destroyed || loaded.has(index)) { resolve(); return; }
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = index === CENTER_FRAME ? 'high' : 'low';
      const finish = (ok: boolean) => {
        pending.delete(index);
        image.onload = image.onerror = null;
        if (!destroyed) {
          if (ok) { loaded.add(index); images.set(index, image); failed.delete(index); }
          else failed.add(index);
          drawRevision++;
          updateStatus();
          draw();
        }
        resolve();
      };
      pending.set(index, { cancel: () => finish(false) });
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = assetUrl(`/castle-orbit/transparent/f${String(index).padStart(2, '0')}.webp`);
    });
  }

  // Center is completed first, then two bounded workers move outward. No initial galaxy download.
  async function preload(order: readonly number[]) {
    const queue = [...order];
    await Promise.all([0, 1].map(async () => {
      while (!destroyed && queue.length) await loadFrame(queue.shift()!);
    }));
  }
  updateStatus();
  const ready = loadFrame(CENTER_FRAME).then(() => preload(FRAME_ORDER.filter(i => i !== CENTER_FRAME)));

  listen(exit, 'click', () => options.onExit());
  listen(root.querySelector('.castle-orbit__left')!, 'click', () => setPosition(Math.round(position) - 1));
  listen(root.querySelector('.castle-orbit__right')!, 'click', () => setPosition(Math.round(position) + 1));
  listen(root.querySelector('.castle-orbit__center')!, 'click', () => setPosition(CENTER_FRAME));
  listen(range, 'input', () => setPosition(Number(range.value)));
  listen(root, 'keydown', event => {
    const e = event as KeyboardEvent;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); options.onExit(); return; }
    if (e.target === range) { stop(); return; } // Native range already handles its arrow keys.
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();
    setPosition(e.key === 'Home' ? CENTER_FRAME : Math.round(position) + (e.key === 'ArrowLeft' ? -1 : 1));
  });
  listen(stage, 'wheel', event => {
    const e = event as WheelEvent;
    if (e.ctrlKey || e.metaKey) return; // Do not hijack browser zoom or pinch-zoom.
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta) setPosition(position + Math.sign(delta));
  }, { passive: false });
  listen(stage, 'pointerdown', event => {
    const e = event as PointerEvent;
    if (pointer || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stop();
    stage.focus({ preventScroll: true });
    pointer = { id: e.pointerId, x: e.clientX, time: performance.now() };
    lastMove = 0;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  listen(stage, 'pointermove', event => {
    const e = event as PointerEvent;
    if (!pointer || pointer.id !== e.pointerId) return;
    const now = performance.now(), seconds = Math.max(.008, (now - pointer.time) / 1000);
    const step = -(e.clientX - pointer.x) / Math.max(26, stage.clientWidth / 26);
    position = clampFrame(position + step);
    velocity = reduced.matches ? 0 : Math.max(-24, Math.min(24, step / seconds * .6));
    pointer.x = e.clientX;
    pointer.time = now;
    lastMove = now;
    draw();
  });
  const endDrag: EventListener = event => {
    const e = event as PointerEvent;
    if (!pointer || pointer.id !== e.pointerId) return;
    pointer = null;
    stage.classList.remove('is-dragging');
    if (e.type !== 'pointerup' || reduced.matches || performance.now() - lastMove > 120) stop();
    else if (velocity && !raf) raf = requestAnimationFrame(tick);
  };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(stage, event, endDrag);
  listen(stage, 'dblclick', () => setPosition(CENTER_FRAME));
  listen(reduced, 'change', () => { stop(); draw(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); });
  root.querySelector<HTMLButtonElement>('.castle-orbit__center')!.focus({ preventScroll: true });

  return {
    element: root,
    ready,
    destroy() {
      destroyed = true;
      stop();
      cleanups.forEach(fn => fn());
      for (const entry of pending.values()) entry.cancel();
      pending.clear();
      images.clear();
      root.remove();
    },
  };
}
