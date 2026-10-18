import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceOrbit, clampFrame, createApproachGate, fitFrame, FRAME_ORDER, frameAngle, nearestFrame } from '../src/components/castle-orbit-model.ts';
import { withBase } from '../src/asset-url.ts';

test('castle has exactly 21 unique frames, center first, expanding outward', () => {
  assert.equal(FRAME_ORDER.length, 21);
  assert.equal(new Set(FRAME_ORDER).size, 21);
  assert.equal(FRAME_ORDER[0], 10);
  assert.ok(FRAME_ORDER.every((f, i) => !i || Math.abs(f - 10) >= Math.abs(FRAME_ORDER[i - 1] - 10)));
  assert.equal(frameAngle(0), -40);
  assert.equal(frameAngle(20), 40);
  assert.equal(clampFrame(NaN), 10);
  assert.equal(clampFrame(100), 20);
  assert.equal(withBase('/castle-orbit/transparent/f10.webp', '/astra/'), '/astra/castle-orbit/transparent/f10.webp');
});

test('unloaded target uses a real available frame, not a blank canvas', () => {
  assert.equal(nearestFrame(8, new Set()), undefined);
  assert.equal(nearestFrame(8, new Set([10, 19])), 10);
  assert.equal(nearestFrame(8, new Set([8, 10, 19])), 8);
});

test('desktop and both phone orientations contain the entire landscape frame', () => {
  for (const [w, h] of [[1440, 900], [390, 844], [844, 390]]) {
    const r = fitFrame(w, h);
    assert.ok(r.x >= 0 && r.y >= 0);
    assert.ok(r.x + r.width <= w + .001 && r.y + r.height <= h + .001);
    assert.ok(Math.abs(r.width / r.height - 1550 / 1014) < .00001);
  }
});

test('inertia is bounded and reduced motion has none', () => {
  assert.deepEqual(advanceOrbit(12, 8, .05, true), { position: 12, velocity: 0 });
  assert.deepEqual(advanceOrbit(19.9, 24, .05, false), { position: 20, velocity: 0 });
  const step = advanceOrbit(12, 8, .016, false);
  assert.ok(step.position > 12 && step.velocity > 0 && step.velocity < 8);
});

test('approach opens only in flight facing the castle, once per pass, and rearms outside', () => {
  const gate = createApproachGate();
  assert.equal(gate.observe(45, 1, true), false);
  assert.equal(gate.observe(24, 1, false), false);
  assert.equal(gate.observe(24, -.5, true), false);
  assert.equal(gate.observe(24, NaN, true), false);
  assert.equal(gate.observe(24, 1, true), true);
  assert.equal(gate.observe(24, 1, true), false);
  assert.equal(gate.observe(35, 1, true), false);
  assert.equal(gate.observe(45, 1, true), false);
  assert.equal(gate.observe(24, 1, true), true);
});
