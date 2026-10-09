import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_THEMES} from '../src/galaxy/world-themes.ts';
// @ts-ignore renderer material adapter is JavaScript.
import {applyPlanetFinish} from '../src/galaxy/playcanvas-materials.js';
test('PlayCanvas uses the approved metalness, roughness and clearcoat of every planet',()=>{
 for(const theme of Object.values(WORLD_THEMES)){let updates=0;const material:any={update(){updates++;}};assert.equal(applyPlanetFinish(material,theme),material);assert.equal(material.metalness,theme.metalness);assert.equal(material.gloss,1-theme.roughness);assert.equal(material.clearCoat,theme.clearcoat);assert.equal(material.clearCoatGloss,1-theme.clearcoatRoughness);assert.equal(updates,1);}
});
