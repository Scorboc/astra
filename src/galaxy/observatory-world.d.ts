import type {Scene,WebGLRenderer,PerspectiveCamera,Group,Vector3} from 'three';
import type {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
export interface ObservatoryWorld {root:Group;pickRoot:Group;update(time:number,cameraPosition:Vector3,mode:string):void;dispose():void;}
export function createObservatoryWorld(scene:Scene,renderer:WebGLRenderer,composer:EffectComposer,camera:PerspectiveCamera,options:{mobile:boolean;position:Vector3;rotation:number;onState:(value:string)=>void;onDirty:()=>void}):Promise<ObservatoryWorld>;
