import * as T from 'three';

const DEPTH = 30;
const COLORS = ['#aef6cf', '#5fe6a0', '#eafff2'] as const;

function seeded(seed = 6073) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * A camera-local star volume inspired by the supplied Starfield Close brief.
 * Keeping it attached to the camera makes it an atmospheric background layer:
 * planets still occlude it, but the volume never runs out as the route moves.
 */
export function createStarfieldClose(camera: T.PerspectiveCamera, mobile: boolean, reducedMotion: boolean, pixelRatio: number) {
  const rand = seeded();
  const count = reducedMotion ? 900 : mobile ? 1800 : 3600;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const palettes = new Float32Array(count);
  const brightness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (rand() - 0.5) * 24;
    positions[i3 + 1] = (rand() - 0.5) * 16;
    positions[i3 + 2] = -(0.5 + rand() * DEPTH);
    palettes[i] = Math.floor(rand() * 3);
    brightness[i] = 0.7 + rand() * 0.6;
    scales[i] = 0.5 + Math.pow(rand(), 1.4) * 2.5;
    phases[i] = rand();
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new T.Float32BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new T.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aPalette', new T.Float32BufferAttribute(palettes, 1));
  geometry.setAttribute('aBright', new T.Float32BufferAttribute(brightness, 1));

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 9 },
    uRatio: { value: pixelRatio },
    uOpacity: { value: reducedMotion ? 0.72 : 0 },
    uDrift: { value: 0 },
    uDepth: { value: DEPTH },
    uCursor: { value: new T.Vector3(0, 0, -6) },
    uRepelRadius: { value: 5 },
    uRepelStrength: { value: 0.35 },
    uActivity: { value: 0 },
    uColorA: { value: new T.Color(COLORS[0]) },
    uColorB: { value: new T.Color(COLORS[1]) },
    uColorC: { value: new T.Color(COLORS[2]) },
    uBrightness: { value: 5 },
  };

  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: T.AdditiveBlending,
    toneMapped: false,
    uniforms,
    vertexShader: `
      uniform float uTime, uSize, uRatio, uDrift, uDepth;
      uniform vec3 uCursor;
      uniform float uRepelRadius, uRepelStrength, uActivity;
      uniform vec3 uColorA, uColorB, uColorC;
      attribute float aScale, aPhase, aPalette, aBright;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec3 pos = position;
        pos.z = -mod(-pos.z + uDrift, uDepth) - 0.5;
        float tw = sin(uTime * 1.6 + aPhase * 6.2831);
        vTwinkle = 0.55 + 0.45 * tw;
        vec3 toParticle = pos - uCursor;
        float dist = length(toParticle);
        float falloff = smoothstep(uRepelRadius, 0.0, dist);
        pos += normalize(toParticle + vec3(0.0001)) * falloff * uRepelStrength * uActivity;
        vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = uRatio * uSize * aScale * (1.0 / max(0.4, -viewPosition.z));
        vColor = (aPalette < 0.5 ? uColorA : (aPalette < 1.5 ? uColorB : uColorC)) * aBright;
      }
    `,
    fragmentShader: `
      uniform float uOpacity, uBrightness;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float strength = pow(1.0 - d * 2.0, 4.0);
        gl_FragColor = vec4(vColor * uBrightness * strength, strength * uOpacity * vTwinkle);
      }
    `,
  });

  const points = new T.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -50;
  const group = new T.Group();
  group.name = 'starfield-close';
  group.add(points);
  camera.add(group);

  const pointer = new T.Vector2();
  const pointerTarget = new T.Vector3(0, 0, -6);
  let pointerActive = false;
  let activity = 0;
  let drift = 0;
  let age = 0;

  return {
    count,
    setPixelRatio(value: number) {
      uniforms.uRatio.value = value;
    },
    pointerMove(x: number, y: number) {
      pointer.set(T.MathUtils.clamp(x, -1, 1), T.MathUtils.clamp(y, -1, 1));
      pointerActive = true;
    },
    pointerLeave() {
      pointerActive = false;
    },
    update(time: number, dt: number, travelGap: number, paused: boolean) {
      const targetActivity = !paused && pointerActive ? 1 : 0;
      activity += (targetActivity - activity) * Math.min(1, dt * 8);
      const viewHeight = Math.tan(T.MathUtils.degToRad(camera.fov * 0.5)) * 12;
      pointerTarget.set(pointer.x * viewHeight * camera.aspect, pointer.y * viewHeight, -6);
      uniforms.uCursor.value.lerp(pointerTarget, Math.min(1, dt * 9));
      uniforms.uActivity.value = activity;
      uniforms.uTime.value = time;
      if (!paused) {
        const surge = Math.min(1, travelGap * 30);
        drift += dt * (2.35 + surge * 6);
        group.rotation.z += dt * (0.03 + surge * 0.1);
        age += dt;
        uniforms.uOpacity.value = Math.min(2, Math.max(0, (age - 0.3) / 1.4) * 2);
      }
      uniforms.uDrift.value = drift;
    },
    dispose() {
      camera.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
