import * as T from 'three';
import type { PlanetId } from './journey';

export const COLOR_ATLAS={width:16384,height:8192,columns:8,rows:4,tile:2048,gutter:4} as const;
const SIZE=COLOR_ATLAS.tile+COLOR_ATLAS.gutter*2;
type Planet={id:PlanetId;body:T.Mesh;material:T.MeshStandardMaterial;radius:number};
type Tile={planet:Planet;x:number;y:number;key:string;samples:T.Vector3[]};
type Entry={tile:Tile;target:T.WebGLRenderTarget;row:number;used:number;fade:number};
const ids:PlanetId[]=['origin','aurora','velir','nereya','solis','about'];
const noise=`
vec3 h3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float n3(vec3 p){vec3 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(a).x,h3(a+vec3(1,0,0)).x,f.x),mix(h3(a+vec3(0,1,0)).x,h3(a+vec3(1,1,0)).x,f.x),f.y),mix(mix(h3(a+vec3(0,0,1)).x,h3(a+vec3(1,0,1)).x,f.x),mix(h3(a+vec3(0,1,1)).x,h3(a+vec3(1,1,1)).x,f.x),f.y),f.z);}
vec2 cells(vec3 p){vec3 cell=floor(p),f=fract(p);float a=9.,b=9.;for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 o=vec3(float(x),float(y),float(z)),v=o+h3(cell+o)-f;float d=dot(v,v);if(d<a){b=a;a=d;}else b=min(b,d);}return vec2(sqrt(a),sqrt(b)-sqrt(a));}
`;

// Actual RGB render-target tiles, not normal maps and not a resized 16K file.
// Large forms come from the existing image; mineral colour structure is evaluated
// natively at 16K UV density. Spherical coordinates make borders/poles continuous.
const bakeFragment=`varying vec2 vUv;uniform sampler2D uBase;uniform vec2 uTile;uniform float uKind;${noise}
void main(){
 vec2 local=(vUv*${SIZE.toFixed(1)}-${COLOR_ATLAS.gutter.toFixed(1)})/${COLOR_ATLAS.tile.toFixed(1)};
 vec2 uv=(uTile+local)/vec2(8.,4.);uv=vec2(fract(uv.x),clamp(uv.y,0.,1.));
 float phi=uv.x*6.28318530718,theta=(1.-uv.y)*3.14159265359;
 vec3 p=vec3(-cos(phi)*sin(theta),cos(theta),sin(phi)*sin(theta));
 vec3 base=texture2D(uBase,uv).rgb;
 vec3 q=p*(160.+uKind*17.)+uKind*23.;
 vec2 crystal=cells(q);float grain=n3(p*1600.+uKind*11.);
 float small=n3(p*650.+vec3(grain*.6));
 float crack=1.-smoothstep(.009,.044,crystal.y);
 float vein=pow(1.-abs(2.*n3(p*90.)-1.),18.);
 float gold=smoothstep(.015,.16,base.r-base.b);
 vec3 accent=mix(vec3(.035,.23,.21),vec3(.7,.34,.055),gold);
 float shade=.80+small*.26+grain*.10;
 if(uKind<.5){shade*=.84+crystal.x*.35;base=base*shade+accent*crack*.095;}
 else if(uKind<1.5){float land=smoothstep(.01,.10,base.g-base.b);base=base*(1.+land*(small-.5)*.13);}
 else if(uKind<2.5){base*=.98+small*.04;}
 else if(uKind<3.5){base*=.96+small*.08;}
 else if(uKind<4.5){base*=.99+small*.02;}
 else{base=base*(.78+small*.28+grain*.08)+vec3(.2,.15,.075)*crack*.065;}
 gl_FragColor=vec4(max(base,vec3(0.)),1.);
}`;

export function makeColorTiles(planet:Planet):Tile[]{
 return Array.from({length:32},(_,i)=>{
   const x=i%8,y=Math.floor(i/8),samples:T.Vector3[]=[];
   for(let v=0;v<=8;v++)for(let u=0;u<=8;u++){
     const phi=(x+u/8)/8*Math.PI*2,theta=(1-(y+v/8)/4)*Math.PI;
     samples.push(new T.Vector3(-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta)));
   }
   return {planet,x,y,key:`${planet.id}/${x}-${y}`,samples};
 });
}

