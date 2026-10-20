import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceTravel,queueTravel,gestureAxis,settleTravel,WHEEL_SENSITIVITY,WHEEL_GLIDE_SECONDS} from '../src/galaxy/flight-controller.js';
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
test('many wheel events cannot queue seconds of unrequested continued flight',()=>{
 for(const speed of [.06,.12])for(const direction of [-1,1]){
  let travel=1,velocity=0,destination=1;
  for(let i=0;i<300;i++)destination=queueTravel(travel,destination+direction*.05,speed);
  assert.ok(Math.abs(destination-travel)<=speed*.55+1e-9);
  for(let i=0;i<80;i++)({travel,velocity}=advanceTravel(travel,destination,velocity,1/60,speed));
  assert.ok(Math.abs(travel-destination)<.00003);assert.equal(velocity,0);
 }
});
test('a reverse gesture cancels the outstanding forward glide immediately',()=>{
 assert.equal(queueTravel(1,1.04,.12,1.05,.12),.99);
 assert.equal(queueTravel(1,.96,.12,.95,-.12),1.01);
});
test('wheel gain increases by 50 percent with bounded glide and unchanged touch easing',()=>{
 const speed=.065;
 assert.ok(Math.abs(WHEEL_SENSITIVITY-.0004*1.5)<1e-12);
 assert.equal(WHEEL_GLIDE_SECONDS,.9);
 for(const delta of [20,50,120,180]){
  const before=queueTravel(0,delta*.0004,speed,0,0,.66);
  const after=queueTravel(0,delta*WHEEL_SENSITIVITY,speed,0,0,WHEEL_GLIDE_SECONDS);
  assert.ok(after>before*1.35&&after<=before*1.501);
  let travel=0,velocity=0;
  for(let i=0;i<100;i++)({travel,velocity}=advanceTravel(travel,after,velocity,1/60,speed));
  assert.equal(velocity,0);assert.ok(Math.abs(travel-after)<.00003);
 }
 assert.equal(queueTravel(0,1,speed),speed*.55);
});
