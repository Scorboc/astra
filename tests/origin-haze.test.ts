import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { hazeDensity,createPlanetHaze,HAZE_PALETTES,HAZE_FORMS } from '../src/galaxy/origin-haze.ts';

test('haze has transparent borders, bounded irregular density and deterministic masks',()=>{
  for(const seed of [3,11,27]){
    const values=new Set<number>();
    for(let i=0;i<=100;i++){
      const t=i/100;
      for(const [u,v] of [[0,t],[1,t],[t,0],[t,1]])assert.equal(hazeDensity(u,v,seed),0);
      const d=hazeDensity(t,.45,seed);assert.ok(d>=0&&d<=1);values.add(d);
      assert.equal(d,hazeDensity(t,.45,seed));
    }
    assert.ok(values.size>50);
    assert.notEqual(hazeDensity(.35,.5,seed),hazeDensity(.65,.5,seed));
  }
});

test('every planet shares masks, scales haze, and reduces distant/mobile work',()=>{
  const masks=[new T.Texture(),new T.Texture(),new T.Texture()];
  const near=new T.Vector3(0,0,8);
  assert.equal(Object.keys(HAZE_PALETTES).length,6);
  assert.equal(new Set(Object.values(HAZE_FORMS).map(f=>JSON.stringify(f))).size,6);
  assert.equal(new Set(Object.values(HAZE_PALETTES).map(p=>p.join(','))).size,6);
  for(const [id,palette] of Object.entries(HAZE_PALETTES))for(const mobile of [false,true]){
    const haze=createPlanetHaze(new T.Vector3(),4,mobile,masks,palette,0,id as keyof typeof HAZE_FORMS);
    assert.equal(haze.group.userData.hazeForm,HAZE_FORMS[id as keyof typeof HAZE_FORMS].name);
    const sprites=haze.group.children as T.Sprite[];
    assert.equal(sprites.length,mobile?18:26);
    for(const s of sprites){assert.ok(masks.includes(s.material.map!));assert.ok(s.position.length()>4);}
    haze.update(0,false,near);
    assert.ok(sprites.every(s=>s.visible));
    const fullOpacity=sprites[0].material.opacity;
    haze.update(0,true,near);assert.ok(Math.abs(sprites[0].material.opacity/fullOpacity-.22)<1e-9);
    haze.update(1,false,new T.Vector3(0,0,48));
    assert.equal(sprites.filter(s=>s.visible).length,mobile?6:9);
    haze.update(1,false,new T.Vector3(0,0,200));assert.equal(haze.group.visible,false);
    haze.update(2,false,near);assert.equal(haze.group.visible,true);assert.ok(sprites.every(s=>s.visible));
    sprites.forEach(s=>s.material.dispose());
  }
  masks.forEach(t=>t.dispose());
});
