import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {COLOR_ATLAS,makeColorTiles,visibleColorTiles,createPlanetColorDetail} from '../src/galaxy/planet-color-detail.ts';
import type {PlanetId} from '../src/galaxy/journey.ts';

const ids:PlanetId[]=['origin','aurora','velir','nereya','solis','about'];
function planet(id:PlanetId,z=0){const material=new T.MeshStandardMaterial({map:new T.Texture()});const body=new T.Mesh(new T.SphereGeometry(5.5),material);body.position.z=z;return {id,body,material,radius:5.5};}

test('16K RGB layout covers every planet; behind camera and occluded patches are excluded',()=>{
 assert.equal(COLOR_ATLAS.columns*COLOR_ATLAS.tile,16384);assert.equal(COLOR_ATLAS.rows*COLOR_ATLAS.tile,8192);
 const camera=new T.PerspectiveCamera(48,1,.025,1000);camera.position.set(0,0,7);camera.lookAt(0,0,0);
 for(const id of ids){const p=planet(id),tiles=makeColorTiles(p);assert.equal(tiles.length,32);assert.equal(new Set(tiles.map(t=>t.key)).size,32);
   const chosen=visibleColorTiles(tiles,camera,4);assert.ok(chosen.length>0&&chosen.length<=4);assert.ok(chosen.every(t=>t.x<=3));
   camera.lookAt(0,0,20);assert.equal(visibleColorTiles(tiles,camera,4).length,0);camera.lookAt(0,0,0);
 }
 const rear=planet('origin',0),front=planet('aurora',12);camera.position.z=20;camera.lookAt(0,0,0);
 const selected=visibleColorTiles([...makeColorTiles(rear),...makeColorTiles(front)],camera,4);
 assert.ok(selected.length>0&&selected.every(t=>t.planet===front));
});

test('RGB tile baker is incremental, globally bounded, cancels invisible work, restores renderer and disposes',()=>{
 let target:T.WebGLRenderTarget|null=null,rendered=0;const actualTargets=new Set<T.WebGLRenderTarget>();let disposed=0;
 const renderer={capabilities:{maxTextureSize:4096,getMaxAnisotropy:()=>8},autoClear:true,
   getRenderTarget:()=>target,setRenderTarget:(t:T.WebGLRenderTarget|null)=>{target=t;},
   getViewport:(v:T.Vector4)=>v.set(0,0,714,612),getScissor:(v:T.Vector4)=>v.set(0,0,714,612),getScissorTest:()=>false,
   setViewport:()=>{},setScissor:()=>{},setScissorTest:()=>{},
   readRenderTargetPixels:(_t:unknown,_x:number,_y:number,_w:number,_h:number,data:Uint8Array)=>data.fill(120),
   render:()=>{rendered++;assert.ok(target);assert.equal(target.width,2056);assert.ok(target.scissor.w<=128);if(!actualTargets.has(target)){actualTargets.add(target);target.addEventListener('dispose',()=>disposed++);}},
 } as unknown as T.WebGLRenderer;
 const planets=ids.map((id,i)=>planet(id,-i*40));const host={clientWidth:1280,dataset:{}} as unknown as HTMLElement;
 const camera=new T.PerspectiveCamera(48,1,.025,1000),detail=createPlanetColorDetail(planets,renderer,host);
 for(let p=0;p<ids.length;p++){
   camera.position.set(0,0,-p*40+7);camera.lookAt(0,0,-p*40);
   for(let f=0;f<105;f++){const before=rendered;detail.update(camera,.15,false);assert.ok(rendered-before<=1);assert.ok(Number(host.dataset.colorResident)<=6);assert.equal(target,null);assert.equal(renderer.autoClear,true);}
   assert.ok(host.dataset.colorVisible.includes(ids[p]));assert.equal(host.dataset.colorAtlas,'16384x8192');
 }
 Object.defineProperty(host,'clientWidth',{value:390});detail.update(camera,.15,false);assert.ok(Number(host.dataset.colorResident)<=4);assert.ok(host.dataset.colorWanted.split(',').length<=2);
 const before=rendered;detail.update(camera,.15,true);assert.equal(rendered,before);assert.equal(host.dataset.colorVisible,'');
 detail.dispose();assert.equal(disposed,actualTargets.size);
});
