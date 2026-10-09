import type { Journey } from './journey.ts';
import type { Expedition } from './expedition.ts';
import { validDay,ENCOUNTERS } from './expedition.ts';
import { loadSession,SESSION_KEY,CONSENT_KEY } from '../persistence.ts';
import type { SessionStore } from '../persistence.ts';
import { validMemoryWeek } from './navigator.ts';
import { validResearch } from './research.ts';

export const EXPEDITION_KEY='astra-expedition-v1';
export const EXPEDITION_CONSENT='astra-expedition-storage-consent-v1';
export type Snapshot={version:1;journey:Journey;expedition:Expedition};
export function saveExpedition(storage:SessionStore,snapshot:Snapshot,allowed:boolean):'memory'|'saved'|'error'{
 if(!allowed||snapshot.journey.demo)return 'memory';
 try{storage.setItem(EXPEDITION_KEY,JSON.stringify(snapshot));storage.setItem(EXPEDITION_CONSENT,'yes');return 'saved';}catch{return 'error';}
}
export function loadExpedition(storage:SessionStore):{snapshot:Snapshot|null;allowed:boolean;status:'memory'|'saved'|'error'}{
 try{
  if(storage.getItem(EXPEDITION_CONSENT)!=='yes')return {snapshot:null,allowed:false,status:'memory'};
  const raw=storage.getItem(EXPEDITION_KEY);if(!raw)return {snapshot:null,allowed:true,status:'memory'};
  if(raw.length>2000000)throw new Error('Too large');
  const s:Snapshot=JSON.parse(raw),j=s.journey,e=s.expedition;
  if(s.version!==1||!j||j.demo!==false||!Number.isInteger(j.stage)||j.stage<0||j.stage>4||typeof j.reflection!=='string'||j.reflection.length>500||!Array.isArray(j.reflectionHistory)||!j.reflectionHistory.every(x=>typeof x==='string'&&x.length<=500))throw new Error('Invalid journey');
  const data=loadSession({getItem:key=>key===CONSENT_KEY?'yes':key===SESSION_KEY?JSON.stringify(j.data):null,setItem(){},removeItem(){}});
  if(data.status!=='saved')throw new Error('Invalid data');
  if(!e||e.version!==1||!validDay(e.start)||!Number.isInteger(e.demoDay)||e.demoDay<0||e.demoDay>29||!e.context||!['why','support','experiment','resources','barrier','retrospective'].every(k=>typeof e.context[k as keyof typeof e.context]==='string'&&e.context[k as keyof typeof e.context].length<=500))throw new Error('Invalid expedition');
  for(const list of [e.encounters,e.history])if(!Array.isArray(list)||!list.every(a=>a&&validDay(a.day)&&a.source==='USER_STATEMENT'&&typeof a.note==='string'&&a.note.length<=500&&ENCOUNTERS.some(c=>c.id===a.id&&c.choices.some(choice=>choice===a.choice))))throw new Error('Invalid encounters');
  for(const list of [e.memoryWeeks,e.memoryHistory])if(list!==undefined&&(!Array.isArray(list)||list.length>400||!list.every(validMemoryWeek)))throw new Error('Invalid memories');
  if(e.memoryWeeks&&(e.memoryWeeks.length!==4||new Set(e.memoryWeeks.map(r=>r.week)).size!==4))throw new Error('Duplicate memories');
  if(e.memoryDraft!==undefined&&(!Array.isArray(e.memoryDraft)||e.memoryDraft.length!==4||!e.memoryDraft.every(r=>r&&Number.isInteger(r.week)&&r.week>=0&&r.week<4&&typeof r.note==='string'&&r.note.length<=500&&['sure','approximate','unknown'].includes(r.confidence))))throw new Error('Invalid memory draft');
  if(e.contextDraft!==undefined&&!['why','support','experiment','resources','barrier','retrospective'].every(k=>typeof e.contextDraft?.[k as keyof typeof e.contextDraft]==='string'&&e.contextDraft[k as keyof typeof e.contextDraft].length<=500))throw new Error('Invalid context draft');
  if(!j.data.observations.every(o=>validDay(o.eventDate))||new Set(j.data.observations.map(o=>o.id)).size!==j.data.observations.length)throw new Error('Invalid dates');
  if(e.research!==undefined&&!validResearch(e.research))throw new Error('Invalid research profile');
  j.data=data.state;delete j.period;
  return {snapshot:s,allowed:true,status:'saved'};
 }catch{return {snapshot:null,allowed:false,status:'error'};}
}
export function forgetExpedition(storage:SessionStore){storage.removeItem(EXPEDITION_CONSENT);storage.removeItem(EXPEDITION_KEY);}
