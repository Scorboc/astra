// These are discrete Cycles renders, not a freely orbiting 3D camera.
export const FRAME_COUNT = 21;
export const CENTER_FRAME = 10;
export const FRAME_ORDER = Array.from({ length: FRAME_COUNT }, (_, i) => i)
  .sort((a, b) => Math.abs(a - CENTER_FRAME) - Math.abs(b - CENTER_FRAME));

export function clampFrame(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(FRAME_COUNT - 1, value)) : CENTER_FRAME;
}

export function frameAngle(value: number): number {
  return (Math.round(clampFrame(value)) - CENTER_FRAME) * 4;
}

export function nearestFrame(value: number, loaded: ReadonlySet<number>): number | undefined {
  const frame = Math.round(clampFrame(value));
  return FRAME_ORDER.filter(i => loaded.has(i))
    .sort((a, b) => Math.abs(a - frame) - Math.abs(b - frame))[0];
}

export function fitFrame(width: number, height: number, sourceWidth = 1550, sourceHeight = 1014) {
  const scale = Math.max(0, Math.min(width / sourceWidth, height / sourceHeight));
  const w = sourceWidth * scale, h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

export function advanceOrbit(position: number, velocity: number, seconds: number, reduced: boolean) {
  if (reduced) return { position: clampFrame(position), velocity: 0 };
  const dt = Math.min(Math.max(seconds, 0), .05);
  const next = clampFrame(position + velocity * dt);
  const speed = velocity * Math.exp(-6 * dt);
  return { position: next, velocity: next === 0 || next === FRAME_COUNT - 1 || Math.abs(speed) < .02 ? 0 : speed };
}

// A close inspection must not reopen every frame after the visitor dismisses it.
export function createApproachGate() {
  let armed = true;
  return {
    observe(distance: number, facing: number, flying: boolean): boolean {
      if (distance > 40) armed = true;
      if (!flying || !armed || !Number.isFinite(distance) || !Number.isFinite(facing) || distance >= 31 || facing < .65) return false;
      armed = false;
      return true;
    },
  };
}
