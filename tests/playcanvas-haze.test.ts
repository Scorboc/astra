import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPlanetHaze,HAZE_PALETTES} from '../src/galaxy/origin-haze.ts';
// @ts-ignore renderer helper is JavaScript.
import {planetHazeParticles} from '../src/galaxy/playcanvas-haze.js';
test('PlayCanvas preserves different planet haze forms, including the inclined Solis ring',()=>{
 const mask=new T.Texture();
 for(const id of ['origin','aurora','velir','nereya','solis'] as const)for(const mobile of [false,true]){
  const r=5.5,phase=.37,reference=createPlanetHaze(new T.Vector3(),r,mobile,[mask],HAZE_PALETTES[id],phase,id),actual=planetHazeParticles(id,r,mobile,phase);assert.equal(actual.length,reference.group.children.length);
  actual.forEach((a:any,i:number)=>{const b=reference.group.children[i] as T.Sprite;for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(a.base[axis]-b.position[axis])<1e-8);assert.ok(Math.abs(a.width-b.scale.x)<1e-8);assert.ok(Math.abs(a.height-b.scale.y)<1e-8);for(const [j,channel] of ['r','g','b'].entries())assert.ok(Math.abs(a.color[j]-(b.material.color as any)[channel])<1e-7);b.material.dispose();});
 }
 mask.dispose();
});
