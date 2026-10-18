import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose,flightAtNode,flightStops,FLIGHT_PERIOD,FLIGHT_STOPS,WORLDS} from '../src/galaxy/playcanvas-path.js';
import {CASTLE_CENTER,CASTLE_ELEVATION,CASTLE_PHONE_RADIUS,CASTLE_CLOSE_RADIUS,castleBearing,projectedCastle} from '../src/galaxy/castle-flight-model.ts';
test('restored pre-observatory camera route is closed and finite',()=>{
 const start=flightPose(0),end=flightPose(FLIGHT_PERIOD);assert.ok(start.position.distance(end.position)<1e-6);assert.ok(start.target.distance(end.target)<1e-6);
 for(let i=0;i<=2000;i++){const pose=flightPose(i/2000*FLIGHT_PERIOD);for(const value of [pose.position.x,pose.position.y,pose.position.z,pose.target.x,pose.target.y,pose.target.z])assert.ok(Number.isFinite(value));}
});
test('planet stops retain their order on the constant-speed route',()=>{
 assert.equal(FLIGHT_STOPS.length,5);assert.equal(FLIGHT_STOPS[0],0);
 for(let i=1;i<FLIGHT_STOPS.length;i++)assert.ok(FLIGHT_STOPS[i]>FLIGHT_STOPS[i-1]);
});
test('equal travel steps cover nearly equal physical distances',()=>{
 for(const compact of [false,true]){const distances=[];for(let i=0;i<400;i++){const a=flightPose(i/400*FLIGHT_PERIOD,compact).position,b=flightPose((i+1)/400*FLIGHT_PERIOD,compact).position;distances.push(a.distance(b));}
 const average=distances.reduce((sum,value)=>sum+value,0)/distances.length;assert.ok(Math.max(...distances.map(value=>Math.abs(value-average)))/average<.08);
 }
});
test('low castle passage matches the actual Cycles elevation and frame cone',()=>{
 for(const compact of [false,true])for(let node=12;node<=16;node+=.01){
  const pose=flightPose(flightAtNode(node,compact),compact),bearing=castleBearing(pose.position);
  assert.ok(bearing.supported,`outside the 80 degree arc at ${node}`);
  assert.ok(Math.abs((pose.position.y-CASTLE_CENTER[1])/bearing.radius-CASTLE_ELEVATION)<.00001);
  assert.ok(bearing.radius>=(compact?CASTLE_PHONE_RADIUS:CASTLE_CLOSE_RADIUS)-.001);
 }
});
test('the close dolly holds a world heading, not the castle crosshair',()=>{
 for(const compact of [false,true])for(let node=12.5;node<=15.5;node+=.05){
  const pose=flightPose(flightAtNode(node,compact),compact);
  const forward=pose.target.clone().sub(pose.position).normalize(),angle=compact?24*Math.PI/180:0;
  const expected={x:-Math.cos(angle),y:-CASTLE_ELEVATION,z:-Math.sin(angle)},length=Math.hypot(expected.x,expected.y,expected.z);
  assert.ok(forward.distance({x:expected.x/length,y:expected.y/length,z:expected.z/length})<.00001);
 }
 const pass=flightAtNode(14),a=flightPose(pass),b=flightPose(pass+.001);
 assert.ok(a.position.distance(b.position)>.1);
});
test('the initial view and five planet stops keep their approved positions',()=>{
 const expected=[[-1,5,18],[15,17,-17],[2,3,-51],[17,6,-89],[6,8,-126]];
 for(const compact of [false,true])flightStops(compact).forEach((value,i)=>{
  const p=flightPose(value,compact).position;
  assert.ok(p.distance({x:expected[i][0],y:expected[i][1],z:expected[i][2]+(compact?1.5:0)})<.001);
 });
});
test('portrait and landscape central castle frames fit without cropping the spires',()=>{
 for(const [w,h,fov,compact] of [[1440,900,48,false],[390,844,58,true],[844,390,58,true]]){
  const pose=flightPose(flightAtNode(14,compact),compact),distance=Math.hypot(pose.position.x-CASTLE_CENTER[0],pose.position.y-CASTLE_CENTER[1],pose.position.z-CASTLE_CENTER[2]);
  const size=projectedCastle(distance,fov,h)!;
  assert.ok(size.width<w*.97&&size.height<h*.97,`${w}x${h}: ${JSON.stringify(size)}`);
 }
});
test('neither complete rail intersects the five rendered planets',()=>{
 for(const compact of [false,true])for(let i=0;i<5000;i++){
  const at=flightPose(i/5000*FLIGHT_PERIOD,compact).position;
  for(const [id,world] of Object.entries(WORLDS))if(id!=='about'){
   assert.ok(Math.hypot(at.x-world.position[0],at.y-world.position[1],at.z-world.position[2])-world.radius>1,id);
  }
 }
});
test('camera direction is deterministic after many passes in both directions',()=>{
 for(const compact of [false,true]){
  const at=flightAtNode(16.8,compact),before=flightPose(at,compact);
  for(let i=0;i<1500;i++)flightPose((i%2?i:-i)/1500*FLIGHT_PERIOD,compact);
  const after=flightPose(at,compact);
  assert.ok(before.position.distance(after.position)<1e-9);
  assert.ok(before.target.distance(after.target)<1e-9);
 }
});
test('castle entry and exit rotation are eased by travelled distance, without compressed-node spikes',()=>{
 for(const compact of [false,true]){
  const start=flightAtNode(11,compact),end=flightAtNode(17,compact),step=(end-start)/3000;
  let previous;
  for(let i=0;i<=3000;i++){
   const pose=flightPose(start+i*step,compact),forward=pose.target.clone().sub(pose.position).normalize();
   if(previous){const angularRate=Math.acos(Math.max(-1,Math.min(1,previous.dot(forward))))/step*.32;assert.ok(angularRate<2.2);}
   previous=forward;
  }
 }
});
