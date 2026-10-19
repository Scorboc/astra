import test from 'node:test';
import assert from 'node:assert/strict';
import {WINDOW_LIGHT_SOURCES,WINDOW_LIGHT_COLOR,windowLightField,windowLightShader} from '../src/galaxy/castle-window-light.js';

test('window scatter stays at facade apertures and never adds a cloud below the podium',()=>{
 assert.equal(WINDOW_LIGHT_SOURCES.length,5);
 for(const s of WINDOW_LIGHT_SOURCES){assert.ok(s.position[1]-s.size[1]/2>.19405565202);assert.ok(s.position[2]-s.size[2]/2>0);assert.ok(s.strength>0&&s.strength<=1.6);}
 assert.deepEqual(WINDOW_LIGHT_COLOR,[1,.92,.76]);
 assert.equal(WINDOW_LIGHT_SOURCES[1].position[0],-WINDOW_LIGHT_SOURCES[2].position[0]);
 assert.equal(WINDOW_LIGHT_SOURCES[3].position[0],-WINDOW_LIGHT_SOURCES[4].position[0]);
});
test('window fog envelope reaches zero softly on every box face and decays away from the window',()=>{
 for(const axis of [0,1,2])for(const side of [-1,1]){const p=[0,0,0];p[axis]=side*.5;assert.equal(windowLightField(...p),0);p[axis]=side*.49999;assert.ok(windowLightField(...p)<.00001);}
 assert.ok(windowLightField(0,0,-.3)>windowLightField(0,0,.3));
 assert.equal(windowLightField(NaN,0,0),0);
 for(let i=0;i<=20;i++)assert.ok(windowLightField(i/20-.5,0,0)>=0&&windowLightField(i/20-.5,0,0)<=1);
});
test('window fog has bounded local ray marching, no screen-space card or separate texture download',()=>{
 assert.ok(windowLightShader(true).includes('i<8'));assert.ok(windowLightShader(false).includes('i<12'));
 for(const text of [windowLightShader(true),windowLightShader(false)]){assert.ok(text.includes('inverseModel'));assert.ok(text.includes('smoothstep'));assert.ok(!text.includes('discardAlpha'));}
});
