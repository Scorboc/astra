import test from 'node:test';
import assert from 'node:assert/strict';
import { Color } from 'three';
import { nebulaColor,contrastMist } from '../src/galaxy/space-color.ts';

test('space contrast retains soft transparent edges and bounded density',()=>{
  assert.equal(contrastMist(0),0);assert.equal(contrastMist(1),1);
  assert.ok(contrastMist(.05)<.05);assert.ok(contrastMist(.8)>.8);
  let previous=0;
  for(let i=0;i<=1000;i++){const value=contrastMist(i/1000);assert.ok(value>=previous&&value<=1);assert.ok(value-previous<.002);previous=value;}
});
test('nebula saturation preserves channel order without introducing white',()=>{
  for(const input of ['#e75caa','#b53782','#71e69d','#36cbd8','#d49d54','#8870cf']){
    const base=new Color(input).toArray(),graded=nebulaColor(input).toArray();
    assert.ok(graded.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
    assert.ok(Math.max(...graded)-Math.min(...graded)>=Math.max(...base)-Math.min(...base));
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok((base[i]-base[j])*(graded[i]-graded[j])>=0);
  }
});
