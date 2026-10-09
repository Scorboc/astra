import type {GalaxyScene} from './universe';
type Factory=typeof import('./universe').createGalaxyScene;
// Explicit rollback keeps the former renderer and all account data intact.
const useThree=new URLSearchParams(location.search).get('engine')==='three';
export const createGalaxyScene:Factory=useThree?(await import('./universe')).createGalaxyScene:(await import('./playcanvas-world.js')).createGalaxyScene;
export type {GalaxyScene};
