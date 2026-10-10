import test from 'node:test';
import assert from 'node:assert/strict';
import {newResearch,saveAtlasEntry,validResearch} from '../src/galaxy/research.ts';
import {atlasCollections} from '../src/galaxy/atlas-collections.ts';
test('collections persist valid notes and retain revisions without fabricated practice',()=>{
 const blank=newResearch(),input={kind:'discovery',text:'Мне хочется попробовать',status:'Исследую',evidenceId:''};
 const first=saveAtlasEntry(blank,input,'2026-10-10T12:00:00Z');assert.ok(validResearch(JSON.parse(JSON.stringify(first))));assert.equal(blank.atlas,undefined);
 const next=saveAtlasEntry(first,{...input,id:first.atlas![0].id,text:'Передумал'},'2026-10-11T12:00:00Z');assert.equal(next.atlas![0].revision,2);assert.equal(next.atlasHistory![0].text,input.text);
 assert.throws(()=>saveAtlasEntry(blank,{...input,kind:'skill'},'2026-10-10T12:00:00Z'));
 assert.throws(()=>saveAtlasEntry(blank,{...input,evidenceId:'foreign'},'2026-10-10T12:00:00Z'));
 assert.match(atlasCollections(blank),/Коллекция пока пуста/);
});
test('collection text is escaped',()=>{const s=saveAtlasEntry(newResearch(),{kind:'decision',text:'<script>x</script>',status:'Отложено',evidenceId:''},'2026-10-10T12:00:00Z');assert.ok(!atlasCollections(s).includes('<script>'));});
