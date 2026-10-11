import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleAccountSnapshot} from '../src/galaxy/example-account.ts';
import {markPersonalTableRow,savePersonalTableRow,validResearch} from '../src/galaxy/research.ts';
import {personalTableView} from '../src/galaxy/personal-table.ts';

const now='2026-10-11T12:00:00Z';
test('a client wish is only a suggestion until the client accepts and edits it',()=>{
 const base=exampleAccountSnapshot('2026-10-11').expedition.research!;
 const state={...base,wishes:{...base.wishes!,confirmed:'Хочу играть на гармони'}};
 const before=personalTableView(state,'2026-10-11');
 assert.match(before,/Хочу играть на гармони/);
 assert.equal(state.personalTable?.length??0,0);
 const accepted=savePersonalTableRow(state,{title:'Учиться играть на гармони',reason:'Хочу попробовать музыку для себя'},now);
 assert.equal(accepted.personalTable?.[0].title,'Учиться играть на гармони');
 assert.ok(validResearch(accepted));
});
test('marks preserve absence, voluntary pause and previous revisions',()=>{
 const base=exampleAccountSnapshot('2026-10-11').expedition.research!;
 const created=savePersonalTableRow(base,{title:'Гармонь',reason:''},now);
 const id=created.personalTable![0].id;
 assert.match(personalTableView(created,'2026-10-11'),/Нет записи/);
 const marked=markPersonalTableRow(created,id,'2026-10-11','rest','Сегодня не хочу заниматься');
 assert.equal(marked.personalTable?.[0].marks[0].status,'rest');
 assert.equal(marked.personalTableHistory?.length,1);
 const cleared=markPersonalTableRow(marked,id,'2026-10-11','clear','');
 assert.equal(cleared.personalTable?.[0].marks.length,0);
 assert.equal(cleared.personalTableHistory?.length,2);
 assert.ok(validResearch(cleared));
});
