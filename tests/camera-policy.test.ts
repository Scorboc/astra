import test from 'node:test';
import assert from 'node:assert/strict';
import {compactViewport,clampDistance,originTextureSize} from '../src/galaxy/camera-policy.js';
import {readFileSync} from 'node:fs';
test('camera gestures are bounded and zoom does not force a teleport',()=>{
 const code=readFileSync(new URL('../src/galaxy/playcanvas-world.js',import.meta.url),'utf8');
 assert.ok(code.includes('lookYaw+dx*.002,-1.2,1.2'));
 assert.ok(code.includes('Math.abs(e.deltaX)>Math.abs(e.deltaY)'));
 const zoom=code.slice(code.indexOf('function zoomScale'),code.indexOf('function pause'));
 assert.ok(!zoom.includes('transition=0;'));
 assert.ok(!code.includes('protectPlanets(pos);camera.setPosition(pos)'));
});
test('portrait and landscape phones retain compact policy',()=>{
 assert.equal(compactViewport(375,812),true);assert.equal(compactViewport(812,375),true);assert.equal(compactViewport(1440,900),false);
});
test('zoom remains bounded after repeated input',()=>{
 let distance=40;for(let i=0;i<200;i++)distance=clampDistance(distance*.9,32,90);assert.equal(distance,32);
 for(let i=0;i<200;i++)distance=clampDistance(distance*1.1,32,90);assert.equal(distance,90);
});
test('mobile and limited graphics devices do not request 8K',()=>{
 assert.equal(originTextureSize(true,16384),4096);assert.equal(originTextureSize(false,4096),4096);assert.equal(originTextureSize(false,16384),8192);
});
