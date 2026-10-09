import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleAccountSnapshot} from '../src/galaxy/example-account.ts';
import {validResearch} from '../src/galaxy/research.ts';
import {researchStats} from '../src/galaxy/research-dashboard.ts';
import {monthReady,monthEvidence} from '../src/galaxy/month-review.ts';
import {ensureExampleMonth,MONTH_BACKUP} from '../src/galaxy/example-upgrade.ts';
import {EXPEDITION_KEY,loadExpedition} from '../src/galaxy/expedition-storage.ts';
import {createAccounts,accountStore} from '../src/galaxy/accounts.ts';
import {exampleNatal,calculateNatal} from '../src/galaxy/natal.ts';
import {MakeTime,Vector,RotateVector,Rotation_ECT_EQD,Rotation_EQD_HOR,Observer} from 'astronomy-engine';
const day='2026-10-06';
function storage(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};}
test('30-day fixture retains varied outcomes, revision and full notes',()=>{
 const s=exampleAccountSnapshot(day).expedition.research!;assert.ok(validResearch(s));
 assert.deepEqual(researchStats(s),{days:30,questions:15,games:8,completed:3,partial:2,skipped:2});
 assert.equal(s.answers[0].day,'2026-09-07');assert.equal(s.history.length,1);
 assert.ok(s.answers.every(a=>a.note.length>90&&a.note.length<=500));
 assert.equal(s.answers.filter(a=>a.choices.includes('Перенести')).length,1);
});
test('month release uses calendar duration, not perfect attendance',()=>{
 const s=exampleAccountSnapshot(day).expedition.research!;
 assert.equal(monthReady(s,'2026-10-05'),false);assert.equal(monthReady(s,day),true);
 assert.equal(monthReady({...s,answers:[s.answers[0]]},day),true);
});
test('evidence is independent of natal data and preserves dissent',()=>{
 const s=exampleAccountSnapshot(day).expedition.research!;
 assert.deepEqual(monthEvidence(s),monthEvidence({...s,birth:null}));
 assert.ok(monthEvidence(s).changed.length>0);
 assert.ok(s.answers.some(a=>a.note.includes('повторяемость вопросов')));
});
test('example migration backs up once, persists and never resets subsequent edits',()=>{
 const store=storage();store.setItem(EXPEDITION_KEY,'old snapshot');ensureExampleMonth(store,day);
 assert.equal(store.getItem(MONTH_BACKUP),'old snapshot');assert.equal(loadExpedition(store).snapshot?.expedition.research?.answers.length,30);
 const edited=store.getItem(EXPEDITION_KEY)!.replace('Александр','Другое имя');store.setItem(EXPEDITION_KEY,edited);
 ensureExampleMonth(store,'2026-10-07');assert.equal(store.getItem(EXPEDITION_KEY),edited);
});
test('example migration fails safely when backup cannot be written',()=>{
 const store=storage();store.setItem(EXPEDITION_KEY,'existing');
 assert.throws(()=>ensureExampleMonth({...store,setItem(){throw Error('quota');}},day));
 assert.equal(store.getItem(EXPEDITION_KEY),'existing');
});
test('local test login 1/1 and account storage separation',async()=>{
 const store=storage(),session=storage(),a=createAccounts(store,session);
 await assert.rejects(a.login('1','wrong'));const user=await a.login('1','1');a.activate(user);
 assert.equal(createAccounts(store,session).current()?.login,'1');
 const other=await a.register('other-test','example-pass-123','Другой пример');
 ensureExampleMonth(accountStore(store,user.id),day);
 assert.equal(loadExpedition(accountStore(store,other.id)).snapshot,null);
 await assert.rejects(a.register('OTHER-TEST','example-pass-123','Другой'));
 a.logout();assert.equal(a.current(),null);
});
test('natal exact fixture produces finite 10 bodies and 12 equal houses; modified data not substituted',()=>{
 const b=exampleAccountSnapshot(day).expedition.research!.birth!,n=exampleNatal(b)!;
 assert.equal(n.utc,'1992-05-14T05:30:00.000Z');assert.equal(n.planets.length,10);assert.equal(n.houses.length,12);
 assert.ok(n.planets.every(p=>p.longitude>=0&&p.longitude<360&&p.house>=1&&p.house<=12));
 assert.equal(exampleNatal({...b,time:'10:00'}),null);
 assert.throws(()=>calculateNatal('bad',55,49));
});
test('computed ascendant lies on eastern horizon',()=>{
 const n=exampleNatal(exampleAccountSnapshot(day).expedition.research!.birth)!;
 const t=MakeTime(new Date(n.utc)),a=n.asc*Math.PI/180;
 const eq=RotateVector(Rotation_ECT_EQD(t),new Vector(Math.cos(a),Math.sin(a),0,t));
 const hor=RotateVector(Rotation_EQD_HOR(t,new Observer(n.latitude,n.longitude,0)),eq);
 assert.ok(Math.abs(hor.z)<1e-9);assert.ok(hor.y<0);
});
