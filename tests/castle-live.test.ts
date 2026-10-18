import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {StandardMaterial,BLEND_NORMAL} from 'playcanvas';
import {applyCastleSurfaces} from '../src/galaxy/castle-live-surfaces.js';
import {LIVE_CASTLE_EYE,LIVE_CASTLE_FLOOR,LIVE_CASTLE_AIM,LIVE_CASTLE_POSITION} from '../src/galaxy/castle-live-model.ts';

test('live architecture is Claude V8 Draco geometry, not rendered frames',()=>{
 const bytes=readFileSync(new URL('../public/castle-live/observatory-gothic/control-v8/castle-baked-draco.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
 const size=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+size).toString());
 assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
 const triangles=gltf.meshes.flatMap((m:any)=>m.primitives).reduce((sum:number,p:any)=>sum+gltf.accessors[p.indices].count/3,0);
 assert.equal(triangles,601604);
 assert.equal(gltf.materials.filter((m:any)=>m.name==='Control mirror floor').length,1);
 assert.ok(LIVE_CASTLE_EYE>LIVE_CASTLE_FLOOR+1);assert.ok(LIVE_CASTLE_AIM>LIVE_CASTLE_EYE);
 assert.deepEqual(LIVE_CASTLE_POSITION,[-40,-6,-68]);
});

test('V8 surface port retains the approved crystal, glazing, stone bake and warm light values',()=>{
 const materials=['Control pearl stone','Control polished electrum','Control mineral crystal','Control clear glazing','Control celestial apse','Control light','Control warm lancets'].map(name=>{const m=new StandardMaterial();m.name=name;return m;});
 materials[2].gloss=.12;
 const model={findComponents:()=>[{meshInstances:materials.map(material=>({material}))}]};
 const root={findByName:()=>null,findComponents:()=>[]};
 applyCastleSurfaces({BLEND_NORMAL},{root},model,{}, {encoding:'sqrt-normalized',linearGain:40.891772975922166},{albedo:{},normal:{}});
 const crystal=materials[2],glass=materials[3],stone=materials[0];
 assert.equal(crystal.emissiveIntensity,1.5);assert.equal(crystal.clearCoat,.82);assert.equal(crystal.gloss,.12);
 assert.equal(glass.opacity,.16);assert.equal(glass.blendType,BLEND_NORMAL);assert.equal(glass.gloss,.98);
 assert.equal(stone.metalness,.04);assert.ok(stone.shaderChunks.glsl.get('emissivePS')?.includes('pow(vVertexColor.rgb,vec3(2.))'));
 assert.ok(stone.shaderChunks.glsl.get('emissivePS')?.includes('*40.9'));
 assert.equal(materials[5].emissiveIntensity,14);assert.equal(materials[6].emissiveIntensity,26);
 for(const m of materials)m.destroy();
});

test('integration uses one renderer, no image impostor, no standalone context and no global recoloring',()=>{
 const source=readFileSync(new URL('../src/galaxy/castle-live.js',import.meta.url),'utf8');
 for(const forbidden of ['new pc.AppBase','createGraphicsDevice(',"addEventListener('wheel'",'scene.envAtlas=','scene.exposure=','scene.ambientLight=','By(pc','castle-orbit/'])assert.ok(!source.includes(forbidden),forbidden);
 assert.ok(source.includes('m.envAtlas=atlas'));assert.ok(source.includes('castleWorldToLocal'));assert.ok(source.includes('LIVE_CASTLE_FLOOR'));
 assert.ok(source.includes("signal.addEventListener('abort'"));assert.ok(source.includes('reflection.enabled=near'));
});

test('ported effect provenance matches the checked-in standalone source',()=>{
 const source=readFileSync(new URL('../public/castle-live/assets/index-CLca2w5b.js',import.meta.url));
 const hash=createHash('sha256').update(source).digest('hex');
 for(const name of ['castle-live-surfaces.js','castle-live-effects.js'])assert.ok(readFileSync(new URL('../src/galaxy/'+name,import.meta.url),'utf8').includes(hash));
});
