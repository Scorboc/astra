import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createAsteroidStream,createAsteroidWeather,asteroidStreamPath,asteroidMistDensity,createFlashSchedule,ASTEROID_FLASH_SECONDS,serpentSpiralPose,SERPENT_SPIRALS } from '../src/galaxy/asteroid-stream.ts';
import { createPlanetHaze,HAZE_PALETTES } from '../src/galaxy/origin-haze.ts';
import { flightPose,WORLDS } from '../src/galaxy/universe-path.ts';

test('dark asteroid stream is instanced, deterministic, bounded and reduced on mobile',()=>{
  const desktop=createAsteroidStream(false),repeat=createAsteroidStream(false),mobile=createAsteroidStream(true);
  assert.equal(desktop.count,700);assert.equal(mobile.count,300);
  assert.deepEqual(desktop.instanceMatrix.array,repeat.instanceMatrix.array);
  assert.ok(desktop.boundingSphere!.radius<120);
  assert.ok(desktop.material.roughness>.9);
  for(let i=0;i<=100;i++)assert.ok(Number.isFinite(asteroidStreamPath.getPoint(i/100).length()));
  for(const mesh of [desktop,repeat,mobile]){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
});

test('asteroid mist has varied lengths and translucent rest without weakening magenta flashes',()=>{
  const mask=new T.Texture(),storm=createAsteroidWeather(false,[mask],()=>.25);
  const camera=new T.Vector3(0,0,10);
  assert.equal(storm.group.children.filter(o=>o instanceof T.Line||o instanceof T.Mesh).length,0);
  const densities=Array.from({length:101},(_,i)=>asteroidMistDensity(i/100));
  assert.ok(Math.max(...densities)/Math.min(...densities)>8);
  const glows=storm.group.children.filter(o=>o.name==='embedded-mist-flash') as T.Sprite[];
  const steady=storm.group.children.filter(o=>o.name==='steady-mist-glow') as T.Sprite[];
  assert.equal(storm.update(0,camera,false),0);
  const brightness=steady[0].material.opacity;
  assert.ok(brightness>.2&&brightness<.45);
  const lengths=steady.map(o=>o.scale.x),ratios=steady.map(o=>o.scale.x/o.scale.y);
  assert.equal(new Set(lengths).size,steady.length);
  assert.ok(Math.max(...lengths)/Math.min(...lengths)>5);
  assert.ok(Math.min(...ratios)<1&&Math.max(...ratios)>7);
  assert.ok(steady.every(o=>o.material.opacity<=.4));
  assert.equal(storm.update(3.5,camera,false),1);
  assert.ok(glows.filter(o=>o.visible).length>=1);
  assert.equal(Math.max(...glows.map(o=>o.material.opacity)),1);
  assert.ok(glows.every(o=>o.material.color.getHexString()==='ff125b'));
  assert.equal(steady[0].material.opacity,brightness);
  storm.update(4,camera,false);assert.equal(glows[0].material.opacity,0);
  assert.equal(storm.update(4.2,camera,true),0);
  assert.ok(glows.every(o=>!o.visible&&o.material.opacity===0));
  assert.equal(steady[0].material.opacity,brightness);
  assert.ok(storm.group.children.filter(o=>o instanceof T.PointLight).every(o=>(o as T.PointLight).intensity===0));
  storm.group.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(m=>m.dispose());});mask.dispose();
});

