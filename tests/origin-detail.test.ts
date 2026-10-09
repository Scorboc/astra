import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createOriginDetail } from '../src/galaxy/origin-detail.ts';

test('origin detail: lazy loads, bounded cache, mobile limit, fading and disposal',async t=>{
  const loaded:T.Texture[]=[];let disposed=0;
  t.mock.method(T.TextureLoader.prototype,'loadAsync',async()=>{
    const texture=new T.Texture();texture.addEventListener('dispose',()=>disposed++);loaded.push(texture);return texture;
  });
  const host={clientWidth:1280,dataset:{}} as unknown as HTMLElement;
  const renderer={capabilities:{getMaxAnisotropy:()=>8}} as unknown as T.WebGLRenderer;
  const body=new T.Mesh(new T.SphereGeometry(5.5),new T.MeshStandardMaterial());
  const camera=new T.PerspectiveCamera(48,16/9,.025,1000);
  const detail=createOriginDetail(body,5.5,renderer,host,()=>{});
  const frame=async(count=12)=>{for(let i=0;i<count;i++){detail.update(camera,.15,false);await Promise.resolve();}};
  camera.position.set(0,0,20);camera.lookAt(0,0,0);await frame();
  assert.equal(loaded.length,0,'No detail network work from far away');
  camera.position.set(0,0,6.5);camera.lookAt(0,0,0);await frame();
  assert.equal(host.dataset.originLod,'detail');assert.ok(Number(host.dataset.detailResident)<=6);
  assert.ok((host.dataset.detailTiles??'').split(',').length<=4);
  for(let i=0;i<14;i++){
    camera.position.set(Math.sin(i*.48)*6.5,.3,Math.cos(i*.48)*6.5);camera.lookAt(0,0,0);await frame();
    assert.ok(Number(host.dataset.detailResident)<=6,'Desktop cache stays bounded through a full orbit');
  }
  assert.ok(disposed>0,'Old tiles are released during travel');
  Object.defineProperty(host,'clientWidth',{value:390});await frame(30);
  assert.ok(Number(host.dataset.detailResident)<=4);
  assert.ok((host.dataset.detailTiles??'').split(',').length<=2);
  camera.position.set(0,0,40);camera.lookAt(0,0,0);await frame(30);
  assert.equal(host.dataset.originLod,'base');assert.equal(host.dataset.detailTiles,'');
  detail.dispose();assert.equal(disposed,loaded.length,'All streamed textures, including grain, are disposed');
});

test('origin detail: failed tile downloads keep the base surface and do not retry every frame',async t=>{
  let calls=0;t.mock.method(T.TextureLoader.prototype,'loadAsync',async()=>{calls++;throw new Error('offline');});
  const host={clientWidth:1280,dataset:{}} as unknown as HTMLElement;
  const body=new T.Mesh(new T.SphereGeometry(5.5));const camera=new T.PerspectiveCamera(48,1,.025,1000);
  camera.position.set(0,0,6.5);camera.lookAt(0,0,0);
  const detail=createOriginDetail(body,5.5,{capabilities:{getMaxAnisotropy:()=>8}} as unknown as T.WebGLRenderer,host,()=>{});
  for(let i=0;i<25;i++){detail.update(camera,.1,false);await Promise.resolve();}
  assert.equal(host.dataset.originLod,'base');assert.ok(calls<=5);assert.ok(Number(host.dataset.detailFailures)>0);detail.dispose();
});

test('origin detail: looking away loads nothing and late invisible tiles are discarded',async t=>{
  const requests:{url:string;resolve:(texture:T.Texture)=>void}[]=[];
  t.mock.method(T.TextureLoader.prototype,'loadAsync',(url:string)=>new Promise<T.Texture>(resolve=>requests.push({url,resolve})));
  const host={clientWidth:1280,dataset:{}} as unknown as HTMLElement;
  const body=new T.Mesh(new T.SphereGeometry(5.5));
  const camera=new T.PerspectiveCamera(48,1,.025,1000);camera.position.set(0,0,6.5);
  const detail=createOriginDetail(body,5.5,{capabilities:{getMaxAnisotropy:()=>8}} as unknown as T.WebGLRenderer,host,()=>{});
  camera.lookAt(0,0,20);detail.update(camera,.1,false);
  assert.equal(requests.length,0);assert.equal(host.dataset.detailWanted,'');
  camera.lookAt(0,0,0);detail.update(camera,.1,false);
  const tiles=requests.filter(r=>!r.url.includes('crystal-grain'));
  assert.equal(tiles.length,2,'At most two visible patch requests at once');
  // Camera sees the +Z hemisphere only; neither back hemisphere column is queued.
  for(const r of tiles){const x=Number(r.url.split('/').pop()!.split('-')[0]);assert.ok(x>=0&&x<=3);}
  camera.lookAt(0,0,20);detail.update(camera,.1,false);
  let discarded=0;
  for(const r of requests){const texture=new T.Texture();if(!r.url.includes('crystal-grain'))texture.addEventListener('dispose',()=>discarded++);r.resolve(texture);}
  await Promise.resolve();detail.update(camera,.1,false);
  assert.equal(discarded,2);assert.equal(host.dataset.detailResident,'0');assert.equal(host.dataset.originLod,'base');
  const before=requests.length;detail.update(camera,.1,false);assert.equal(requests.length,before);
  detail.dispose();
});