export function visibleColorTiles(tiles:Tile[],camera:T.Camera,max:number){
 camera.updateMatrixWorld();const eyeWorld=camera.getWorldPosition(new T.Vector3());
 const projection=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const point=new T.Vector3(),worldPoint=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray(),sphere=new T.Sphere();const ranked:{tile:Tile;score:number}[]=[];
 const occluders=[...new Set(tiles.map(t=>t.planet))].map(p=>({planet:p,center:p.body.getWorldPosition(new T.Vector3())}));
 const transforms=new Map<Planet,{eye:T.Vector3;clip:T.Matrix4;distance:number}>();
 for(const tile of tiles){
   const p=tile.planet;
   if(!p.material.map)continue;
   let transform=transforms.get(p);
   if(!transform){p.body.updateWorldMatrix(true,false);const eye=p.body.worldToLocal(eyeWorld.clone());transform={eye,clip:new T.Matrix4().multiplyMatrices(projection,p.body.matrixWorld),distance:eye.length()};transforms.set(p,transform);}
   const {eye,clip,distance}=transform;
   // Near enough that the 16K colour samples can improve the image.
   if(distance>p.radius*6.5||distance<=p.radius)continue;
   let score=Infinity;
   for(const sample of tile.samples){
     if(sample.dot(eye)<=p.radius)continue;
     point.copy(sample).multiplyScalar(p.radius).applyMatrix4(clip);
     if(Math.abs(point.x)<=1&&Math.abs(point.y)<=1&&point.z>=-1&&point.z<=1){
       worldPoint.copy(sample).multiplyScalar(p.radius).applyMatrix4(p.body.matrixWorld);
       const range=worldPoint.distanceTo(eyeWorld);ray.set(eyeWorld,worldPoint.sub(eyeWorld).normalize());
       const blocked=occluders.some(o=>o.planet!==p&&ray.intersectSphere(sphere.set(o.center,o.planet.radius),hit)!==null&&hit.distanceTo(eyeWorld)<range-.001);
       if(!blocked)score=Math.min(score,point.x*point.x+point.y*point.y+distance/p.radius*.02);
     }
   }
   if(Number.isFinite(score))ranked.push({tile,score});
 }
 return ranked.sort((a,b)=>a.score-b.score).slice(0,max).map(r=>r.tile);
}