test('pink mist envelopes the complete serpent and coils only in selected stretches',()=>{
  for(const mobile of [false,true]){
    const mask=new T.Texture(),storm=createAsteroidWeather(mobile,[mask],()=>.25);
    const envelope=storm.group.children.filter(o=>o.name==='pink-serpent-envelope') as T.Sprite[];
    const coils=storm.group.children.filter(o=>o.name==='pink-serpent-spiral') as T.Sprite[];
    assert.equal(envelope.length,mobile?36:60);assert.equal(coils.length,mobile?54:84);
    storm.update(0,new T.Vector3(),true);
    for(const sprite of envelope){
      assert.ok(sprite.material.color.r>sprite.material.color.b&&sprite.material.color.b>sprite.material.color.g);
      assert.ok(sprite.material.opacity>.1&&sprite.material.opacity<.4);
      assert.equal(sprite.material.depthWrite,false);
    }
    for(let i=0;i<=400;i++){
      const p=asteroidStreamPath.getPointAt(i/400);
      assert.ok(envelope.some(s=>s.position.distanceTo(p)<Math.min(s.scale.x,s.scale.y)*.4),'No uncovered interval, including both ends');
    }
    for(const u of [0,.04,.32,.68,.99,1])assert.equal(serpentSpiralPose(u).weight,0);
    for(const section of SERPENT_SPIRALS){
      assert.ok(serpentSpiralPose(section.from).position.distanceTo(asteroidStreamPath.getPointAt(section.from))<1e-6);
      assert.ok(serpentSpiralPose(section.to).position.distanceTo(asteroidStreamPath.getPointAt(section.to))<1e-6);
      const u=(section.from+section.to)/2;
      assert.ok(Math.abs(serpentSpiralPose(u).position.distanceTo(asteroidStreamPath.getPointAt(u))-section.radius)<1e-6);
      assert.ok(serpentSpiralPose(u,1).position.distanceTo(serpentSpiralPose(u).position)>1);
    }
    storm.group.traverse(o=>{if(o instanceof T.Sprite)o.material.dispose();});mask.dispose();
  }
});

test('every mist cluster repeats flashes indefinitely with independent phases',()=>{
  let seed=714;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const mask=new T.Texture(),storm=createAsteroidWeather(true,[mask],rng),camera=new T.Vector3(0,0,-75);
  const glows=storm.group.children.filter(o=>o.name==='embedded-mist-flash') as T.Sprite[];
  const events=glows.map(()=>0),previous=glows.map(()=>false),lastActive=glows.map(()=>0);
  let asynchronous=false;
  for(let time=0;time<600;time+=.1){
    storm.update(time,camera,false);
    glows.forEach((glow,i)=>{
      if(glow.visible&&!previous[i])events[i]++;
      if(glow.visible)lastActive[i]=time;
      if(time>12)assert.ok(time-lastActive[i]<7.2,'No cluster silently stops flashing');
      previous[i]=glow.visible;
    });
    if(previous.some(Boolean)&&previous.some(v=>!v))asynchronous=true;
  }
  assert.ok(events.every(count=>count>70));assert.ok(asynchronous);
  storm.group.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(m=>m.dispose());});mask.dispose();
});

test('flash lasts exactly one second with independently sampled 2–6 second gaps',()=>{
  const values=[0,.25,1,.5];let index=0;
  const schedule=createFlashSchedule(()=>values[index++%values.length]);
  assert.equal(ASTEROID_FLASH_SECONDS,1);
  assert.equal(schedule.sample(1.99).pulse,0);
  assert.equal(schedule.sample(2.5).pulse,1);
  assert.equal(schedule.sample(2.999).event,0);
  assert.equal(schedule.sample(3).pulse,0);
  assert.equal(schedule.sample(3).start,6);
  assert.equal(schedule.sample(6.5).pulse,1);
  assert.equal(schedule.sample(7).start,13);
  assert.equal(schedule.sample(13.5).pulse,1);
});

test('intro camera backs away from Istok, Solis haze occupies a ring not a sphere',()=>{
  assert.ok(flightPose(0).position.distanceTo(new T.Vector3(...WORLDS.origin.position))>19);
  const texture=new T.Texture();
  const haze=createPlanetHaze(new T.Vector3(),5.8,false,[texture],HAZE_PALETTES.solis,0,'solis');
  assert.equal(haze.group.userData.hazeForm,'inclined-nebula-ring');
  for(const sprite of haze.group.children as T.Sprite[]){
    assert.ok(Math.abs(sprite.position.z)<.21);
    assert.ok(sprite.position.length()>5.8*1.59);
    assert.ok(sprite.position.length()<5.8*1.82);
    sprite.material.dispose();
  }
  texture.dispose();
});
