import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {castleBearing,framePair,projectedCastle} from '../src/galaxy/castle-flight-model.ts';

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
