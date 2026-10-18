// Camera calibration of the existing 1550 x 1014 Cycles frames. The model is not
// reconstructed here: these numbers give a world-space size to its image plane.
export const CASTLE_CENTER = [-40, -.06, -68] as const;
export const CASTLE_RENDER_RADIUS = 21.6; // Blender horizontal radius 36 * scale .6
export const CASTLE_ELEVATION = -7.25 / 36;
export const CASTLE_FRAME_WIDTH = 2 * Math.hypot(36, 7.25) * .6 * 18 / 26.799999237;
export const CASTLE_FRAME_HEIGHT = CASTLE_FRAME_WIDTH * 1014 / 1550;
export const CASTLE_CLOSE_RADIUS = 27;
export const CASTLE_PHONE_RADIUS = 72;
export const CASTLE_MAX_ANGLE = 40;
export const CASTLE_SOURCE_WIDTH = 1550;
export const CASTLE_SOURCE_HEIGHT = 1014;

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

// The image belongs to the calibrated capture plane, not to the viewer's
// screen axes. In particular, turning the head must not turn the castle card.
export function castleFrameCorners(angle: number) {
  const yaw = -Math.max(-40, Math.min(40, angle)) * Math.PI / 180;
  const normal = [Math.cos(yaw), CASTLE_ELEVATION, Math.sin(yaw)];
  const length = Math.hypot(...normal);
  for (let i = 0; i < 3; i++) normal[i] /= length;
  const right = [Math.sin(yaw), 0, -Math.cos(yaw)];
  const up = [-normal[1] * Math.cos(yaw), Math.hypot(normal[0], normal[2]), -normal[1] * Math.sin(yaw)];
  // TL, TR, BR, BL, matching the source image's coordinates.
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => ({
    x: CASTLE_CENTER[0] + right[0] * x * CASTLE_FRAME_WIDTH / 2 + up[0] * y * CASTLE_FRAME_HEIGHT / 2,
    y: CASTLE_CENTER[1] + up[1] * y * CASTLE_FRAME_HEIGHT / 2,
    z: CASTLE_CENTER[2] + right[2] * x * CASTLE_FRAME_WIDTH / 2 + up[2] * y * CASTLE_FRAME_HEIGHT / 2,
  }));
}

type Point2 = { x: number; y: number };
// Unit square -> projected world quadrilateral. CSS does the perspective
// interpolation on its compositor; no additional 3D engine or image filter.
export function castleHomography(points: Point2[]) {
  if (points.length !== 4 || points.some(p => !Number.isFinite(p.x + p.y))) return undefined;
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < .000001) return undefined;
  const g = (dx3 * dy2 - dx2 * dy3) / det, h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y;
  const determinant = a * (e - f * h) - b * (d - f * g) + c * (d * h - e * g);
  if (Math.abs(determinant) < .000001) return undefined;
  const inverse = [e - f*h, c*h - b, b*f - c*e, f*g - d, a - c*g, c*d - a*f, d*h - e*g, b*g - a*h, a*e - b*d].map(n => n / determinant);
  const css = [a/CASTLE_SOURCE_WIDTH, d/CASTLE_SOURCE_WIDTH, 0, g/CASTLE_SOURCE_WIDTH,
    b/CASTLE_SOURCE_HEIGHT, e/CASTLE_SOURCE_HEIGHT, 0, h/CASTLE_SOURCE_HEIGHT,
    0, 0, 1, 0, c, f, 0, 1];
  return { coefficients: [a, b, c, d, e, f, g, h, 1], inverse, css: `matrix3d(${css.join(',')})` };
}

export function transformCastlePoint(matrix: number[], x: number, y: number) {
  const w = matrix[6]*x + matrix[7]*y + matrix[8];
  return Math.abs(w) < .000001 ? undefined : {
    x: (matrix[0]*x + matrix[1]*y + matrix[2])/w,
    y: (matrix[3]*x + matrix[4]*y + matrix[5])/w,
  };
}
