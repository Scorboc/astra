import test from 'node:test';
import assert from 'node:assert/strict';
import { stripBase, withBase } from '../src/asset-url.ts';

test('project Pages base: deployed paths map to app routes and back', () => {
  const base = '/astra/';
  assert.equal(stripBase('/astra/', base), '/');
  assert.equal(stripBase('/astra', base), '/');
  assert.equal(stripBase('/astra/today', base), '/today');
  assert.equal(stripBase('/astra/profile/privacy', base), '/profile/privacy');
  assert.equal(stripBase('/astral/today', base), '/astral/today');
  assert.equal(withBase('/today', base), '/astra/today');
  assert.equal(withBase('/spatial/#astrology', base), '/astra/spatial/#astrology');
  assert.equal(withBase('/universe/aurora.webp', base), '/astra/universe/aurora.webp');
});

test('root base leaves paths unchanged', () => {
  assert.equal(stripBase('/today', '/'), '/today');
  assert.equal(stripBase('/', '/'), '/');
  assert.equal(withBase('/today', '/'), '/today');
});
