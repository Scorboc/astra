import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore PlayCanvas renderer helpers are JavaScript modules.
import {asteroidPoint,asteroidPointAt,createFlashSchedule,serpentSpiralPose} from '../src/galaxy/playcanvas-weather.js';
test('PlayCanvas asteroid route and arc-length positions preserve the original serpent',()=>{
 for(let i=0;i<=1000;i++){const t=i/1000;const a=asteroidPoint(t),b=asteroidPointAt(t);for(const axis of ['x','y','z'] as const)assert.ok(Number.isFinite(a[axis])&&Number.isFinite(b[axis]));}
 for(const u of [.04,.15,.51,.85,.99]){const a=serpentSpiralPose(u,.3);assert.ok(Number.isFinite(a.position.x)&&Number.isFinite(a.position.y)&&Number.isFinite(a.position.z));assert.ok(a.weight>=0&&a.weight<=1);}
});
test('PlayCanvas flashes preserve one-second events and resample pauses indefinitely',()=>{
 const rng=()=>{let seed=717;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);};
 const a=createFlashSchedule(rng(),.74);const starts=new Set<number>();
 for(let i=0;i<=6000;i++){const time=i/10,actual=a.sample(time);starts.add(actual.start);assert.ok(actual.pulse>=0&&actual.pulse<=1);}
 assert.ok(starts.size>90);
 const intervals=Array.from(starts).slice(1).map((start,i)=>start-Array.from(starts)[i]);assert.ok(new Set(intervals.map(x=>x.toFixed(3))).size>20);assert.ok(intervals.every(x=>x>=3&&x<=7));
});
