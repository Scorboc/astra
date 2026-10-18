import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {castleBearing,framePair,projectedCastle,castleFrameCorners,castleHomography,transformCastlePoint,CASTLE_SOURCE_WIDTH,CASTLE_SOURCE_HEIGHT} from '../src/galaxy/castle-flight-model.ts';

test('bearing maps Blender rotation to the fixed world castle, bounded to real images',()=>{
 assert.equal(castleBearing({x:-10,y:-6,z:-68}).frame,10);
 assert.ok(castleBearing({x:-10,y:-6,z:-88}).frame>10);
 assert.ok(castleBearing({x:-10,y:-6,z:-48}).frame<10);
 assert.equal(castleBearing({x:-60,y:0,z:-68}).supported,false);
});
test('mixing uses only genuinely loaded frames and never makes up a missing view',()=>{
 assert.equal(framePair(10,new Set()),undefined);
 assert.deepEqual(framePair(10.25,new Set([10,11])),{lower:10,upper:11,mix:.25});
 assert.deepEqual(framePair(18,new Set([10])),{lower:10,upper:10,mix:0});
 assert.deepEqual(framePair(NaN,new Set([10])),{lower:10,upper:10,mix:0});
});
test('world projection scales with distance, never projects a castle behind the eye',()=>{
 assert.equal(projectedCastle(-10,48,900),undefined);
 const near=projectedCastle(30,48,900)!,far=projectedCastle(60,48,900)!;
 assert.equal(near.width,far.width*2);
 assert.ok(Math.abs(near.width/near.height-1550/1014)<.000001);
});
test('the galaxy has no automatic fullscreen inspection or camera hold',()=>{
 const source=readFileSync(new URL('../src/galaxy/playcanvas-world.js',import.meta.url),'utf8');
 assert.ok(source.includes('mountCastleFlight'));
 for(const removed of ['castleHold','openCastleOrbit','createApproachGate','mountCastleOrbit'])assert.ok(!source.includes(removed),removed);
 const compositor=readFileSync(new URL('../src/galaxy/castle-flight.js',import.meta.url),'utf8');
 assert.ok(compositor.includes("pointerEvents:'none'"));
 assert.ok(!compositor.includes("addEventListener('wheel'"));
 assert.ok(compositor.includes('castle-orbit/transparent/'));
});
test('capture geometry is fixed in world space, not rotated by the viewing camera',()=>{
 const front=castleFrameCorners(0),edge=castleFrameCorners(40);
 assert.deepEqual(front,castleFrameCorners(0));
 assert.deepEqual(edge,castleFrameCorners(90));
 assert.equal(front[0].x,front[1].x);
 assert.ok(front[0].z>front[1].z);
 assert.ok(Math.abs(edge[0].x-edge[1].x)>10);
 const source=readFileSync(new URL('../src/galaxy/castle-flight.js',import.meta.url),'utf8');
 assert.ok(source.includes('canvas.style.transform=projection.css'));
 assert.ok(!source.includes('drawImage(images.get(lower),x,y'));
});
test('projective CSS and inverse masks agree on all four corners',()=>{
 const quad=[{x:80,y:90},{x:500,y:70},{x:510,y:390},{x:60,y:420}];
 const transform=castleHomography(quad)!;
 const uv=[[0,0],[1,0],[1,1],[0,1]];
 const css=transform.css.slice(9,-1).split(',').map(Number);
 uv.forEach(([u,v],i)=>{
  const point=transformCastlePoint(transform.coefficients,u,v)!;
  assert.ok(Math.hypot(point.x-quad[i].x,point.y-quad[i].y)<.000001);
  const local=transformCastlePoint(transform.inverse,point.x,point.y)!;
  assert.ok(Math.hypot(local.x-u,local.y-v)<.000001);
  const px=u*CASTLE_SOURCE_WIDTH,py=v*CASTLE_SOURCE_HEIGHT,w=css[3]*px+css[7]*py+css[15];
  assert.ok(Math.abs((css[0]*px+css[4]*py+css[12])/w-point.x)<.000001);
  assert.ok(Math.abs((css[1]*px+css[5]*py+css[13])/w-point.y)<.000001);
 });
 assert.equal(castleHomography([{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}]),undefined);
});
