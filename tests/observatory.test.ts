import test from 'node:test';
import assert from 'node:assert/strict';
import { newResearch } from '../src/galaxy/research.ts';
import { exampleAccountSnapshot } from '../src/galaxy/example-account.ts';
import { useObservatory,observatoryToday,observationAtlas } from '../src/galaxy/observatory.ts';

test('presentation can return to classic without touching research data',()=>{
 assert.equal(useObservatory('classic'),false);assert.equal(useObservatory(null),true);
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!,before=JSON.stringify(s);
 observatoryToday(s,'2026-10-09');observationAtlas(s);
 assert.equal(JSON.stringify(s),before);
});
test('observatory points new and returning visitors to real next steps',()=>{
 assert.match(observatoryToday(newResearch(),'2026-10-09'),/href="#welcome"/);
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!;
 assert.match(observatoryToday(s,'2026-10-09'),/Открыть сегодняшний вопрос/);
 assert.match(observatoryToday(s,'2026-10-06'),/На сегодня достаточно/);
 assert.match(observatoryToday(s,'2026-10-09'),/На чём остановились · 2026-10-06/);
});
test('atlas handles no evidence and keeps provenance and uncertainty',()=>{
 assert.match(observationAtlas(newResearch()),/Пока нет сохранённых наблюдений/);
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!;
 const html=observationAtlas(s);
 assert.match(html,/Сохранённых персональных прогнозов и их сопоставлений пока нет/);
 assert.match(html,/версия/);assert.match(html,/Где менялись выбранные ответы/);
 assert.match(html,/не независимая проверка/);
});
test('atlas escapes free text and shows it without inventing an interpretation',()=>{
 const s=exampleAccountSnapshot('2026-10-06').expedition.research!;
 s.answers=[{...s.answers[0],note:'<script>private</script>',prompt:'<b>question</b>'}];
 const html=observationAtlas(s);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;private&lt;/script&gt;'));
});
