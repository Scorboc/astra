import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {addEnergyVolumes,VOLUME_LAYOUT} from './energy-volume.js';
import {EnergyVolumePass} from './volume-pass.js';
const buffer=fs.readFileSync(new URL('./assets/observatory.glb',import.meta.url));
const json=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
test('valid local glTF binary, compact and self-contained',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.ok(buffer.length<2_000_000);assert.ok(json.buffers.every(b=>!b.uri));assert.ok(!json.images?.length);
});
test('separate ice, metal, glazing and illumination, not flattened illustration',()=>{
 assert.equal(json.meshes.length,9);
 for(const name of ['Ice','IcePale','Titanium','Glazing','Champagne','IceLight'])assert.ok(json.materials.some(m=>m.name===name));
 for(const mesh of json.meshes)for(const p of mesh.primitives){assert.ok(p.attributes.POSITION!==undefined);assert.ok(p.attributes.NORMAL!==undefined);assert.ok(json.accessors[p.indices].count>0);}
});
test('preserves tall silhouette and triangle budget',()=>{
 const stats=JSON.parse(fs.readFileSync(new URL('./assets/model-stats.json',import.meta.url)));
 assert.equal(stats.revision,2);assert.ok(stats.triangles<65_000);assert.ok(stats.triangles>10_000);
 const actualTriangles=json.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+json.accessors[p.indices].count/3,0);
 assert.equal(stats.triangles,actualTriangles);assert.equal(stats.bytes,buffer.length);
 const bounds=json.meshes.flatMap(m=>m.primitives).map(p=>json.accessors[p.attributes.POSITION]);
 const actualHeight=Math.max(...bounds.map(a=>a.max[1]))-Math.min(...bounds.map(a=>a.min[1]));
 assert.ok(Math.abs(stats.height-actualHeight)<.001);
});
test('spire widths and tips come from geometry, not only declared metadata',()=>{
 const ice=json.meshes.find(m=>m.name==='Ice').primitives[0];
 const accessor=json.accessors[ice.attributes.POSITION], view=json.bufferViews[accessor.bufferView];
 const binaryOffset=20+buffer.readUInt32LE(12)+8;
 const start=binaryOffset+view.byteOffset+(accessor.byteOffset||0),stride=view.byteStride||12;
 const vertices=Array.from({length:accessor.count},(_,i)=>Array.from({length:3},(_,k)=>buffer.readFloatLE(start+i*stride+k*4)));
 const leftFoot=vertices.filter(v=>v[0]<0&&v[1]<.6);
 const width=Math.max(...leftFoot.map(v=>v[0]))-Math.min(...leftFoot.map(v=>v[0]));
 assert.ok(Math.abs(width-5.605357)<.002);
 const tips=vertices.filter(v=>v[1]>21.7);
 const peakSeparation=Math.max(...tips.map(v=>v[0]))-Math.min(...tips.map(v=>v[0]));
 assert.ok(Math.abs(peakSeparation-21.730357)<.01);
});
test('prototype does not read profiles, attach remote services or overwrite primary routes',()=>{
 const js=fs.readFileSync(new URL('./main.js',import.meta.url),'utf8');
 assert.ok(!/localStorage|sessionStorage|fetch\(|https:\/\//.test(js));
 assert.ok(js.includes('e.ctrlKey||e.metaKey'));assert.ok(js.includes("addEventListener('hashchange',sync)"));assert.ok(js.includes('prefers-reduced-motion'));
});
test('five bounded volumes and three spatial cores share one pause-compatible clock',()=>{
 const scene=new T.Scene(),fogScene=new T.Scene();
 const effects=addEnergyVolumes(scene,{volumeParent:fogScene});
 assert.equal(effects.count,5);assert.equal(fogScene.children.length,5);assert.equal(effects.cores.length,3);
 assert.ok(scene.getObjectByName('under-observatory-light').isPointLight);
 assert.ok(!fs.readFileSync(new URL('./main.js',import.meta.url),'utf8').includes('const beamMat='));
 assert.equal(VOLUME_LAYOUT.filter(v=>v.kind===2).length,2);
 for(const v of VOLUME_LAYOUT){assert.ok(v.half.every(x=>Number.isFinite(x)&&x>0));assert.ok(v.center.every(Number.isFinite));}
 effects.setTime(12.5);
 for(const material of effects.materials){assert.equal(material.uniforms.time.value,12.5);assert.equal(material.depthWrite,false);assert.equal(material.defines.STEPS,24);assert.ok(material.fragmentShader.includes('surfaceDistance'));}
 const pass=new EnergyVolumePass(fogScene,new T.PerspectiveCamera(),effects.materials);
 pass.setSize(1280,720);assert.equal(pass.target.width,640);assert.equal(pass.target.height,360);
 for(const material of effects.materials)assert.deepEqual(material.uniforms.fogResolution.value.toArray(),[640,360]);
 pass.dispose();
 const low=addEnergyVolumes(new T.Scene(),{mobile:true});assert.ok(low.materials.every(m=>m.defines.STEPS===16));
});
