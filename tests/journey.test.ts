import test from 'node:test';
import assert from 'node:assert/strict';
import { newJourney, configureJourney, recordJourney, reflectJourney, finishJourney, journeyPlans, journeySummary, demoAt, canVisit, parseRoute, GOALS } from '../src/galaxy/journey.ts';
import { isStale } from '../src/domain.ts';
const draft = { outcome: 'partial' as const, minutes: '7', note: '<test>', energy: '', requestId: '1' };
const now = '2026-10-03T12:00:00Z';
test('journey: no invented observations or achievements on entry', () => {
  const j = newJourney(); assert.equal(j.data.observations.length, 0); assert.equal(j.stage, 0);
  assert.equal(canVisit(j, 'about'), true); assert.equal(canVisit(j, 'aurora'), false);
});
test('journey: required actions cannot be bypassed in normal flow', () => {
  assert.throws(() => recordJourney(newJourney(), draft, now));
  assert.throws(() => reflectJourney(newJourney(), 'A'));
  assert.throws(() => finishJourney(newJourney(), 'gentle', now));
});
test('journey: complete flow uses real domain calculations and selected evidence', () => {
  let j = newJourney(); j = configureJourney(j, GOALS.learning, j.data.schedule);
  j = recordJourney(j, draft, now); j = reflectJourney(j, 'Нужно больше времени.');
  j = finishJourney(j, 'gentle', now);
  assert.equal(j.stage, 4); assert.equal(j.data.approvedPlan!.totalMinutes, 30);
  assert.deepEqual(j.data.approvedPlan!.evidenceIds, ['obs-today']);
  assert.equal(journeySummary(j).partial, 1); assert.equal(journeySummary(j).minutes, 7);
  assert.equal(j.data.approvedPlan!.goal.track, 'learning'); assert.equal(isStale(j.data), false);
});
test('journey: skipped is not done, and does not punish exploration', () => {
  let j = demoAt(1); j = recordJourney(j, { ...draft, outcome: 'skipped', minutes: '' }, now);
  assert.equal(journeySummary(j).skipped, 1); assert.equal(journeySummary(j).completed, 0);
  assert.equal(j.stage, 2); assert.equal(canVisit(j, 'velir'), true);
});
test('journey: duplicates do not advance, edits preserve history and stale plan', () => {
  let j = demoAt(4); const oldPlan = j.data.approvedPlan;
  j = recordJourney(j, draft, now); assert.equal(j.data.history.length, 1);
  assert.equal(j.data.approvedPlan, oldPlan); assert.equal(isStale(j.data), true);
  assert.equal(recordJourney(j, draft, now), j);
});
test('journey: no schedule means no approval, minutes never exceed availability', () => {
  let j = demoAt(3); j = configureJourney(j, j.data.goal, { ...j.data.schedule, minutes: 0 });
  assert.ok(journeyPlans(j).every(p => p.items.length === 0));
  assert.throws(() => finishJourney(j, 'gentle', now));
});
test('journey: demo previews are isolated, deterministic and explicitly synthetic', () => {
  const before = newJourney(); for (let i = 0; i <= 4; i++) { const demo = demoAt(i); assert.equal(demo.stage, i); assert.equal(demo.demo, true); }
  assert.equal(before.stage, 0); assert.equal(before.data.observations.length, 0);
  for (const bad of [-1, 5, NaN, 1.5]) assert.throws(() => demoAt(bad));
});
test('journey: routes validate untrusted deep links', () => {
  assert.equal(parseRoute('#observatory'), 'observatory');
  assert.equal(parseRoute('#about'), 'about'); assert.equal(parseRoute('#planet/aurora'), 'planet/aurora');
  assert.equal(parseRoute('#planet/<script>'), 'galaxy'); assert.equal(parseRoute('#garden/today'), 'galaxy');
});
