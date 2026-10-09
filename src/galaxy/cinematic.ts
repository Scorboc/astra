import * as T from 'three';
import { LEGACY_PLANETS as PLANETS } from './journey';
import type { PlanetId } from './journey';

// Art-directed 2.5D, NOT a freely orbitable planetary mesh. Original 3D is kept
// in scene.ts. Camera limits are intentional: preserve the approved composition.
type Plate = 'origin' | 'galaxy' | 'surface';
type Asset = 'origin' | 'surface' | 'galaxy' | 'galaxy-wide' | 'galaxy-mobile';
type Point = [number, number];
const spots: Record<Exclude<Plate, 'surface'>, Partial<Record<PlanetId, Point>>> = {
  origin: { origin: [.27, .40], aurora: [.82, .17], about: [.30, .62] },
  galaxy: { origin: [.16, .57], aurora: [.49, .39], velir: [.785, .52], nereya: [.245, .16], solis: [.815, .25], about: [.16, .76] },
};
const wideSpots:Partial<Record<PlanetId,Point>>={origin:[.15,.59],aurora:[.49,.44],velir:[.74,.57],nereya:[.26,.21],solis:[.80,.29],about:[.16,.77]};
const mobileSpots:Partial<Record<PlanetId,Point>>={origin:[.18,.72],aurora:[.49,.40],velir:[.82,.49],nereya:[.235,.18],solis:[.815,.23],about:[.20,.83]};
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment = `precision highp float;
uniform sampler2D uMap;uniform vec2 uSpan,uCenter,uDrift;uniform float uTime,uFade,uContain;
varying vec2 vUv;
void main(){
 vec2 uv=uCenter+(vUv-.5)*uSpan;
 float depth=(1.-uv.y)*.5+(1.-uv.x)*.2;
 uv+=uDrift*depth;
 vec3 c=texture2D(uMap,clamp(uv,vec2(.001),vec2(.999))).rgb;
 float mineral=smoothstep(.56,.98,max(c.r,c.b))*max(0.,c.r-c.g*.7);
 c+=c*mineral*(sin(uTime*.6+uv.x*8.)*.015);
 float edge=smoothstep(0.,.065,uv.y)*smoothstep(0.,.065,1.-uv.y);
 c=mix(c,mix(vec3(.0012,.003,.0075),c,edge),uContain);
 gl_FragColor=vec4(c*uFade,1.);
 #include <colorspace_fragment>
}`;
export type GalaxyScene = ReturnType<typeof createGalaxyScene>;
export function createGalaxyScene(host: HTMLElement, labelHost: HTMLElement, callbacks: {
  pick: (id: PlanetId) => void; landed: (yes: boolean) => void; failed: () => void;
}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, disposed = false, stage = 0, plate: Plate = 'origin';
  let desired: Plate = 'origin', ticket = 0, surface = false, width = 1, height = 1;
  let activeAsset:Asset='origin',imageAspect=1.5,initialized=false;
  let zoom = 1, targetZoom = 1, center: Point = [.5, .5], target: Point = [.5, .5];
  let pan: Point = [0, 0], drift: Point = [0, 0], time = 0, last = performance.now();
  let fps = 0, frames = 0, fpsAt = last, raf = 0, landingTimer = 0, switchFade = 1, lastRender = 0;
  const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Кинематографическая сцена. Потяните для сдвига ракурса, колесо или два пальца — масштаб. Обзор ограничен исходным изображением.');
  host.append(canvas);
  const scene = new T.Scene(), camera = new T.Camera();
  const uniforms = {
    uMap: { value: new T.Texture() }, uSpan: { value: new T.Vector2(1, 1) },
    uCenter: { value: new T.Vector2(.5, .5) }, uDrift: { value: new T.Vector2() },
    uTime: { value: 0 }, uFade: { value: 1 },uContain:{value:0},
  };
  const material = new T.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, depthTest: false });
  const geometry = new T.PlaneGeometry(2, 2);
  scene.add(new T.Mesh(geometry, material));
  const placeholder = uniforms.uMap.value;
  const textures = new Map<Asset, Promise<T.Texture>>(), loaded: T.Texture[] = [];
  function assetName(name:Plate):Asset{return name==='galaxy'?(width/height<.85?'galaxy-mobile':width/height<1.45?'galaxy':'galaxy-wide'):name;}
  function texture(name: Asset) {
    if (!textures.has(name)) textures.set(name, new Promise<T.Texture>((resolve, reject) => {
      new T.TextureLoader().load(`/space/${name}.webp`, t => {
        t.colorSpace = T.SRGBColorSpace;
        if (disposed) { t.dispose(); reject(new Error('Scene disposed')); return; }
        loaded.push(t); resolve(t);
      }, undefined, reject);
    }));
    return textures.get(name)!;
  }
  const dust = document.createElement('div'); dust.className = 'cosmic-dust'; dust.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${(i * 37.7) % 100}%;top:${(i * 61.3) % 100}%;--delay:${-(i % 11)}s;--duration:${9 + i % 7}s;--size:${i % 5 === 0 ? 3 : 1}px`;
    dust.append(s);
  }
  host.append(dust);
  const inscription = document.createElement('section');
  inscription.className = 'rock-inscription'; inscription.hidden = true;
  inscription.setAttribute('aria-label', 'Надпись на скале об Astra');
  inscription.innerHTML = '<span>ASTRA / ИСТОРИЯ ПУТИ</span><h2>Твоё направление.<br>Твой путь.</h2><div class="inscription-rule"></div><p>Исследуй желания через маленькие<br>реальные действия.</p><p>30 дней проб и наблюдений.<br>Твой график. Твои ресурсы. Твой темп.</p><p>Несколько объяснимых маршрутов<br>и предварительный план на 90 дней.</p><small>Направление выбираешь ты.</small>';
  host.append(inscription);
  const labels = PLANETS.map(p => {
    const b = document.createElement('button'); b.className = 'planet-label'; b.dataset.planet = p.id;
    b.setAttribute('aria-label', `Планета ${p.name}`); b.style.setProperty('--planet', p.color);
    b.innerHTML = `<i></i><span>${p.name}<small>${p.id === 'about' ? 'История на скале · спуститься' : p.subtitle}</small></span>`;
    b.addEventListener('click', () => callbacks.pick(p.id)); labelHost.append(b);
    return { p, b };
  });
  function baseCenter(name: Plate): Point {
    return width / height < .9 ? (name === 'surface' ? [.32, .49] : name === 'origin' ? [.62, .5] : [.5, .5]) : name==='origin'?[.5,.46]:[.5,.5];
  }
  async function show(name: Plate, reset = true) {
    desired = name;
    const currentTicket = ++ticket;
    try {
      const asset=assetName(name),t = await texture(asset);
      if (disposed || currentTicket !== ticket) return;
      const changed = plate !== name;
      plate = name; uniforms.uMap.value = t; surface = name === 'surface';
      const image=t.image as HTMLImageElement;
      activeAsset=asset;imageAspect=image.width/image.height;uniforms.uContain.value=asset==='galaxy-mobile'?1:0;
      host.dataset.plate = name; host.dataset.renderMode = 'art-directed-2.5d';
      if (changed) switchFade = paused ? 1 : .35;
      if (reset) { targetZoom = 1; target = baseCenter(name); pan = [0, 0]; }
      inscription.hidden = !surface;
      if (surface) { center = [...target]; zoom = 1.035; }
      callbacks.landed(surface);
    } catch { if (!disposed && currentTicket === ticket) callbacks.failed(); }
  }
  function overview(instant = false) {
    clearTimeout(landingTimer); callbacks.landed(false); targetZoom = 1;
    target = baseCenter(stage >= 2 ? 'galaxy' : 'origin'); pan = [0, 0];
    void show(stage >= 2 ? 'galaxy' : 'origin');
    if (instant) { center = [...target]; zoom = 1; }
  }
  function focus(id: PlanetId) {
    clearTimeout(landingTimer); callbacks.landed(false);
    const name = id === 'origin' || id === 'aurora' ? 'origin' : 'galaxy';
    void show(name).then(() => { if (desired === name && !disposed) targetZoom = width < 700 ? 1 : 1.035; });
  }
  function land() {
    clearTimeout(landingTimer); callbacks.landed(false);
    if (plate === 'surface') { void show('surface'); return; }
    void texture('surface').catch(() => { if (!disposed) callbacks.failed(); });
    target = plate === 'origin' ? [.30, .60] : [.16, .63]; targetZoom = paused ? 1 : 2.25;
    landingTimer = window.setTimeout(() => { void show('surface'); }, paused ? 0 : 1150);
  }
  function span(): Point {
    const aspect = width / height;
    if(activeAsset==='galaxy-mobile')return [1/zoom,imageAspect/aspect/zoom];
    return aspect >= imageAspect ? [1 / zoom, imageAspect / aspect / zoom] : [aspect / imageAspect / zoom, 1 / zoom];
  }
  function screenPoint(point: Point, s: Point): Point {
    return [((point[0] - center[0]) / s[0] + .5) * width, ((point[1] - center[1]) / s[1] + .5) * height];
  }
  function resize() {
    const r = host.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false); target = baseCenter(plate); center = [...target];
    if(initialized&&assetName(desired)!==activeAsset)void show(desired);
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  initialized=true;const ready=show('origin');
  function activeSpots(){return activeAsset==='galaxy-mobile'?mobileSpots:activeAsset==='galaxy-wide'?wideSpots:spots[plate==='galaxy'?'galaxy':'origin'];}
  function updateLabels(s: Point) {
    const occupied=[...document.querySelectorAll<HTMLElement>('#intro,#demo-dock,.camera-tools,.galaxy-header')].filter(el=>!el.hidden).map(el=>el.getBoundingClientRect());
    for (const { p, b } of labels) {
      const point = plate === 'surface' ? undefined : activeSpots()[p.id];
      b.classList.toggle('unexplored', PLANETS.findIndex(x => x.id === p.id) > stage && p.id !== 'about');
      if (!point) { b.hidden = true; continue; }
      const [x, y] = screenPoint(point, s);
      const labelX=Math.max(12,Math.min(width-145,x));
      const overlaps=occupied.some(r=>labelX<r.right&&labelX+145>r.left&&y<r.bottom&&y+44>r.top);
      b.hidden = x < -10 || x > width+10 || y < 115 || y > height - 105 || overlaps;
      b.style.transform = `translate(${labelX}px,${y}px)`;
    }
    if (surface) {
      const [x, y] = screenPoint([.265, .51], s), scale = width / s[0] / 1536;
      inscription.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${scale})`;
    }
  }
  function draw(now: number) {
    if (disposed) return;
    // A slow cinematic view does not need to render at a phone's 120/144 Hz.
    if(now-lastRender<1000/(paused?20:60)){raf=requestAnimationFrame(draw);return;}
    lastRender=now;
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!document.hidden) {
      if (!paused) time += dt;
      const ease = paused ? 1 : 1 - Math.exp(-dt * 4.5);
      zoom += (targetZoom - zoom) * ease;
      center[0] += (target[0] - center[0]) * ease; center[1] += (target[1] - center[1]) * ease;
      const s = span();
      center[0] = s[0]>=1?.5:T.MathUtils.clamp(center[0], s[0] / 2, 1 - s[0] / 2);
      center[1] = s[1]>=1?.5:T.MathUtils.clamp(center[1], s[1] / 2, 1 - s[1] / 2);
      drift[0] += ((paused ? 0 : pan[0] * .005 + Math.sin(time * .09) * .0009) - drift[0]) * ease;
      drift[1] += ((paused ? 0 : pan[1] * .003) - drift[1]) * ease;
      switchFade += (1 - switchFade) * Math.min(1, dt * 3);
      uniforms.uCenter.value.set(center[0], 1 - center[1]); uniforms.uSpan.value.set(...s);
      uniforms.uDrift.value.set(drift[0], drift[1]); uniforms.uTime.value = time; uniforms.uFade.value = switchFade;
      renderer.render(scene, camera); updateLabels(s); frames++;
      if (now - fpsAt >= 1000) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
    }
    raf = requestAnimationFrame(draw);
  }
  const pointers = new Map<number, Point>(); let travel = 0, pinch = 0;
  const downHandler = (e: PointerEvent) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); travel = 0; canvas.setPointerCapture(e.pointerId); };
  const moveHandler = (e: PointerEvent) => {
    pan = [e.clientX / width - .5, .5 - e.clientY / height];
    if (!pointers.has(e.pointerId)) return;
    const previous = pointers.get(e.pointerId)!; pointers.set(e.pointerId, [e.clientX, e.clientY]);
    travel += Math.abs(e.clientX - previous[0]) + Math.abs(e.clientY - previous[1]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) targetZoom = T.MathUtils.clamp(targetZoom * distance / pinch, 1, 2.8); pinch = distance;
    } else { target[0] -= (e.clientX - previous[0]) / width * .45; target[1] -= (e.clientY - previous[1]) / height * .4; }
  };
  const upHandler = (e: PointerEvent) => {
    const canPick = travel < 7 && !surface && pointers.size === 1 && e.type !== 'pointercancel';
    pointers.delete(e.pointerId); pinch = 0;
    if (!canPick) return;
    const s = span(); let closest: PlanetId | undefined, distance = Infinity;
    for (const [id, pos] of Object.entries(activeSpots())) {
      const [x, y] = screenPoint(pos!, s), d = Math.hypot(e.offsetX - x, e.offsetY - y);
      if (d < distance && d < Math.min(width * .12, 125)) { closest = id as PlanetId; distance = d; }
    }
    if (closest) callbacks.pick(closest);
  };
  const wheelHandler = (e: WheelEvent) => { e.preventDefault(); targetZoom = T.MathUtils.clamp(targetZoom * Math.exp(-e.deltaY * .001), 1, 2.8); };
  const keyHandler = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home'].includes(e.key)) e.preventDefault();
    if (e.key === 'Home') overview();
    if (e.key === '+' || e.key === '-') targetZoom = T.MathUtils.clamp(targetZoom + (e.key === '+' ? .2 : -.2), 1, 2.8);
    if (e.key === 'ArrowLeft') target[0] -= .025; if (e.key === 'ArrowRight') target[0] += .025;
    if (e.key === 'ArrowUp') target[1] -= .025; if (e.key === 'ArrowDown') target[1] += .025;
  };
  const lost = (e: Event) => { e.preventDefault(); callbacks.failed(); };
  const setPause = (yes: boolean) => { paused = yes; host.classList.toggle('motion-paused', yes); };
  const reducedHandler = () => setPause(reduced.matches);
  canvas.addEventListener('pointerdown', downHandler); canvas.addEventListener('pointermove', moveHandler);
  canvas.addEventListener('pointerup', upHandler); canvas.addEventListener('pointercancel', upHandler);
  canvas.addEventListener('wheel', wheelHandler, { passive: false }); canvas.addEventListener('keydown', keyHandler);
  canvas.addEventListener('webglcontextlost', lost); reduced.addEventListener('change', reducedHandler);
  setPause(paused); raf = requestAnimationFrame(draw);
  return {
    ready, overview, focus, land,
    setProgress(value: number) { stage = value; },
    zoom(direction: number) { targetZoom = T.MathUtils.clamp(targetZoom + direction * .2, 1, 2.8); },
    rotate(x: number, y = 0) { target[0] += x * .02; target[1] += y * .02; }, pause: setPause,
    get paused() { return paused; }, get stats() { return { fps, calls: renderer.info.render.calls, triangles: 2, surface }; },
    dispose() {
      disposed = true; ticket++; cancelAnimationFrame(raf); clearTimeout(landingTimer); observer.disconnect();
      reduced.removeEventListener('change', reducedHandler); canvas.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); material.dispose(); placeholder.dispose(); loaded.forEach(t => t.dispose()); renderer.dispose();
      canvas.remove(); dust.remove(); inscription.remove(); labelHost.replaceChildren();
    },
  };
}
