import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose as reference,WORLDS as referenceWorlds,FLIGHT_PERIOD} from '../src/galaxy/universe-path.ts';
// @ts-ignore JavaScript module owns the PlayCanvas vector implementation.
import {flightPose,WORLDS,wrapFlight} from '../src/galaxy/playcanvas-path.js';
test('PlayCanvas migration preserves coordinates and closed centripetal route',()=>{
 assert.deepEqual(WORLDS,referenceWorlds);
 for(let i=-500;i<=2500;i++){
  const t=i/1000*FLIGHT_PERIOD,expected=reference(t),actual=flightPose(t);
  for(const key of ['position','target'] as const)for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(expected[key][axis]-actual[key][axis])<1e-8,`${key}.${axis} at ${t}`);
 }
 assert.equal(wrapFlight(Infinity),0);assert.equal(wrapFlight(FLIGHT_PERIOD),0);
});
