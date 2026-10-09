import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasWidthForDiameter,renderPixelRatio,localSurfaceTexels,rockRelief } from '../src/galaxy/surface-resolution.ts';

test('surface density: atlas resolves centre of sphere at physical display resolution',()=>{
  assert.equal(atlasWidthForDiameter(1200,1.5),8192);
  assert.equal(atlasWidthForDiameter(700,2),8192);
  assert.equal(atlasWidthForDiameter(390,2),4096);
  assert.equal(atlasWidthForDiameter(NaN,2),1024);
  assert.equal(atlasWidthForDiameter(0,2),1024);
});
test('surface relief: continuous bounded terrain, calm oceans, deterministic shape',()=>{
  assert.equal(rockRelief(2,3,4,0),0);
  for(let i=0;i<100;i++){
    const a=rockRelief(i*.015,1,-2,1),b=rockRelief(i*.015+.00001,1,-2,1);
    assert.ok(a>=.02&&a<=.117);assert.ok(Math.abs(a-b)<.0001);
    assert.equal(a,rockRelief(i*.015,1,-2,1));
  }
});
test('surface density: bounded framebuffer retains crisp phone pixels',()=>{
  assert.equal(renderPixelRatio(390,844,3),2);
  assert.equal(renderPixelRatio(1280,720,1.5),1.5);
  assert.ok(3840*2160*renderPixelRatio(3840,2160,3)**2<=3840*2160);
  assert.equal(localSurfaceTexels(1254,1.6),2006.4);
});
