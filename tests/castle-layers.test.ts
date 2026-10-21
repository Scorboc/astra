import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Layer,LayerComposition,StandardMaterial,BLEND_NORMAL,LAYERID_WORLD,LAYERID_DEPTH,LAYERID_SKYBOX,LAYERID_IMMEDIATE,LAYERID_UI} from 'playcanvas';
import {createCastleLayers,createCastleDepthOccluders} from '../src/galaxy/castle-layers.js';

function scene(){
 const composition=new LayerComposition('test');
 const [world,depth,skybox,immediate,ui]=[['World',LAYERID_WORLD],['Depth',LAYERID_DEPTH],['Skybox',LAYERID_SKYBOX],['Immediate',LAYERID_IMMEDIATE],['UI',LAYERID_UI]].map(([name,id])=>new Layer({name:name as string,id:id as number}));
 const fog=new Layer({name:'existing galaxy fog'});
 composition.pushOpaque(world);composition.pushOpaque(depth);composition.pushOpaque(skybox);composition.pushTransparent(world);composition.pushTransparent(fog);composition.pushOpaque(immediate);composition.pushTransparent(immediate);composition.pushTransparent(ui);
 return {composition,world,immediate,fog};
}

test('world depth is restored before castle presentation without changing the approved bloom path',()=>{
 const {composition,immediate}=scene(),before=composition.layerList.slice();
 const castle=createCastleLayers(composition);
 assert.equal(castle.length,4);
 const [depth,...visual]=castle;
 assert.ok(composition.getOpaqueIndex(depth)>composition.getTransparentIndex(immediate));
 assert.equal(composition.getTransparentIndex(depth),-1);
 assert.equal(depth.clearDepthBuffer,true);
 for(const layer of visual)assert.ok(composition.getOpaqueIndex(layer)>composition.getOpaqueIndex(depth));
 for(const layer of castle){
  assert.equal(layer.clearColorBuffer,false);assert.equal(layer.clearDepthBuffer,layer===depth);assert.equal(layer.clearStencilBuffer,false);
 }
 assert.deepEqual(composition.layerList.filter(l=>!castle.includes(l)),before);
 for(const layer of castle)composition.remove(layer);
 assert.deepEqual(composition.layerList,before);
});

test('a missing depth/pass boundary is not replaced by an always-front overlay',()=>{
 const composition=new LayerComposition('empty');
 assert.throws(()=>createCastleLayers(composition),/world depth/);assert.equal(composition.layerList.length,0);
});

test('the live castle actually uses the shared-depth layer helper',()=>{
 const source=readFileSync(new URL('../src/galaxy/castle-live.js',import.meta.url),'utf8');
 assert.ok(source.includes('createCastleLayers(app.scene.layers)'));assert.ok(source.includes('depthOccluders.update(visible)'));assert.ok(!source.includes('app.scene.layers.push('));
});

test('depth-only instances share rigid geometry and instancing, write no color and clean up only their own resources',()=>{
 class Copy{mesh:any;material:any;node:any;instancingData:any;instancingCount=0;visible=true;cull=true;castShadow=true;receiveShadow=true;destroyed=false;
  constructor(mesh:any,material:any,node:any){this.mesh=mesh;this.material=material;this.node=node;}
  setInstancing(buffer:any){this.instancingData=buffer?{vertexBuffer:buffer}:null;}
  destroy(){this.destroyed=true;}
 }
 const solid=new StandardMaterial(),transparent=new StandardMaterial();transparent.blendType=BLEND_NORMAL;
 const source={mesh:{id:'shared sphere'},node:{id:'same transform'},material:solid,visible:true,cull:false,instancingData:{vertexBuffer:{id:'shared buffer'}},instancingCount:700};
 const world={meshInstances:[source,{...source,material:transparent}]};const members=new Set<any>();
 const layer={enabled:true,addMeshInstances(items:any[]){items.forEach(x=>members.add(x));},removeMeshInstances(items:any[]){items.forEach(x=>members.delete(x));}};
 const depth=createCastleDepthOccluders({StandardMaterial,MeshInstance:Copy},world,layer);depth.update(true);
 assert.equal(depth.count,1);const copy=[...members][0];assert.equal(copy.mesh,source.mesh);assert.equal(copy.node,source.node);assert.equal(copy.instancingData.vertexBuffer,source.instancingData.vertexBuffer);assert.equal(copy.instancingCount,700);
 for(const field of ['redWrite','greenWrite','blueWrite','alphaWrite'])assert.equal(copy.material[field],false);
 assert.equal(copy.material.depthWrite,true);assert.equal(copy.castShadow,false);assert.equal(copy.receiveShadow,false);
 source.visible=false;depth.update(true);assert.equal(copy.visible,false);
 depth.update(false);assert.equal(layer.enabled,false);
 world.meshInstances=[];depth.update(true);assert.equal(copy.destroyed,true);assert.equal(depth.count,0);assert.equal(members.size,0);
 depth.destroy();solid.destroy();transparent.destroy();
});
