import test from 'node:test';
import assert from 'node:assert/strict';
import {newResearch,blankBirth,validateBirth,commitProfile,previousMonthWeeks,commitMemories,researchCard,saveResearchAnswer,researchProgress,validResearch,nextResearchRoute} from '../src/galaxy/research.ts';
import {newExpedition} from '../src/galaxy/expedition.ts';
import {newJourney,parseRoute,demoAt} from '../src/galaxy/journey.ts';
import {saveExpedition,loadExpedition} from '../src/galaxy/expedition-storage.ts';
const now='2026-10-04T10:00:00Z';
function ready(){return {...newResearch(),complete:true,birth:{...blankBirth,date:'1990-05-12',place:'Казань, Татарстан, Россия'},memoryDone:true,wishes:{original:'Музыка и поездки',confirmed:'Музыка\nПоездки',preserve:'Работу',avoid:'Коммерциализацию хобби'},rhythm:{kind:'shifts' as const,windows:'Пока не знаю',resources:'',limits:''}};}
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};}
test('research: blank visitor has no birth, wishes, actions or automatic instruction',()=>{
 const s=newResearch();assert.equal(s.birth,null);assert.equal(s.wishes,null);assert.equal(s.answers.length,0);assert.equal(researchProgress(s),0);assert.ok(validResearch(s));
 for(const route of ['birth','wishes','rhythm','review','astrology','forecast','astro-checks','results','memories','research'])assert.equal(parseRoute('#'+route),route);
});
test('research: birth data cannot be deferred past introduction',()=>{
 const legacy={...ready(),birth:null,birthDeferred:true,complete:false,step:3 as const};
 assert.equal(nextResearchRoute(legacy),'birth');
});
test('research: unknown birth time stays unknown; exact/approximate and invalid dates checked',()=>{
 const b={...blankBirth,date:'1990-05-12',place:'Казань, Татарстан, Россия',time:'12:00',until:'13:00'};
 const unknown=validateBirth(b,'2026-10-04');assert.equal(unknown.time,'');assert.equal(unknown.until,'');
 assert.throws(()=>validateBirth({...b,date:'2026-02-30'},'2026-10-04'));
 assert.throws(()=>validateBirth({...b,date:'2027-01-01'},'2026-10-04'));
 assert.throws(()=>validateBirth({...b,accuracy:'exact',time:''},'2026-10-04'));
 assert.throws(()=>validateBirth({...b,accuracy:'approximate',until:'11:00'},'2026-10-04'));
 assert.equal(validateBirth({...b,accuracy:'approximate'},'2026-10-04').until,'13:00');
});
test('research: wishes preserve original text, changes retain history, no automatic primary goal',()=>{
 const s=ready(),w=s.wishes!;
 const changed=commitProfile(s,'wishes',{...w,confirmed:'Музыка как хобби\nПоездки'},now);
 assert.equal(changed.wishes!.original,w.original);assert.equal(changed.profileHistory.length,1);assert.deepEqual(changed.profileHistory[0].value,w);
 assert.equal(commitProfile(changed,'wishes',changed.wishes!,now).profileHistory.length,1);
 assert.equal(changed.answers.length,0);
});
test('research: previous calendar month is separated from prospective actions and has history',()=>{
 const weeks=previousMonthWeeks('2026-10-04');assert.equal(weeks[0].from,'2026-09-01');assert.equal(weeks[3].to,'2026-09-30');
 assert.equal(previousMonthWeeks('2024-03-01')[3].to,'2024-02-29');
 const rows=weeks.map(r=>({...r,note:'',certainty:'Не помню',source:'RETROSPECTIVE_USER_STATEMENT' as const}));
 const s=commitMemories(ready(),rows);assert.equal(s.answers.length,0);assert.equal(s.memoryDone,true);
 assert.equal(commitMemories(s,rows.map((r,i)=>({...r,note:i===0?'Вспомнил':' '}))).profileHistory.length,1);
});
test('research: choices require confirmation, daily repeat revises instead of accumulating, unknown is allowed',()=>{
 let s=ready();const c=researchCard(s,'2026-10-04');assert.equal(c.kind,'question');
 assert.throws(()=>saveResearchAnswer(newResearch(),'2026-10-04',['Пропустить'],'',now));
 assert.throws(()=>saveResearchAnswer(s,'2026-10-04',[],'',now));
 s=saveResearchAnswer(s,'2026-10-04',['Пока не знаю'],'Мой пример',now);
 assert.equal(s.answers.length,1);assert.equal(saveResearchAnswer(s,'2026-10-04',['Пока не знаю'],'Мой пример',now),s);
 s=saveResearchAnswer(s,'2026-10-04',['Пропустить'],'',now);assert.equal(s.answers.length,1);assert.equal(s.history.length,1);assert.equal(s.answers[0].revision,2);
 assert.equal(s.answers[0].source,'USER_STATEMENT');assert.ok(validResearch(s));
});
test('research: choice game records only task response; trial never becomes done before consent',()=>{
 let s=saveResearchAnswer(ready(),'2026-10-04',['Стабильность'],'',now);
 assert.equal(researchCard(s,'2026-10-05').kind,'game');
 assert.throws(()=>saveResearchAnswer(s,'2026-10-05',['Музыка','Пропустить'],'',now));
 s=saveResearchAnswer(s,'2026-10-05',['Музыка','Отдохнуть'],'',now);assert.equal(s.answers[1].source,'TASK_RESPONSE');
 s=saveResearchAnswer(s,'2026-10-06',['Сам процесс'],'',now);
 assert.equal(researchCard(s,'2026-10-07').kind,'trial');
 assert.throws(()=>saveResearchAnswer(s,'2026-10-07',['Сделал'],'',now));
 const postponed=saveResearchAnswer(s,'2026-10-07',['Перенести'],'',now);assert.equal(postponed.answers[3].source,'USER_STATEMENT');
 const done=saveResearchAnswer({...s,trialAccepted:'2026-10-07'},'2026-10-07',['Сделал'],'',now);assert.equal(done.answers[3].source,'SELF_REPORTED_ACTION');
});
test('research: drafts survive opted-in reload, legacy records preserved; demo cannot overwrite',()=>{
 const store=storage(),journey=demoAt(4);journey.demo=false;const e=newExpedition('2026-10-04');e.research={...ready(),drafts:{birth:{date:'1990-05-12',accuracy:'unknown'},research:{choice:['Пропустить'],note:'Черновик'}}};
 const snapshot={version:1 as const,journey,expedition:e};assert.equal(saveExpedition(store,snapshot,false),'memory');assert.equal(loadExpedition(store).snapshot,null);
 assert.equal(saveExpedition(store,snapshot,true),'saved');const loaded=loadExpedition(store).snapshot!;
 assert.deepEqual(loaded.expedition.research,e.research);assert.deepEqual(loaded.journey.data.observations,journey.data.observations);assert.deepEqual(loaded.journey.data.approvedPlan,journey.data.approvedPlan);
 assert.equal(saveExpedition(store,{...snapshot,journey:newJourney(true)},true),'memory');assert.deepEqual(loadExpedition(store).snapshot!.expedition.research,e.research);
 const fail={...store,setItem(){throw new Error('Quota');}};assert.equal(saveExpedition(fail,snapshot,true),'error');
});
test('research: old game options remain tied to original question after wishes change',()=>{
 let s=saveResearchAnswer(ready(),'2026-10-04',['Стабильность'],'',now);
 s=saveResearchAnswer(s,'2026-10-05',['Музыка','Отдохнуть'],'',now);
 s=commitProfile(s,'wishes',{...s.wishes!,confirmed:'Совсем другое желание'},now);
 assert.ok(researchCard(s,'2026-10-05').choices.includes('Музыка'));
 s=saveResearchAnswer(s,'2026-10-05',['Музыка'],'Исправление',now);
 assert.equal(s.answers.length,2);assert.equal(s.answers.find(a=>a.day==='2026-10-05')!.revision,2);assert.equal(s.history.length,1);
});
test('research: old snapshots load; malformed new state does not become a ready profile',()=>{
 const store=storage(),snapshot={version:1 as const,journey:newJourney(),expedition:newExpedition()};saveExpedition(store,snapshot,true);assert.ok(loadExpedition(store).snapshot);
 assert.equal(validResearch({...newResearch(),complete:true}),false);
 assert.equal(validResearch({...ready(),answers:[{day:'x'}]}),false);
 assert.equal(validResearch({...ready(),birth:{...blankBirth,date:'bad'}}),false);
});
