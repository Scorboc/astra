import * as pc from 'playcanvas';
import originUrl from '../../public/universe/origin-moon-v1.webp?url';
import auroraUrl from '../../public/universe/aurora-paradise-v1.webp?url';
import velirUrl from '../../public/universe/velir-future-v1.webp?url';

// This isolated scene reads no ASTRA profile, storage or personal data.
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
let approach = location.hash === '#approach';
let azimuth = 0;
let drag = null;
let targetDistance = null;
const pointers = new Map();
let twoFinger = null;

function syncView() {
  approach = location.hash === '#approach';
  targetDistance = null;
  document.body.classList.toggle('approach', approach);
  $('approach').hidden = approach;
  $('outside').hidden = !approach;
  $('title').innerHTML = approach ? 'У входа<br>в обсерваторию' : 'Обсерватория<br>среди планет';
}
function syncPause() {
  $('pause').textContent = paused ? 'Включить движение' : 'Пауза движения';
  $('pause').setAttribute('aria-pressed', String(paused));
}
addEventListener('hashchange', syncView);
$('approach').addEventListener('click', () => { location.hash = 'approach'; syncView(); });
$('outside').addEventListener('click', () => { azimuth = 0; location.hash = 'outside'; syncView(); });
$('view').addEventListener('click', () => { azimuth = azimuth > 0 ? -0.18 : 0.18; });
$('pause').addEventListener('click', () => { paused = !paused; syncPause(); });
reduced.addEventListener('change', () => { paused = reduced.matches; syncPause(); });
syncView(); syncPause();

try { await buildScene(); }
catch (error) {
  $('status').textContent = '3D-сцена не запустилась в этом браузере. Вернись к галактике или открой изображение для сравнения.';
  console.error(error);
}

