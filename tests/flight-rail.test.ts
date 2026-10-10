import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose,flightAtNode,FLIGHT_PERIOD,WORLDS} from '../src/galaxy/playcanvas-path.js';
test('rail closes and approaches observatory above bridge tip',()=>{
 for(const mobile of [false,true]){
 const start=flightPose(0,mobile),end=flightPose(FLIGHT_PERIOD,mobile);assert.ok(start.position.distance(end.position)<1e-6);
 const podium=flightPose(flightAtNode(12,mobile),mobile);assert.ok(podium.position.distance({x:-18,y:-5.35,z:-68})<.3);assert.ok(podium.target.y>podium.position.y);
 for(let i=0;i<2000;i++){const p=flightPose(i/2000*FLIGHT_PERIOD,mobile);assert.ok(p.position.y>=-5.5);for(const [id,w] of Object.entries(WORLDS)){if(id==='about')continue;assert.ok(p.position.distance({x:w.position[0],y:w.position[1],z:w.position[2]})>w.radius+1);}}
 }
});
