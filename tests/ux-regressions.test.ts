import test from 'node:test';
import assert from 'node:assert/strict';
import {newResearch,canRevealFocus} from '../src/galaxy/research.ts';
import {exampleAccountSnapshot} from '../src/galaxy/example-account.ts';
import {monthReview,monthReady} from '../src/galaxy/month-review.ts';
import {readFileSync} from 'node:fs';

test('focus stays hidden before todays answer, including after a previous day',()=>{
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!;
 assert.equal(canRevealFocus({...s,forecastMode:'blind'},'2026-10-09'),false);
 assert.equal(canRevealFocus({...s,forecastMode:'blind'},'2026-10-06'),true);
 assert.equal(canRevealFocus({...newResearch(),forecastMode:'open'},'2026-10-09'),true);
 assert.equal(canRevealFocus(newResearch(),'2026-10-09'),false);
});
test('month review shows actual dates and does not claim a plan exists',()=>{
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!;
 const sparse={...s,answers:[s.answers[0],s.answers[4]]};
 assert.equal(monthReady(sparse,'2026-10-09'),true);
 const html=monthReview(sparse,'2026-10-09');
 assert.ok(html.includes('07.09'));assert.ok(html.includes('11.09'));
 assert.ok(html.includes('не означает достаточности'));
 assert.ok(!html.includes('Собрать следующую неделю'));
});
test('today keeps month entry available without a new daily answer',()=>{
 const source=readFileSync(new URL('../src/galaxy/research-ui.ts',import.meta.url),'utf8');
 assert.ok(source.includes('if(monthReady(st,h.today()))'));
 assert.ok(!source.includes('if(row&&monthReady'));
 assert.ok(source.includes('canRevealFocus(st,h.today())'));
});