async function buildScene() {
  const canvas = $('application');
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2], alpha: true, antialias: true, powerPreference: 'high-performance' });
  const options = new pc.AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
  options.resourceHandlers = [pc.TextureHandler];
  const app = new pc.AppBase(canvas);
  app.init(options);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.scene.toneMapping = pc.TONEMAP_ACES;
  app.scene.gammaCorrection = pc.GAMMA_SRGB;
  const $scene = $('scene');
  const rgb = hex => new pc.Color(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  function material(hex, { metal = 0, gloss = .5, emissive = 0, intensity = 1, opacity = 1, map = null, additive = false, unlit = false } = {}) {
    const m = new pc.StandardMaterial();
    m.diffuse = rgb(hex); m.useMetalness = true; m.metalness = metal; m.gloss = gloss;
    if (emissive) { m.emissive = rgb(emissive); m.emissiveIntensity = intensity; }
    if (map) { m.diffuseMap = map; m.opacityMap = map; m.opacityMapChannel = 'a'; }
    if (opacity < 1 || map || additive) { m.blendType = additive ? pc.BLEND_ADDITIVEALPHA : pc.BLEND_NORMAL; m.opacity = opacity; m.depthWrite = false; m.cull = pc.CULLFACE_NONE; }
    if (unlit) m.useLighting = false;
    m.update(); return m;
  }
  function entity(name, geometry, mat, parent = app.root) {
    const e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(pc.Mesh.fromGeometry(device, geometry), mat)] });
    parent.addChild(e); return e;
  }
  function custom(name, positions, indices, mat, uvs = null, parent = app.root) {
    const mesh = new pc.Mesh(device);
    mesh.setPositions(positions);
    mesh.setNormals(pc.calculateNormals(positions, indices));
    if (uvs) mesh.setUvs(0, uvs);
    mesh.setIndices(indices); mesh.update();
    const e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
    parent.addChild(e); return e;
  }
  const v3 = (x, y, z) => new pc.Vec3(x, y, z);
  function segment(name, a, b, radius, mat, parent = app.root) {
    const delta = b.clone().sub(a);
    const e = entity(name, new pc.CylinderGeometry({ radius, height: delta.length(), capSegments: 7 }), mat, parent);
    e.setLocalPosition(a.clone().add(b).mulScalar(.5));
    e.setLocalRotation(new pc.Quat().setFromDirections(pc.Vec3.UP, delta.normalize()));
    return e;
  }
  function light(type, color, intensity, x, y, z) {
    const e = new pc.Entity('light');
    e.addComponent('light', { type, color: rgb(color), intensity, castShadows: false });
    e.setPosition(x, y, z); if (type === 'directional') e.lookAt(0, 3, 0);
    app.root.addChild(e); return e;
  }
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', { clearColor: new pc.Color(0, 0, 0, 0), fov: 43, nearClip: .1, farClip: 170 });
  app.root.addChild(camera);
  app.scene.ambientLight = rgb(0x59657d);
  light('directional', 0xd4edff, 2.7, -8, 14, 10);
  light('directional', 0x5388ff, 1.7, 12, 8, -12);
  light('omni', 0xff688d, 2.1, 0, 8, -4);
  light('omni', 0x66ffe2, 2.0, 0, 5, -2);

  const steel = material(0x19283b, { metal: .78, gloss: .82 });
  const silver = material(0x9db6c6, { metal: .76, gloss: .85 });
  const dark = material(0x091420, { metal: .54, gloss: .73 });
  const iceTexture = textureFromCanvas(device, iceCanvas());
  const ice = material(0xe3f7ff, { metal: .12, gloss: .91, emissive: 0x82caff, intensity: .67, opacity: .84, map: iceTexture });
  const glass = material(0xe6f7ff, { metal: .08, gloss: .89, emissive: 0x5ba6d2, intensity: .48, opacity: .12 });
  const rose = material(0xff5e78, { emissive: 0xff244c, intensity: 3.4, opacity: .94, unlit: true, additive: true });
  const roseWhite = material(0xffeacb, { emissive: 0xff7c55, intensity: 3.8, opacity: .82, unlit: true, additive: true });
  const roseGlow = material(0xff426c, { emissive: 0xff2c50, intensity: 1.8, opacity: .32, unlit: true, additive: true });
  const cyan = material(0xe8fff1, { emissive: 0x49ffae, intensity: 3, opacity: .9, unlit: true, additive: true });
  const cyanGlow = material(0x69ffad, { emissive: 0x18ff87, intensity: 1.8, opacity: .14, unlit: true, additive: true });

  // Two modular faceted columns: an inner titanium skeleton and a translucent ice shell.
  function prism(name, x, z, levels, mat) {
    const sides = 7, positions = [], indices = [], uvs = [];
    for (let j = 0; j < levels.length - 1; j++) for (let s = 0; s < sides; s++) {
      const at = (level, side) => {
        const angle = side * Math.PI * 2 / sides + .2 + Math.sin(level * 2.3) * .065;
        const [y, radius] = levels[level];
        const facet = .87 + .15 * Math.sin(side * 3.4 + level * 1.7);
        return [x + Math.cos(angle) * radius * facet, y, z + Math.sin(angle) * radius * facet];
      };
      const a = at(j, s), b = at(j, (s + 1) % sides), c = at(j + 1, s), d = at(j + 1, (s + 1) % sides);
      const n = positions.length / 3;
      positions.push(...a, ...b, ...c, ...d);
      uvs.push(s / sides, j / levels.length, (s + 1) / sides, j / levels.length, s / sides, (j + 1) / levels.length, (s + 1) / sides, (j + 1) / levels.length);
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
    return custom(name, positions, indices, mat, uvs);
  }
  for (const side of [-1, 1]) {
    const x = side * 6.45, z = -1.55;
    const foot = entity('column foot', new pc.CylinderGeometry({ radius: 1.55, height: .45, capSegments: 8 }), dark); foot.setPosition(x, .08, z);
    prism('metal spine', x, z, [[.3, .76], [3.1, .83], [8.8, .56], [13.6, .15], [14.8, .018]], steel);
    prism('faceted ice shell', x, z, [[.25, 1.36], [2.7, 1.5], [5.8, 1.28], [8.7, 1.01], [11.5, .67], [13.7, .27], [15.1, .008]], ice);
    for (const a of [-1, 1]) {
      segment('ice edge', v3(x + a * .67, .35, z + .42), v3(x + a * .49, 8.8, z + .3), .038, silver);
      segment('ice edge tip', v3(x + a * .49, 8.8, z + .3), v3(x, 15.05, z), .025, silver);
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + .26;
      segment('titanium ridge', v3(x + Math.cos(a) * .89, .4, z + Math.sin(a) * .89), v3(x + Math.cos(a) * .57, 8.7, z + Math.sin(a) * .57), .055, steel);
      segment('titanium ridge upper', v3(x + Math.cos(a) * .57, 8.7, z + Math.sin(a) * .57), v3(x, 15.05, z), .033, silver);
    }
    for (let i = 0; i < 3; i++) {
      const chip = prism('ice buttress', x + side * (1.08 + i * .32), z + 1.1 + i * .24, [[.1, .38], [1.8 + i * .7, .56], [5.8 + i * .8, .015]], i === 1 ? steel : ice);
      chip.setLocalEulerAngles(0, side * 8, 0);
    }
  }

  // One actual 3D luminous ring, not a static image. Glow uses coarse additive shells.
  const ringGroup = new pc.Entity('red magenta light ring'); app.root.addChild(ringGroup);
  ringGroup.setPosition(0, 8.65, -5.7);
  function verticalRing(name, radius, tube, mat, z = 0) {
    const e = entity(name, new pc.TorusGeometry({ ringRadius: radius, tubeRadius: tube, segments: 144, sides: 7 }), mat, ringGroup);
    e.setLocalPosition(0, 0, z); e.setLocalEulerAngles(90, 0, 0); return e;
  }
  verticalRing('ring core', 5.75, .12, rose, 0);
  verticalRing('ring outer glow', 5.75, .55, roseGlow, -.08);
  verticalRing('ring inner stroke', 5.53, .033, roseWhite, .07);
  function irregularBand(name, offset, width, mat) {
    const positions = [], indices = [];
    for (let i = 0; i <= 144; i++) {
      const a = i / 144 * Math.PI * 2;
      const ripple = Math.sin(a * 11 + offset * 10) * .072 + Math.sin(a * 23 - offset * 7) * .033;
      const r = 5.75 + offset + ripple;
      for (const side of [-1, 1]) positions.push(Math.cos(a) * (r + side * width), Math.sin(a) * (r + side * width), .12 + offset * .1);
      if (i < 144) { const q = i * 2; indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    return custom(name, positions, indices, mat, null, ringGroup);
  }
  irregularBand('irregular coral energy', .12, .04, rose);
  irregularBand('irregular white hot energy', -.09, .017, roseWhite);
  const flamePositions = [], flameIndices = [];
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    const flutter = .18 + .32 * Math.abs(Math.sin(i * 7.51));
    const tip = 5.84 + flutter;
    const q = flamePositions.length / 3;
    flamePositions.push(Math.cos(a - .022) * 5.73, Math.sin(a - .022) * 5.73, -.02,
      Math.cos(a + .022) * 5.73, Math.sin(a + .022) * 5.73, -.02,
      Math.cos(a + .007) * tip, Math.sin(a + .007) * tip, .02);
    flameIndices.push(q, q + 1, q + 2);
  }
  custom('coral energy tongues', flamePositions, flameIndices, roseGlow, null, ringGroup);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, b = a + .075 + (i % 3) * .025, r = 5.66 + Math.sin(i * 6.1) * .08;
    segment('ring energy', v3(Math.cos(a) * r, Math.sin(a) * r, .12), v3(Math.cos(b) * r, Math.sin(b) * r, .12), .027, i % 3 ? rose : roseWhite, ringGroup);
  }

  // Beam: nested cylindrical core and a crossed soft gradient plane for volume.
  for (const [radius, mat] of [[.09, cyan], [.37, cyanGlow], [.76, cyanGlow]]) {
    const e = entity('vertical green beam', new pc.CylinderGeometry({ radius, height: 18.4, capSegments: 18 }), mat);
    e.setPosition(0, 10.2, -4.9);
  }
  const beamTexture = textureFromCanvas(device, beamCanvas());
  const beamPlane = material(0xafffea, { map: beamTexture, opacity: .8, emissive: 0x39ffca, intensity: 1, additive: true, unlit: true });
  for (const rotation of [0, 90]) {
    const positions = [-2.6, 1, -4.9, 2.6, 1, -4.9, -2.6, 19.4, -4.9, 2.6, 19.4, -4.9];
    const e = custom('beam haze', positions, [0, 1, 2, 1, 3, 2], beamPlane, [0, 0, 1, 0, 0, 1, 1, 1]);
    e.setEulerAngles(0, rotation, 0);
  }

  // A glazed wall and upper half-dome leave the warm interior visible.
  const floor = entity('observatory floor', new pc.CylinderGeometry({ radius: 5.35, height: .32, capSegments: 52 }), steel);
  floor.setPosition(0, -.2, .8);
  const rim = entity('silver floor rim', new pc.TorusGeometry({ ringRadius: 5.3, tubeRadius: .055, segments: 96, sides: 8 }), silver);
  rim.setPosition(0, -.02, .8);
  const domePositions = [], domeIndices = [], domeUvs = [];
  const longitude = 48, latitude = 12;
  for (let row = 0; row <= latitude; row++) {
    const elevation = row / latitude * Math.PI / 2;
    for (let col = 0; col <= longitude; col++) {
      const a = col / longitude * Math.PI * 2;
      domePositions.push(Math.cos(a) * Math.cos(elevation) * 5.05,
        1.12 + Math.sin(elevation) * 2.55,
        .55 + Math.sin(a) * Math.cos(elevation) * 3.05);
      domeUvs.push(col / longitude, row / latitude);
      if (row < latitude && col < longitude) {
        const q = row * (longitude + 1) + col;
        domeIndices.push(q, q + longitude + 1, q + 1, q + 1, q + longitude + 1, q + longitude + 2);
      }
    }
  }
  custom('translucent observatory half dome', domePositions, domeIndices, glass, domeUvs);
  const warmGlass = material(0xa4cedd, { metal: .12, gloss: .91, emissive: 0xa28668, intensity: .36, opacity: .32 });
  const glazedWall = entity('warm glazed observatory wall', new pc.CylinderGeometry({ radius: 4.92, height: 1.05, capSegments: 40 }), warmGlass);
  glazedWall.setPosition(0, .58, .55);
  const wallTop = entity('observatory wall crown', new pc.TorusGeometry({ ringRadius: 4.91, tubeRadius: .055, segments: 96, sides: 8 }), silver);
  wallTop.setPosition(0, 1.12, .55);
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2;
    segment('warm window mullion', v3(Math.sin(a) * 4.9, .11, .55 + Math.cos(a) * 4.9), v3(Math.sin(a) * 4.9, 1.12, .55 + Math.cos(a) * 4.9), .027, silver);
  }
  for (const z of [-1.9, -.9, .25, 1.4, 2.5]) {
    let last = null;
    for (let j = 0; j <= 14; j++) {
      const u = j / 14 * 2 - 1, x = u * 4.95, y = .12 + Math.sqrt(Math.max(0, 1 - u * u)) * 3.65;
      const p = v3(x, y, z);
      if (last) segment('dome rib', last, p, .027, silver);
      last = p;
    }
  }
  for (const x of [-.98, .98]) segment('entry post', v3(x, .12, 3.35), v3(x, 2.05, 3.35), .065, silver);
  const warm = material(0xffecd0, { emissive: 0xffd291, intensity: 2.4, opacity: .8, additive: true, unlit: true });
  for (const x of [-3.9, -2.3, 0, 2.3, 3.9]) {
    const e = entity('warm interior light', new pc.SphereGeometry({ radius: .16, latitudeBands: 8, longitudeBands: 8 }), warm);
    e.setPosition(x, .7, .55);
  }
  light('omni', 0xffd7aa, 1.4, 0, 1.6, 2);
  let prev = null;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - i / 8 * Math.PI, p = v3(Math.cos(a) * .98, 2.05 + Math.sin(a) * 1.15, 3.35);
    if (prev) segment('pointed entrance', prev, p, .06, silver);
    prev = p;
  }
  for (const [name, x, y, z, w, h, d, mat] of [
    ['bridge deck', 0, -.25, 8.6, 2.7, .16, 10.4, steel],
    ['bridge left light', -1.23, -.11, 8.6, .045, .045, 10.4, cyan],
    ['bridge right light', 1.23, -.11, 8.6, .045, .045, 10.4, cyan]
  ]) {
    const e = entity(name, new pc.BoxGeometry({ halfExtents: v3(w / 2, h / 2, d / 2) }), mat); e.setPosition(x, y, z);
  }

  const cloudTex = textureFromCanvas(device, cloudCanvas());
  const cloudMat = material(0xffffff, { map: cloudTex, opacity: .42, unlit: true, additive: true });
  const cloudPositions = [], cloudUvs = [], cloudIndices = [];
  let seed = 9417; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cloudCount = innerWidth < 700 ? 33 : 63;
  for (let i = 0; i < cloudCount; i++) {
    const a = random() * Math.PI * 2, r = 4.5 + random() * 4.8, s = 2.2 + random() * 2.8;
    const x = Math.cos(a) * r, z = .3 + Math.sin(a) * r, y = -.7 - random() * .5, q = i * 4;
    cloudPositions.push(x - s, y, z - s, x + s, y, z - s, x - s, y, z + s, x + s, y, z + s);
    cloudUvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    cloudIndices.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
  }
  const cloud = custom('white cloud bank', cloudPositions, cloudIndices, cloudMat, cloudUvs);

  // Small real 3D planets reuse only existing project textures, not the concept JPEG.
  let loadedPlanets = 0;
  function planet(name, url, radius, pos, rotation) {
    const mat = material(0x9db7c9, { gloss: .53, metal: .05 });
    const e = entity(name, new pc.SphereGeometry({ radius, latitudeBands: 40, longitudeBands: 64 }), mat);
    e.setPosition(...pos); e.setEulerAngles(...rotation);
    const asset = new pc.Asset(name, 'texture', { url }); app.assets.add(asset);
    asset.ready(a => { mat.diffuse = rgb(0xffffff); mat.diffuseMap = a.resource; mat.update(); loadedPlanets++; $scene.dataset.planets = String(loadedPlanets); });
    asset.on('error', () => { $scene.dataset.planetError = name; });
    app.assets.load(asset); return e;
  }
  const origin = planet('Исток', originUrl, 5.3, [-17.5, 3.9, -21], [-12, -22, 0]);
  const aurora = planet('Аврора', auroraUrl, 4.25, [17.5, 10.2, -25], [-10, 27, 0]);
  const velir = planet('Велир', velirUrl, 1.75, [15.2, 1.5, -31], [-12, 20, 0]);
  const planetRing = entity('Velir thin ring', new pc.TorusGeometry({ ringRadius: 2.45, tubeRadius: .045, segments: 96, sides: 6 }), silver);
  planetRing.setPosition(15.2, 1.5, -31); planetRing.setEulerAngles(14, 18, -16);
  // A single merged mesh keeps the dark asteroid field cheap to draw.
  const rockPositions = [], rockIndices = [];
  let rockSeed = 73091;
  const rockRandom = () => ((rockSeed = (rockSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 76; i++) {
    const around = i < 25 ? [-11.5, 4, -28] : [13.5, 5.6, -27];
    const cx = around[0] + (rockRandom() - .5) * (i < 25 ? 16 : 22);
    const cy = around[1] + (rockRandom() - .5) * 8.5;
    const cz = around[2] + (rockRandom() - .5) * 9;
    const s = .07 + Math.pow(rockRandom(), 3) * .52;
    const q = rockPositions.length / 3;
    rockPositions.push(cx - s, cy, cz, cx + s * .9, cy, cz,
      cx, cy - s * .75, cz - s * .65, cx, cy + s * 1.15, cz + s * .25,
      cx, cy, cz + s, cx, cy, cz - s);
    const faces = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4,
      2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
    for (const index of faces) rockIndices.push(q + index);
  }
  custom('distant asteroid field', rockPositions, rockIndices, material(0x394057, { metal: .28, gloss: .18 }));

  function resize() {
    device.maxPixelRatio = Math.min(devicePixelRatio, innerWidth < 700 ? 1.15 : 1.55);
    app.resizeCanvas(); $scene.dataset.viewport = `${innerWidth}x${innerHeight}`;
  }
  addEventListener('resize', resize); resize();
  const distanceLimits = () => innerWidth < 700 ? [13, 42] : [10, 38];
  function moveDistance(delta) {
    const [min, max] = distanceLimits();
    targetDistance = Math.max(min, Math.min(max, (targetDistance ?? (innerWidth < 700 ? 22 : 25.8)) + delta));
    $('outside').hidden = false;
  }
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const dx = event.deltaX * scale, dy = event.deltaY * scale;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) azimuth = Math.max(-.32, Math.min(.32, azimuth + dx * .0012));
    else moveDistance(-dy * .018);
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    drag = pointers.size === 1 ? { x: event.clientX, azimuth } : null;
    if (pointers.size === 2) twoFinger = { y: [...pointers.values()].reduce((sum, p) => sum + p.y, 0) / 2, distance: targetDistance ?? (innerWidth < 700 ? 22 : 25.8) };
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && twoFinger) {
      const averageY = [...pointers.values()].reduce((sum, p) => sum + p.y, 0) / 2;
      targetDistance = Math.max(distanceLimits()[0], Math.min(distanceLimits()[1], twoFinger.distance + (averageY - twoFinger.y) * .045));
    } else if (drag) azimuth = Math.max(-.32, Math.min(.32, drag.azimuth + (event.clientX - drag.x) * .003));
  });
  const release = event => { pointers.delete(event.pointerId); drag = null; twoFinger = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' || event.key === '+') { event.preventDefault(); moveDistance(-1.6); }
    if (event.key === 'ArrowDown' || event.key === '-') { event.preventDefault(); moveDistance(1.6); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); azimuth = Math.max(-.32, Math.min(.32, azimuth + (event.key === 'ArrowLeft' ? -.07 : .07))); }
  });
  let elapsed = 0, frames = 0, metricAt = performance.now();
  const destination = v3(0, 6.2, 29), look = v3(0, 6, -1), target = v3(0, 6, -1);
  camera.setPosition(destination); camera.lookAt(look);
  app.on('update', dt => {
    if (document.hidden) return;
    if (!paused) elapsed += dt;
    const mobile = innerWidth < 700;
    camera.camera.fov = mobile ? 64 : 45;
    const radius = targetDistance ?? (approach ? (mobile ? 16 : 13) : (mobile ? 22 : 25.8));
    const near = targetDistance === null ? Number(approach) : Math.max(0, Math.min(1, ((mobile ? 22 : 25.8) - radius) / ((mobile ? 22 : 25.8) - 13)));
    destination.set(Math.sin(azimuth) * radius, (mobile ? 8.2 : 6.2) * (1 - near) + 3.4 * near, Math.cos(azimuth) * radius);
    target.set(0, (mobile ? 6.1 : 6) * (1 - near) + 2.25 * near, -1 + 1.4 * near);
    const f = paused || reduced.matches ? 1 : 1 - Math.exp(-Math.min(dt, .05) * 3.1);
    const current = camera.getPosition(); current.lerp(current, destination, f); camera.setPosition(current);
    look.lerp(look, target, f); camera.lookAt(look);
    if (!paused) {
      ringGroup.setLocalEulerAngles(0, 0, Math.sin(elapsed * .33) * 1.1);
      cloud.setLocalPosition(0, Math.sin(elapsed * .28) * .075, 0);
      origin.rotateLocal(0, dt * .33, 0); aurora.rotateLocal(0, dt * .22, 0); velir.rotateLocal(0, dt * .35, 0);
    }
    frames++; const now = performance.now();
    if (now - metricAt >= 2000) {
      $scene.dataset.fps = (frames * 1000 / (now - metricAt)).toFixed(1);
      $scene.dataset.calls = String(app.stats.drawCalls.total);
      $scene.dataset.mode = approach ? 'approach' : 'outside';
      $scene.dataset.cameraDistance = radius.toFixed(2);
      $scene.dataset.azimuth = azimuth.toFixed(3);
      metricAt = now; frames = 0;
    }
  });
  device.on('devicelost', () => { $('status').textContent = '3D приостановлено. Обнови страницу или открой изображение для сравнения.'; });
  app.start(); $scene.dataset.engine = 'playcanvas'; $scene.dataset.ready = 'true';
  $('status').textContent = '';
}