export function createPlanetColorDetail(planets:Planet[],renderer:T.WebGLRenderer,host:HTMLElement){
 const tiles=planets.flatMap(makeColorTiles),entries=new Map<string,Entry>();
 const blank=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);blank.needsUpdate=true;
 const bindings=new Map<Planet,Array<{map:{value:T.Texture};rect:{value:T.Vector4};fade:{value:number}}>>();
 const originals=new Map<Planet,T.MeshStandardMaterial['onBeforeCompile']>();
 let clock=0,disposed=false,built=0;
 const verified=new Set<string>();
 for(const p of planets){
   const slots=Array.from({length:4},()=>({map:{value:blank as T.Texture},rect:{value:new T.Vector4(-10,-10,0,0)},fade:{value:0}}));bindings.set(p,slots);
   const original=p.material.onBeforeCompile;originals.set(p,original);
   const originalKey=p.material.customProgramCacheKey.bind(p.material);
   // Capture before replacing onBeforeCompile (the default cache key reads it).
   const key=originalKey();p.material.customProgramCacheKey=()=>key+'-color16k-v1';
   p.material.onBeforeCompile=(shader,r)=>{
     original.call(p.material,shader,r);
     let declarations='',apply='';
     slots.forEach((s,i)=>{
       shader.uniforms[`uColorTile${i}`]=s.map;shader.uniforms[`uColorRect${i}`]=s.rect;shader.uniforms[`uColorFade${i}`]=s.fade;
       declarations+=`uniform sampler2D uColorTile${i};uniform vec4 uColorRect${i};uniform float uColorFade${i};\n`;
       apply+=`{vec2 t=vMapUv*vec2(8.,4.)-uColorRect${i}.xy;if(uColorFade${i}>0.&&min(t.x,t.y)>=0.&&max(t.x,t.y)<=1.){vec2 edge=min(t,1.-t);float a=uColorFade${i}*smoothstep(0.,.015,min(edge.x,edge.y));vec3 c=texture2D(uColorTile${i},(t*2048.+4.)/2056.).rgb;vec3 base=texture2D(map,vMapUv).rgb;diffuseColor.rgb*=mix(vec3(1.),clamp(c/max(base,vec3(.008)),vec3(.6),vec3(1.6)),a);}}\n`;
     });
     shader.fragmentShader=declarations+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n#ifdef USE_MAP\n${apply}#endif`);
   };
   p.material.needsUpdate=true;
 }
 const bakeScene=new T.Scene(),bakeCamera=new T.OrthographicCamera(-1,1,1,-1,0,2);bakeCamera.position.z=1;
 const bakeMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{uBase:{value:blank as T.Texture},uTile:{value:new T.Vector2()},uKind:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:bakeFragment});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),bakeMaterial);bakeScene.add(quad);
 const viewport=new T.Vector4(),scissor=new T.Vector4();
 function drop(key:string){const entry=entries.get(key);if(entry){entry.target.dispose();entries.delete(key);}}
 function step(entry:Entry){
   const previous=renderer.getRenderTarget(),auto=renderer.autoClear,test=renderer.getScissorTest();renderer.getViewport(viewport);renderer.getScissor(scissor);
   try{
     bakeMaterial.uniforms.uBase.value=entry.tile.planet.material.map!;bakeMaterial.uniforms.uTile.value.set(entry.tile.x,entry.tile.y);bakeMaterial.uniforms.uKind.value=ids.indexOf(entry.tile.planet.id);
     const rows=Math.min(128,SIZE-entry.row);entry.target.scissor.set(0,entry.row,SIZE,rows);entry.target.scissorTest=true;
     entry.target.texture.generateMipmaps=entry.row+rows===SIZE;
     renderer.autoClear=false;renderer.setRenderTarget(entry.target);renderer.render(bakeScene,bakeCamera);entry.row+=rows;
     if(entry.row===SIZE){built++;
       if(!verified.has(entry.tile.planet.id)){
         const pixels=new Uint8Array(8*8*4);renderer.readRenderTargetPixels(entry.target,1024,1024,8,8,pixels);
         const channels=pixels.filter((_,i)=>i%4!==3);
         host.dataset[`colorProof${entry.tile.planet.id}`]=`${entry.target.width}x${entry.target.height};rgb=${Math.min(...channels)}-${Math.max(...channels)}`;
         verified.add(entry.tile.planet.id);
       }
     }
   }finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.autoClear=auto;}
 }
 return {
   update(camera:T.Camera,dt:number,surface:boolean){
     if(disposed)return false;clock++;
     const mobile=host.clientWidth<700,limit=mobile?2:4,cacheLimit=mobile?4:6;
     const supported=renderer.capabilities.maxTextureSize>=SIZE;
     const chosen=!surface&&supported?visibleColorTiles(tiles,camera,limit):[],wanted=new Set(chosen.map(t=>t.key));
     for(const [key,e] of entries)if(e.row<SIZE&&!wanted.has(key))drop(key);
     for(const t of chosen){const entry=entries.get(t.key);if(entry)entry.used=clock;}
     const missing=chosen.find(t=>!entries.has(t.key));
     if(missing){
       if(entries.size>=cacheLimit){const victim=[...entries.values()].filter(e=>!wanted.has(e.tile.key)).sort((a,b)=>a.used-b.used)[0];if(victim)drop(victim.tile.key);}
       if(entries.size<cacheLimit){const target=new T.WebGLRenderTarget(SIZE,SIZE,{depthBuffer:false,stencilBuffer:false,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:false,anisotropy:Math.min(8,renderer.capabilities.getMaxAnisotropy())});target.texture.colorSpace=T.LinearSRGBColorSpace;entries.set(missing.key,{tile:missing,target,row:0,used:clock,fade:0});}
     }
     // One small stripe per frame; never bake six full 16K images at startup.
     const pending=[...entries.values()].find(e=>wanted.has(e.tile.key)&&e.row<SIZE);if(pending)step(pending);
     while(entries.size>cacheLimit){const victim=[...entries.values()].filter(e=>!wanted.has(e.tile.key)).sort((a,b)=>a.used-b.used)[0];if(!victim)break;drop(victim.tile.key);}
     let animating=!!pending;
     for(const slots of bindings.values())for(const s of slots){s.fade.value=0;s.map.value=blank;}
     for(const p of planets){let slot=0;for(const t of chosen.filter(t=>t.planet===p)){
       const entry=entries.get(t.key);if(!entry||entry.row<SIZE)continue;
       entry.fade=T.MathUtils.damp(entry.fade,1,6,dt);if(entry.fade>.998)entry.fade=1;else animating=true;
       const binding=bindings.get(p)![slot++];binding.map.value=entry.target.texture;binding.rect.value.set(t.x,t.y,8,4);binding.fade.value=entry.fade;
     }}
     host.dataset.colorAtlas='16384x8192';host.dataset.colorTileSize='2048';host.dataset.colorTileStorage=String(SIZE);
     host.dataset.colorDetailKind='reference-plus-procedural-rgb';host.dataset.colorDetailStatus=supported?'supported':'gpu-limit';
     host.dataset.colorWanted=[...wanted].join(',');host.dataset.colorVisible=chosen.filter(t=>entries.get(t.key)?.row===SIZE).map(t=>t.key).join(',');
     host.dataset.colorResident=String(entries.size);host.dataset.colorTilesBuilt=String(built);host.dataset.colorBakeProgress=pending?`${pending.tile.key}:${Math.round(pending.row/SIZE*100)}%`:'';
     return animating;
   },
   dispose(){disposed=true;entries.forEach(e=>e.target.dispose());entries.clear();blank.dispose();quad.geometry.dispose();bakeMaterial.dispose();for(const p of planets)p.material.onBeforeCompile=originals.get(p)!;}
 };
}
