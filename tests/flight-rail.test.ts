import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose,flightAtNode,flightStops,flightLength,flightSpeed,FLIGHT_PERIOD,FLIGHT_STOPS,WORLDS} from '../src/galaxy/playcanvas-path.js';
import {LIVE_CASTLE_EYE,LIVE_CASTLE_FLOOR} from '../src/galaxy/castle-live-model.ts';
import {advanceTravel} from '../src/galaxy/flight-controller.js';

const forward=(pose)=>pose.target.clone().sub(pose.position).normalize();
test('cinematic route closes its position, gaze and lens without a seam',()=>{
 for(const compact of [false,true]){
  const start=flightPose(0,compact),end=flightPose(FLIGHT_PERIOD,compact),eps=.00001;
  assert.ok(start.position.distance(end.position)<1e-9);assert.ok(start.target.distance(end.target)<1e-9);assert.equal(start.fov,end.fov);
  const before=flightPose(-eps,compact),after=flightPose(eps,compact);
  const incoming=start.position.clone().sub(before.position).normalize(),outgoing=after.position.clone().sub(start.position).normalize();
  assert.ok(incoming.dot(outgoing)>.9999);assert.ok(forward(before).dot(forward(after))>.99999);
  for(let i=0;i<=2000;i++){
   const pose=flightPose(i/2000*FLIGHT_PERIOD,compact);
   for(const value of [pose.position.x,pose.position.y,pose.position.z,pose.target.x,pose.target.y,pose.target.z,pose.fov])assert.ok(Number.isFinite(value));
  }
 }
});
test('planet stops retain their order and approved positions, including the first view',()=>{
 const expected=[[-1,5,18],[15,17,-17],[2,3,-51],[17,6,-89],[6,8,-126]];
 assert.equal(FLIGHT_STOPS.length,5);assert.equal(FLIGHT_STOPS[0],0);
 for(const compact of [false,true])flightStops(compact).forEach((value,i)=>{
  if(i)assert.ok(value>flightStops(compact)[i-1]);
  assert.ok(flightPose(value,compact).position.distance({x:expected[i][0],y:expected[i][1],z:expected[i][2]+(compact?1.5:0)})<.001);
 });
 const first=flightPose(0);assert.equal(first.fov,48);
 assert.ok(forward(first).distance({x:-6/Math.hypot(6,31),y:0,z:-31/Math.hypot(6,31)})<1e-9);
});
test('arc-length sampling and capped travel use the same physical speed on both rails',()=>{
 for(const compact of [false,true]){
  const distances=[];
  for(let i=0;i<400;i++){let length=0;for(let j=0;j<4;j++){const a=flightPose((i+j/4)/400*FLIGHT_PERIOD,compact).position,b=flightPose((i+(j+1)/4)/400*FLIGHT_PERIOD,compact).position;length+=a.distance(b);}distances.push(length);}
  const average=distances.reduce((sum,value)=>sum+value,0)/distances.length;
  assert.ok(Math.max(...distances.map(value=>Math.abs(value-average)))/average<.03);
  assert.ok(Math.abs(flightSpeed(compact)*flightLength(compact)/FLIGHT_PERIOD-14)<1e-9);
 }
});
test('normal input stays on the mathematical rail instead of cutting corners with XYZ lerp',()=>{
 for(const compact of [false,true]){
  let travel=flightAtNode(13,compact),velocity=0;
  for(let i=0;i<800;i++){
   const next=advanceTravel(travel,flightAtNode(17,compact),velocity,1/60,flightSpeed(compact));
   assert.ok(next.travel>=travel);assert.ok(Math.abs(next.velocity)<=flightSpeed(compact)+1e-9);
   const at=flightPose(next.travel,compact).position;
   assert.ok(Math.hypot(at.x+40,at.z+68)>20,'never enters the castle core');
   travel=next.travel;velocity=next.velocity;
  }
 }
});
test('the bridge reveal is above the actual floor and uses a wider lens only locally',()=>{
 const hero=flightPose(flightAtNode(15));
 assert.ok(Math.abs(hero.position.y-LIVE_CASTLE_EYE)<.001);
 assert.ok(hero.position.x>-19&&hero.position.x<-12);assert.ok(Math.abs(hero.position.z+68)<12);
 assert.ok(hero.position.y>LIVE_CASTLE_FLOOR+1);assert.equal(hero.fov,58);
 for(const compact of [false,true]){
  assert.equal(flightPose(0,compact).fov,compact?58:48);
  assert.equal(flightPose(flightAtNode(8,compact),compact).fov,compact?58:48);
 }
 // Real V8 spire positions, not the retired 1550x1014 image-frame bounds.
 for(const [w,h,compact] of [[1440,900,false],[390,844,true],[844,390,true]]){
  const pose=flightPose(flightAtNode(15,compact),compact),f=forward(pose),right={x:-f.z,y:0,z:f.x},rl=Math.hypot(right.x,right.z);
  right.x/=rl;right.z/=rl;const up={x:-right.z*f.y,y:right.z*f.x-right.x*f.z,z:right.x*f.y};
  const tan=Math.tan(pose.fov*Math.PI/360);
  for(const p of [[-40,13,-68],[-40,12.4,-79],[-40,12.4,-57],[-40,LIVE_CASTLE_FLOOR,-68]]){
   const v={x:p[0]-pose.position.x,y:p[1]-pose.position.y,z:p[2]-pose.position.z},dot=q=>v.x*q.x+v.y*q.y+v.z*q.z,depth=dot(f);
   assert.ok(depth>0);assert.ok(Math.abs(dot(right)/depth/tan/(w/h))<.98,`${w}x${h} spire width`);
   assert.ok(Math.abs(dot(up)/depth/tan)<.98,`${w}x${h} spire height`);
  }
 }
});
test('complete desktop/phone routes have real clearance from all five planets',()=>{
 for(const compact of [false,true])for(let i=0;i<6000;i++){
  const at=flightPose(i/6000*FLIGHT_PERIOD,compact).position;
  for(const [id,world] of Object.entries(WORLDS))if(id!=='about')
   assert.ok(Math.hypot(at.x-world.position[0],at.y-world.position[1],at.z-world.position[2])-world.radius>(compact?3.3:2.3),id);
 }
});
test('gaze faces the direction of travel along the planets, not sideways or backwards',()=>{
 for(const compact of [false,true]){
  const end=flightAtNode(8,compact);
  for(let i=0;i<2500;i++){
   const t=end*i/2500,a=flightPose(t,compact),b=flightPose(t+.00001,compact);
   assert.ok(forward(a).dot(b.position.clone().sub(a.position).normalize())>.44);
  }
 }
});
test('all gaze turns are continuous and bounded at normal cruising speed',()=>{
 for(const compact of [false,true]){
  let previous;
  for(let i=0;i<=6000;i++){
   const pose=flightPose(i/6000*FLIGHT_PERIOD,compact),f=forward(pose);
   if(previous){const rate=Math.acos(Math.max(-1,Math.min(1,previous.dot(f))))/(FLIGHT_PERIOD/6000)*flightSpeed(compact);assert.ok(rate<1.1,`angular rate ${rate}`);}
   previous=f;
  }
 }
});
test('the route is deterministic through repeated forward and backward passes',()=>{
 for(const compact of [false,true]){
  const at=flightAtNode(16.8,compact),before=flightPose(at,compact);
  for(let i=0;i<1500;i++)flightPose((i%2?i:-i)/1500*FLIGHT_PERIOD,compact);
  const after=flightPose(at,compact);assert.ok(before.position.distance(after.position)<1e-9);assert.ok(before.target.distance(after.target)<1e-9);
 }
});
test('after Solis the approach keeps the castle as the next subject, without a second planet tour',()=>{
 const center={x:-40,y:-.06,z:-68};
 for(const compact of [false,true]){
  const start=flightAtNode(11,compact),end=flightAtNode(15,compact);
  for(let i=0;i<=2000;i++){
   const pose=flightPose(start+(end-start)*i/2000,compact),to=pose.position.clone().mulScalar(-1).add(center),distance=to.length(),direction=to.normalize();
   assert.ok(direction.dot(forward(pose))>Math.cos(5*Math.PI/180),'the next subject stays in view');
   for(const [id,world] of Object.entries(WORLDS))if(id!=='about'){
    const offset=pose.position.clone().mulScalar(-1).add({x:world.position[0],y:world.position[1],z:world.position[2]}),along=offset.dot(direction);
    if(along>0&&along<distance)assert.ok(offset.sub(direction.clone().mulScalar(along)).length()>world.radius,`${id} must not replace the castle in the approach`);
   }
  }
 }
});
