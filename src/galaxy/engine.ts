import type {GalaxyScene} from './playcanvas-world.js';
type Factory=typeof import('./playcanvas-world.js').createGalaxyScene;
// ASTRA uses one renderer now: PlayCanvas.
export const createGalaxyScene:Factory=(await import('./playcanvas-world.js')).createGalaxyScene;
export type {GalaxyScene};
