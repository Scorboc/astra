import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose,flightAtNode,flightStops,flightLength,flightSpeed,FLIGHT_PERIOD,FLIGHT_STOPS,WORLDS} from '../src/galaxy/playcanvas-path.js';
import {LIVE_CASTLE_EYE,LIVE_CASTLE_FLOOR} from '../src/galaxy/castle-live-model.ts';
import {advanceTravel} from '../src/galaxy/flight-controller.js';
import {readFileSync} from 'node:fs';

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
test('planet stops retain their order; only the passage through Aurora is frozen',()=>{
 const expected=[[-1,5,18],[15,17,-17],[4,9,-46],[16,5,-82],[7,7,-120]];
 assert.equal(FLIGHT_STOPS.length,5);assert.equal(FLIGHT_STOPS[0],0);
 for(const compact of [false,true])flightStops(compact).forEach((value,i)=>{
  if(i)assert.ok(value>flightStops(compact)[i-1]);
  const point=compact&&i===4?[18,15,-130]:[expected[i][0],expected[i][1],expected[i][2]+(compact?1.5:0)];
  assert.ok(flightPose(value,compact).position.distance({x:point[0],y:point[1],z:point[2]})<.001);
 });
 const first=flightPose(0);assert.equal(first.fov,48);
 assert.ok(forward(first).distance({x:-6/Math.hypot(6,31),y:0,z:-31/Math.hypot(6,31)})<1e-9);
});
test('all sampled poses through Aurora match the owner-approved 412e6ef passage',()=>{
 const fixture=JSON.parse(readFileSync(new URL('fixtures/approved-origin-aurora.json',import.meta.url),'utf8'));
 for(const profile of fixture.profiles)for(const sample of profile.samples){
  const pose=flightPose(sample.fraction*flightAtNode(2,profile.compact),profile.compact),f=forward(pose);
  assert.ok(pose.position.distance({x:sample.position[0],y:sample.position[1],z:sample.position[2]})<.0001);
  assert.ok(f.distance({x:sample.forward[0],y:sample.forward[1],z:sample.forward[2]})<.00001);
  assert.equal(pose.fov,sample.fov);
 }
});
test('each newly composed planet reveal fits the desktop and portrait frame',()=>{
 for(const compact of [false,true])for(const [index,id] of ['aurora','velir','nereya','solis'].entries()){
  const pose=flightPose(flightAtNode(2+index*2,compact),compact),f=forward(pose),world=WORLDS[id],to=pose.position.clone().mulScalar(-1).add({x:world.position[0],y:world.position[1],z:world.position[2]}),radius=Math.asin(world.radius/to.length());
  const side={x:-f.z,y:0,z:f.x},length=Math.hypot(side.x,side.z);side.x/=length;side.z/=length;
  const up={x:-side.z*f.y,y:side.z*f.x-side.x*f.z,z:side.x*f.y},depth=to.dot(f),vertical=Math.atan2(to.dot(up),depth),horizontal=Math.atan2(to.dot(side),depth),half=pose.fov*Math.PI/360,aspect=compact?390/844:1440/900;
  assert.ok(depth>0);assert.ok(Math.abs(horizontal)+radius<Math.atan(Math.tan(half)*aspect)*.98,`${id} horizontal framing`);
  assert.ok(Math.abs(vertical)+radius<half*.98,`${id} vertical framing`);
 }
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
  const start=flightAtNode(10,compact),end=flightAtNode(15,compact);
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
test('after the final planet one short bend leads to the castle, without a distant galaxy orbit',()=>{
 for(const compact of [false,true]){
  const start=flightAtNode(8,compact),turn=flightAtNode(9,compact),end=flightAtNode(15,compact);
  assert.ok((end-start)/FLIGHT_PERIOD*flightLength(compact)<(compact?85:115));
  for(let i=0;i<=2000;i++){
   const t=start+(end-start)*i/2000,pose=flightPose(t,compact);assert.ok(pose.position.z>-150);
   if(t<turn)continue;
   const f=forward(pose),castle=pose.position.clone().mulScalar(-1).add({x:-40,y:-.06,z:-68}).normalize();
   for(const id of ['origin','aurora','velir','nereya']){
    const p=WORLDS[id].position,direction=pose.position.clone().mulScalar(-1).add({x:p[0],y:p[1],z:p[2]}).normalize();
    assert.ok(f.dot(castle)>f.dot(direction),`${id} must not become the next subject again`);
   }
  }
 }
});

test('the connecting turn already brings the castle into frame instead of showing empty space',()=>{
 for(const compact of [false,true]){
  const pose=flightPose(flightAtNode(9,compact),compact),f=forward(pose),to=pose.position.clone().mulScalar(-1).add({x:-40,y:-.06,z:-68});
  const right={x:-f.z,y:0,z:f.x},length=Math.hypot(right.x,right.z);right.x/=length;right.z/=length;
  const up={x:-right.z*f.y,y:right.z*f.x-right.x*f.z,z:right.x*f.y},depth=to.dot(f),half=pose.fov*Math.PI/360,aspect=compact?390/844:1440/900;
  assert.ok(depth>0);
  assert.ok(Math.abs(Math.atan2(to.dot(right),depth))<Math.atan(Math.tan(half)*aspect)*.9);
  assert.ok(Math.abs(Math.atan2(to.dot(up),depth))<half*.9);
 }
});
