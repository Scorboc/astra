import test from 'node:test';
import assert from 'node:assert/strict';
import { GOLD_EDGE_CONTRAST,originGoldGLSL } from '../src/galaxy/origin-gold.ts';

test('gold edge contrast is 19 with screen-space antialiasing',()=>{
  assert.equal(GOLD_EDGE_CONTRAST,19);
  assert.match(originGoldGLSL,/\*19\.0/);
  assert.match(originGoldGLSL,/fwidth\(goldEdge\)/);
  // Same boundary at .5, no new texture requests, no geometry displacement.
  assert.match(originGoldGLSL,/goldSoft-\.5/);
  assert.doesNotMatch(originGoldGLSL,/texture2D|position/);
});
