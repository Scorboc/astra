import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { WORLDS, flightPose, finiteFlight, wrapFlight, FLIGHT_PERIOD, FLIGHT_STOPS, OBSERVATORY_POSITION, OBSERVATORY_LOAD_DISTANCE, OBSERVATORY_ROTATION } from '../src/galaxy/universe-path.ts';

test('observatory: entrance faces planets and closed tour passes in front',()=>{
  const station=new Vector3(...OBSERVATORY_POSITION);
  const front=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),OBSERVATORY_ROTATION);
  for(const id of ['velir','nereya'] as const)assert.ok(new Vector3(...WORLDS[id].position).sub(station).normalize().dot(front)>.8);
  const pose=flightPose(13/8),offset=pose.position.clone().sub(station);
  assert.ok(offset.dot(front)>20&&offset.length()<35);
  assert.ok(pose.target.distanceTo(station)<10);
});

test('observatory: separate sector between third and fourth worlds, not loaded at entry',()=>{
  const station=new Vector3(...OBSERVATORY_POSITION);
  assert.ok(station.z<WORLDS.velir.position[2]&&station.z>WORLDS.nereya.position[2]);
  for(const p of Object.values(WORLDS))assert.ok(station.distanceTo(new Vector3(...p.position))>p.radius+25);
  for(const t of [0,.125,.25])assert.ok(flightPose(t).position.distanceTo(station)>OBSERVATORY_LOAD_DISTANCE);
  assert.ok(station.x<-25);
  for(const t of [.5,.625])assert.ok(flightPose(t).position.distanceTo(station)<OBSERVATORY_LOAD_DISTANCE);
});

test('universe: outbound flight retains the five worlds through depth',()=>{
  let previous=flightPose(0).position;
  for(let i=0;i<=1000;i++){
    const pose=flightPose(i/1000);
    assert.ok(pose.position.toArray().every(Number.isFinite));
    assert.ok(pose.position.distanceTo(pose.target)>1);
    assert.ok(pose.position.distanceTo(previous)<1);
    previous=pose.position;
  }
  assert.ok(flightPose(1).position.z<flightPose(0).position.z-100);
});
test('universe: the camera path does not cross a planetary surface',()=>{
  for(let i=0;i<=6000;i++)for(const p of Object.values(WORLDS)){
    const t=i/6000*FLIGHT_PERIOD;
    // Mobile camera uses the same path with a small z offset.
    for(const offset of [0,1.5]){
      const pos=flightPose(t).position;pos.z+=offset;
      const d=pos.distanceTo(new Vector3(...p.position));
      assert.ok(d>p.radius+1,`Collision at ${t}: ${d} / ${p.radius}`);
    }
  }
});
test('universe: controls preserve multiple laps and guard non-finite input',()=>{
  assert.equal(finiteFlight(-1),-1);assert.equal(finiteFlight(20),20);assert.equal(finiteFlight(NaN),0);assert.equal(finiteFlight(Infinity),0);
  assert.equal(wrapFlight(FLIGHT_PERIOD),0);assert.equal(wrapFlight(-.125),FLIGHT_PERIOD-.125);
  assert.deepEqual(FLIGHT_STOPS,[0,.25,.5,.75,1]);
});

test('universe: repeated forward and reverse laps have no position or look seam',()=>{
  const step=.0001;
  for(const boundary of [1,FLIGHT_PERIOD,-FLIGHT_PERIOD,FLIGHT_PERIOD*9]){
    const before=flightPose(boundary-step),at=flightPose(boundary),after=flightPose(boundary+step);
    for(const key of ['position','target'] as const){
      const incoming=at[key].clone().sub(before[key]),outgoing=after[key].clone().sub(at[key]);
      assert.ok(incoming.length()<.1&&outgoing.length()<.1);
      assert.ok(incoming.normalize().dot(outgoing.normalize())>.995,`Tangent seam ${key} at ${boundary}`);
    }
  }
  for(let i=0;i<=3000;i++){
    const t=i/3000*FLIGHT_PERIOD,pose=flightPose(t);
    assert.ok(pose.position.distanceTo(pose.target)>1);
    assert.ok(pose.position.distanceTo(flightPose(t+FLIGHT_PERIOD*10).position)<1e-9);
    assert.ok(pose.target.distanceTo(flightPose(t-FLIGHT_PERIOD*10).target)<1e-9);
  }
  assert.ok(flightPose(1.5).position.x<-50,'Return arc must pass the separate left observatory sector');
});
