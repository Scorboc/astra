import type {PlanetId} from './journey';
export function createGalaxyScene(host:HTMLElement,labelHost:HTMLElement,callbacks:{pick:(id:PlanetId)=>void;observatory:()=>void;landed:(yes:boolean)=>void;failed:()=>void}):import('./universe').GalaxyScene;
