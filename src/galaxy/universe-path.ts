import { CatmullRomCurve3, Vector3 } from 'three';
import type { PlanetId } from './journey';

// Physical coordinates, not screen-space hotspots. Progress through this scene
// is deliberately independent of the observations and plan in journey.ts.
export const WORLDS: Record<PlanetId, { position: [number, number, number]; radius: number }> = {
  origin: { position: [-8, 0, 0], radius: 5.5 },
  aurora: { position: [7, 14, -34], radius: 4.5 },
  velir: { position: [-7, -1, -68], radius: 4.2 },
  nereya: { position: [8, 2, -106], radius: 4.8 },
  solis: { position: [-4, 4, -145], radius: 5.8 },
  about: { position: [-16, 9, -21], radius: 3.2 },
};
export const FLIGHT_STOPS = [0, .25, .5, .75, 1] as const;
// Keep the observatory just left of the nebula fold, with its podium aligned to the bend.
export const OBSERVATORY_POSITION = [-46,-6,-87] as const;
export const OBSERVATORY_ROTATION = Math.PI/2; // Local entrance +Z faces the planets (+X).
export const OBSERVATORY_LOAD_DISTANCE = 58;
// The first eight segments retain the five planet stops. The remaining arc
// passes behind Solis and around the outside of the galaxy back to Istok.
// Camera and look-target splines are both closed, including their tangents.
const points = [[-1,5,18],[3,6,-9],[15,17,-17],[16,18,-39],[2,3,-51],[3,3,-73],[17,6,-89],[18,6,-111],[6,8,-126],
  [2,12,-152],[-24,22,-174],[-58,26,-145],[-62,20,-113],[-14,6,-87],[-52,22,-45],[-29,12,33],[2,6,45]];
const targets = [[-7,5,-13],[1,12,-31],[5,13,-37],[-4,0,-65],[-6,0,-71],[7,1,-102],[6,1,-109],[-3,4,-141],[-4,4,-148],
  [-4,4,-145],[-4,4,-143],[-36,3,-100],[-46,3,-87],[-46,0,-87],[-25,3,-65],[-8,1,0],[-8,2,-4]];
export const FLIGHT_PERIOD=points.length/8;
export const flightPath = new CatmullRomCurve3(points.map(p=>new Vector3(...p)),true,'centripetal');
const lookPath = new CatmullRomCurve3(targets.map(p=>new Vector3(...p)),true,'centripetal');
export function finiteFlight(value:number) { return Number.isFinite(value) ? value : 0; }
export function wrapFlight(value:number) { const t=finiteFlight(value)%FLIGHT_PERIOD;return t<0?t+FLIGHT_PERIOD:t; }
export function flightWorld(value:number){const t=wrapFlight(value);return t>1?'Возвращение к Истоку':(['Исток','Аврора','Велир','Нерея','Солис'] as const)[Math.min(4,Math.round(t*4))];}
export function flightPose(value:number) {
  const t=wrapFlight(value)/FLIGHT_PERIOD;
  return { position:flightPath.getPoint(t), target:lookPath.getPoint(t) };
}
