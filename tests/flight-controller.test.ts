import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceTravel,gestureAxis,settleTravel} from '../src/galaxy/flight-controller.js';
test('travel accelerates and stops without overshoot',()=>{
 let travel=0,velocity=0;
 for(let i=0;i<500;i++){const state=advanceTravel(travel,.1,velocity,1/60);assert.ok(state.travel<=.10001);assert.ok(Math.abs(state.velocity)<=.32001);travel=state.travel;velocity=state.velocity;}
 assert.ok(Math.abs(travel-.1)<.00003);assert.equal(velocity,0);
});
test('gesture intent is determined by total displacement',()=>{
 assert.equal(gestureAxis(40,5),'look');assert.equal(gestureAxis(5,40),'travel');assert.equal(gestureAxis(30,29),'travel');
});
test('short swipe responds within 100ms instead of slowly draining the queue',()=>{
 let travel=0,velocity=0;
 for(let i=0;i<6;i++)({travel,velocity}=advanceTravel(travel,.06,velocity,1/60));
 assert.ok(travel>.006);assert.ok(velocity>.10);
});
test('stop and reversal do not keep travelling past new destination',()=>{
 assert.deepEqual(advanceTravel(.1,.1,.12,1/60),{travel:.1,velocity:0});
 assert.ok(advanceTravel(.1,.05,.12,1/60).travel<=.1);
 assert.ok(advanceTravel(.1,.15,-.12,1/60).travel>=.1);
});
test('release while restoring heading retains a short step in either direction',()=>{
 for(const direction of [-1,1]){
  const destination=settleTravel(1,1+direction*.01,0);
  assert.equal(destination,1+direction*.01);
  let travel=1,velocity=0;
  for(let i=0;i<300;i++)({travel,velocity}=advanceTravel(travel,destination,velocity,1/60));
  assert.ok(Math.abs(travel-destination)<.00002);
 }
 assert.equal(settleTravel(1,1,0),1);
 assert.ok(Math.abs(settleTravel(1,1.2,0)-1.025)<1e-12);
});
