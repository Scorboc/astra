import test from 'node:test';
import assert from 'node:assert/strict';
import { newExpedition,addDays,dayNumber,dailyMission,calendar,answerEncounter,encounterFor,weeklyReports,horizon,updateContext,expeditionDay,validDay } from '../src/galaxy/expedition.ts';
import { newJourney,configureJourney,recordJourney,reflectJourney,finishJourney,PLANETS,parseRoute } from '../src/galaxy/journey.ts';
import { loadExpedition,saveExpedition,forgetExpedition,EXPEDITION_KEY } from '../src/galaxy/expedition-storage.ts';
import { WORLD_THEMES } from '../src/galaxy/world-themes.ts';
import { isStale } from '../src/domain.ts';
const start='2026-10-03';
const draft={outcome:'done' as const,minutes:'5',note:'Синтетическая проба',energy:'',requestId:'first'};
function begin(){let j=newJourney();j=configureJourney(j,j.data.goal,{...j.data.schedule,days:[0,1,2,3,4,5,6]});return {...j,period:{start,today:start}};}
function store(){const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};}
test('expedition: dated observations accumulate and editing preserves date/history',()=>{
 let j=recordJourney(begin(),draft,start+'T12:00:00Z');j={...j,period:{start,today:addDays(start,1)}};
 j=recordJourney(j,{...draft,requestId:'second'},'2026-10-04T12:00:00Z');assert.equal(j.data.observations.length,2);
 j=recordJourney(j,{...draft,requestId:'edit',minutes:'7'},'2026-10-04T12:02:00Z',j.data.observations[0].id);
 assert.equal(j.data.observations[0].eventDate,start);assert.equal(j.data.history[0].minutes,5);
 assert.equal(recordJourney(j,{...draft,requestId:'edit'},'2026-10-04T12:00:00Z'),j);
});
test('expedition: thirty calendar days never fabricate completed actions',()=>{
 const e=newExpedition(start),j=begin(),rows=calendar(e,j,addDays(start,29));
 assert.equal(rows.length,30);assert.equal(rows.filter(r=>r.state==='done').length,0);
 assert.equal(weeklyReports(e,j,addDays(start,29)).reduce((n,w)=>n+w.missing,0),30);
 assert.equal(dayNumber(e,addDays(start,29)),30);assert.equal(expeditionDay({...e,demoDay:29},true),addDays(start,29));
});
test('expedition: one mission bounded by resources; rest and unknown time stay distinct',()=>{
 const e=newExpedition(start);let j=begin();
 assert.equal(dailyMission(j,e,start,true).minutes,5);
 j.data.schedule.minutes=7;assert.equal(dailyMission(j,e,start).minutes,7);
 j.data.schedule.days=[];assert.equal(dailyMission(j,e,start).planned,false);
 assert.equal(dailyMission(j,e,start).minutes,0);
 j=recordJourney(j,{...draft,outcome:'partial',minutes:''},start+'T12:00:00Z');
 const sum=horizon(e,j,start).summary;assert.equal(sum.unknownMinutes,1);assert.equal(sum.partial,1);assert.equal(sum.completed,0);
});
test('expedition: encounters and retrospective context are never action evidence',()=>{
 let e=newExpedition(start);const j=begin(),card=encounterFor(e,start);
 e=answerEncounter(e,start,card.choices[0],'Дополнение');e=updateContext(e,{...e.context,retrospective:'Помню предыдущий месяц'});
 assert.equal(horizon(e,j,start).summary.recorded,0);assert.equal(j.stage,1);
 assert.equal(answerEncounter(e,start,card.choices[0],'Дополнение'),e);
 e=answerEncounter(e,start,card.choices[1],'Исправлено');assert.equal(e.history.length,1);
 assert.throws(()=>answerEncounter(e,start,'Несуществующий ответ',''));
});
test('expedition: plan evidence spans current dates and revisions invalidate approval',()=>{
 let j=begin();j={...j,period:{start:'2027-01-01',today:'2027-01-03'}};
 j=recordJourney(j,draft,'2027-01-03T12:00:00Z');j=reflectJourney(j,'Попробую дальше');j=finishJourney(j,'gentle','2027-01-03T12:01:00Z');
 assert.deepEqual(j.data.approvedPlan!.evidenceIds,['obs-2027-01-03']);assert.equal(isStale(j.data),false);
 j=recordJourney(j,{...draft,requestId:'revised'},'2027-01-03T12:02:00Z');assert.equal(isStale(j.data),true);
 assert.equal(horizon(newExpedition('2027-01-01'),j,'2027-01-03').checkpoints.length,3);
});
test('expedition: storage is opt-in, preserves drafts, refuses demos and invalid data',()=>{
 const memory=store(),snapshot={version:1 as const,journey:begin(),expedition:newExpedition(start)};
 snapshot.journey.data.draft={...draft,note:'Незавершённый черновик'};
 assert.equal(saveExpedition(memory,snapshot,false),'memory');assert.equal(memory.data.size,0);
 assert.equal(saveExpedition(memory,snapshot,true),'saved');assert.equal(loadExpedition(memory).snapshot?.journey.data.draft?.note,'Незавершённый черновик');
 const previous=memory.getItem(EXPEDITION_KEY);assert.equal(saveExpedition(memory,{...snapshot,journey:{...snapshot.journey,demo:true}},true),'memory');assert.equal(memory.getItem(EXPEDITION_KEY),previous);
 memory.setItem(EXPEDITION_KEY,'{"version":88}');assert.equal(loadExpedition(memory).status,'error');
 forgetExpedition(memory);assert.equal(memory.data.size,0);
});
test('expedition: failures never report saved; dates and historical alias validated',()=>{
 const broken={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');},removeItem(){}};
 assert.equal(loadExpedition(broken).status,'error');assert.equal(saveExpedition(broken,{version:1,journey:begin(),expedition:newExpedition(start)},true),'error');
 assert.equal(validDay('2026-02-31'),false);assert.equal(validDay('not a date'),false);
 assert.equal(PLANETS.length,5);assert.deepEqual(Object.keys(WORLD_THEMES),PLANETS.map(p=>p.id));
 assert.equal(parseRoute('#planet/about'),'about');assert.equal(parseRoute('#companion'),'companion');
});
