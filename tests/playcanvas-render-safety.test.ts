import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/galaxy/playcanvas-world.js',import.meta.url),'utf8');
test('PlayCanvas soft effects use alpha-aware additive blending, never opaque additive quads',()=>{
 assert.ok(source.includes('pc.BLEND_ADDITIVEALPHA'));
 assert.ok(!/pc\.BLEND_ADDITIVE\b/.test(source));
 assert.ok(source.includes('frame.update()'));
 assert.ok(source.includes('LAYERID_IMMEDIATE'));
});
test('PlayCanvas stars have a position-only shader without missing normal attributes',()=>{
 const code=source.slice(source.indexOf('function createBackdrop()'),source.indexOf('function createAsteroids()'));
 assert.ok(code.includes('astra-stars-unlit'));assert.ok(!code.includes('SEMANTIC_NORMAL'));
});
