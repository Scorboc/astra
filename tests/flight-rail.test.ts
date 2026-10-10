import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose,FLIGHT_PERIOD,FLIGHT_STOPS} from '../src/galaxy/playcanvas-path.js';
test('restored pre-observatory camera route is closed and finite',()=>{
 const start=flightPose(0),end=flightPose(FLIGHT_PERIOD);assert.ok(start.position.distance(end.position)<1e-6);assert.ok(start.target.distance(end.target)<1e-6);
 for(let i=0;i<=2000;i++){const pose=flightPose(i/2000*FLIGHT_PERIOD);for(const value of [pose.position.x,pose.position.y,pose.position.z,pose.target.x,pose.target.y,pose.target.z])assert.ok(Number.isFinite(value));}
});
test('planet stops retain their order on the constant-speed route',()=>{
 assert.equal(FLIGHT_STOPS.length,5);assert.equal(FLIGHT_STOPS[0],0);
 for(let i=1;i<FLIGHT_STOPS.length;i++)assert.ok(FLIGHT_STOPS[i]>FLIGHT_STOPS[i-1]);
});
test('equal travel steps cover nearly equal physical distances',()=>{
 const distances=[];for(let i=0;i<400;i++){const a=flightPose(i/400*FLIGHT_PERIOD).position,b=flightPose((i+1)/400*FLIGHT_PERIOD).position;distances.push(a.distance(b));}
 const average=distances.reduce((sum,value)=>sum+value,0)/distances.length;assert.ok(Math.max(...distances.map(value=>Math.abs(value-average)))/average<.08);
});
test('observatory passage reaches the end of the podium and looks at the building',()=>{
 let best;for(let i=0;i<=3000;i++){const pose=flightPose(i/3000*FLIGHT_PERIOD),distance=pose.position.distance({x:-17.5,y:-5.35,z:-68});if(!best||distance<best.distance)best={distance,pose};}
 assert.ok(best.distance<.3);assert.ok(best.pose.target.distance({x:-40,y:2,z:-68})<1.2);
});
test('observatory remains compositionally locked throughout the podium passage',()=>{
 const locked=[];for(let i=0;i<=4000;i++){const pose=flightPose(i/4000*FLIGHT_PERIOD);if(pose.position.x>-35&&pose.position.x<-16&&pose.position.z>-96&&pose.position.z<-44)locked.push(pose.target.distance({x:-40,y:2,z:-68}));}
 assert.ok(locked.length>20);assert.ok(locked.filter(distance=>distance<.35).length/locked.length>.55);
});
