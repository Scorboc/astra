// Camera calibration of the existing 1550 x 1014 Cycles frames. The model is not
// reconstructed here: these numbers give a world-space size to its image plane.
export const CASTLE_CENTER = [-40, -.06, -68] as const;
export const CASTLE_RENDER_RADIUS = 21.6; // Blender horizontal radius 36 * scale .6
export const CASTLE_ELEVATION = -7.25 / 36;
export const CASTLE_FRAME_WIDTH = 2 * Math.hypot(36, 7.25) * .6 * 18 / 26.799999237;
export const CASTLE_FRAME_HEIGHT = CASTLE_FRAME_WIDTH * 1014 / 1550;
export const CASTLE_CLOSE_RADIUS = 22.5;
export const CASTLE_PHONE_RADIUS = 64;
export const CASTLE_MAX_ANGLE = 40;

export function castleBearing(position: { x: number; y: number; z: number }) {
  const x = position.x - CASTLE_CENTER[0], z = position.z - CASTLE_CENTER[2];
  const radius = Math.hypot(x, z);
  // Blender front is -Y. Its +X becomes world -Z when the castle faces +X.
  const yaw = -Math.atan2(z, x) * 180 / Math.PI;
  const angle = Math.max(-CASTLE_MAX_ANGLE, Math.min(CASTLE_MAX_ANGLE, yaw));
  return { radius, yaw, frame: (angle + 40) / 4,
    elevation: Math.atan2(position.y - CASTLE_CENTER[1], radius) * 180 / Math.PI,
    supported: Math.abs(yaw) <= CASTLE_MAX_ANGLE };
}

export function framePair(value: number, loaded: ReadonlySet<number>) {
  const wanted = Math.max(0, Math.min(20, Number.isFinite(value) ? value : 10));
  const sorted = [...loaded].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const lower = sorted.filter(i => i <= wanted).at(-1) ?? sorted[0];
  const upper = sorted.find(i => i >= wanted) ?? sorted[sorted.length - 1];
  return { lower, upper, mix: upper === lower ? 0 : (wanted - lower) / (upper - lower) };
}

export function projectedCastle(depth: number, verticalFov: number, viewportHeight: number) {
  if (!Number.isFinite(depth) || depth <= .5) return undefined;
  const pixels = viewportHeight / (2 * Math.tan(verticalFov * Math.PI / 360) * depth);
  return { width: CASTLE_FRAME_WIDTH * pixels, height: CASTLE_FRAME_HEIGHT * pixels };
}