function textureFromCanvas(device, canvas) {
  const t = new pc.Texture(device, { width: canvas.width, height: canvas.height, format: pc.PIXELFORMAT_SRGBA, mipmaps: true });
  t.setSource(canvas); t.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR; t.magFilter = pc.FILTER_LINEAR; return t;
}
function iceCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
  const ctx = c.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 512, 1024);
  base.addColorStop(0, 'rgba(225,249,255,.82)'); base.addColorStop(.31, 'rgba(81,161,218,.64)');
  base.addColorStop(.68, 'rgba(16,51,95,.83)'); base.addColorStop(1, 'rgba(131,220,255,.73)');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 1024);
  let seed = 6479; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 190; i++) {
    const x = random() * 512, y = random() * 1024, len = 70 + random() * 280;
    ctx.strokeStyle = i % 3 ? `rgba(216,248,255,${.08 + random() * .24})` : `rgba(8,38,89,${.12 + random() * .24})`;
    ctx.lineWidth = .5 + random() * 2.3; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - .5) * 90, y + len); ctx.stroke();
  }
  for (let i = 0; i < 45; i++) {
    const x = random() * 512, y = random() * 1024, r = 12 + random() * 75;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(218,255,255,.34)'); g.addColorStop(1, 'rgba(67,190,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}
function beamCanvas() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(55,255,205,0)'); g.addColorStop(.25, 'rgba(63,255,202,.05)');
  g.addColorStop(.5, 'rgba(216,255,250,.72)'); g.addColorStop(.75, 'rgba(63,255,202,.05)'); g.addColorStop(1, 'rgba(55,255,205,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 512); return c;
}
function cloudCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d'); let seed = 27; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 48; i++) {
    const a = random() * 6.283, r = random() * 58, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r, s = 25 + random() * 48;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.55, 'rgba(225,241,255,.08)'); g.addColorStop(1, 'rgba(200,224,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  }
  return c;
}
