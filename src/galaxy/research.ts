import { validDay,addDays } from './expedition.ts';

export type Birth={date:string;accuracy:'exact'|'approximate'|'unknown';time:string;until:string;place:string;note:string};
export type Wishes={original:string;confirmed:string;preserve:string;avoid:string};
export type Rhythm={kind:'fixed'|'shifts'|'unknown';windows:string;resources:string;limits:string};
export type ResearchAnswer={id:string;day:string;kind:'question'|'game'|'trial';prompt:string;options?:string[];choices:string[];note:string;source:'USER_STATEMENT'|'TASK_RESPONSE'|'SELF_REPORTED_ACTION';revision:number;recordedAt:string};
export type ResearchMemory={week:number;from:string;to:string;note:string;certainty:string;source:'RETROSPECTIVE_USER_STATEMENT'};
export type ResearchState={version:1;step:0|1|2|3|4;complete:boolean;birth:Birth|null;birthDeferred:boolean;wishes:Wishes|null;rhythm:Rhythm|null;memories:ResearchMemory[];memoryDone:boolean;answers:ResearchAnswer[];history:ResearchAnswer[];profileHistory:{field:string;value:unknown;recordedAt:string}[];drafts:Record<string,Record<string,string|string[]>>;forecastMode:'open'|'blind';trialAccepted:string|null};
export const blankBirth:Birth={date:'',accuracy:'unknown',time:'',until:'',place:'',note:''};
export const blankWishes:Wishes={original:'',confirmed:'',preserve:'',avoid:''};
export const blankRhythm:Rhythm={kind:'unknown',windows:'',resources:'',limits:''};
export function newResearch():ResearchState{return {version:1,step:0,complete:false,birth:null,birthDeferred:false,wishes:null,rhythm:null,memories:[],memoryDone:false,answers:[],history:[],profileHistory:[],drafts:{},forecastMode:'blind',trialAccepted:null};}
export function canRevealFocus(s:ResearchState,day:string){return s.forecastMode==='open'||s.answers.some(a=>a.day===day);}
export function validateBirth(input:Birth,today:string):Birth{
  if(!validDay(input.date)||input.date>today)throw new Error('Укажи существующую дату рождения, не позже сегодняшней.');
  if(!['exact','approximate','unknown'].includes(input.accuracy))throw new Error('Выбери точность времени.');
  if(!input.place.trim()||input.place.length>200||input.note.length>500)throw new Error('Укажи город, регион и страну. Дополнение — до 500 символов.');
  const time=(v:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if(input.accuracy!=='unknown'&&!time(input.time))throw new Error('Укажи время рождения или выбери «Не знаю».');
  if(input.accuracy==='approximate'&&input.until&&(!time(input.until)||input.until<input.time))throw new Error('Конец интервала должен быть не раньше начала.');
  return {...input,place:input.place.trim(),note:input.note.trim(),time:input.accuracy==='unknown'?'':input.time,until:input.accuracy==='approximate'?input.until:''};
}
export function commitProfile<K extends 'birth'|'wishes'|'rhythm'>(s:ResearchState,key:K,value:NonNullable<ResearchState[K]>,now:string):ResearchState{
  const changed=JSON.stringify(s[key])!==JSON.stringify(value);
  return {...s,[key]:value,profileHistory:changed&&s[key]?[...s.profileHistory,{field:key,value:s[key],recordedAt:now}]:s.profileHistory,drafts:{...s.drafts,[key]:{}}};
}
export function nextResearchRoute(s:ResearchState){if(s.complete)return 'today';if(!s.birth&&s.step>1)return 'birth';return (['welcome','birth','wishes','rhythm','review'] as const)[s.step];}
export function previousMonthWeeks(today:string){
  const start=today.slice(0,8)+'01',last=addDays(start,-1),first=last.slice(0,8)+'01';
  return [0,1,2,3].map(week=>({week,from:addDays(first,week*7),to:week===3?last:addDays(first,week*7+6)}));
}
export function commitMemories(s:ResearchState,rows:ResearchMemory[]):ResearchState{
  if(rows.length!==4||rows.some((r,i)=>r.week!==i||!validDay(r.from)||!validDay(r.to)||r.to<r.from||r.note.length>500||!['Помню уверенно','Примерно','Не помню','Ничего заметного'].includes(r.certainty)||r.source!=='RETROSPECTIVE_USER_STATEMENT'))throw new Error('Проверь четыре недели и точность воспоминаний.');
  const changed=s.memories.length&&JSON.stringify(s.memories)!==JSON.stringify(rows);
  return {...s,memories:rows,memoryDone:true,profileHistory:changed?[...s.profileHistory,{field:'memories',value:s.memories,recordedAt:new Date().toISOString()}]:s.profileHistory,drafts:{...s.drafts,memories:{}}};
}
const QUESTIONS=[
  {title:'Что хочется сохранить?',prompt:'Когда думаешь о своих желаниях, что особенно важно не потерять?',choices:['Стабильность','Время с близкими','Свободу в графике','Удовольствие от хобби','Свой вариант','Пока не знаю','Пропустить']},
  {title:'Что привлекает в желании?',prompt:'Что сейчас притягивает больше: процесс, результат или возможность что-то изменить?',choices:['Сам процесс','Конкретный результат','Новый опыт','Больше самостоятельности','Свой вариант','Пока не знаю','Пропустить']},
  {title:'Когда не получилось сразу',prompt:'Вспомни похожую ситуацию: что ты обычно делал, если первые результаты не радовали?',choices:['Менял способ','Просил помощи','Возвращался позже','Терял интерес','По-разному','Не помню','Пропустить']},
  {title:'Что помешало?',prompt:'Если хотелось заняться интересом, но не получилось, что мешало в конкретный раз?',choices:['Не было времени','Неясен первый шаг','Возникли сомнения','Изменились приоритеты','Свой вариант','Не помню','Пропустить']},
] as const;
function proposedResearchCard(s:ResearchState,day:string){
  const n=s.answers.filter(a=>a.day<day).length;
  if(n%4===1)return {id:'choice-evening',kind:'game' as const,title:'Игра «Свободный вечер»',prompt:'Выбери до двух вариантов, на которые тебе действительно хотелось бы потратить свободный вечер.',choices:[...(s.wishes?.confirmed.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,5)??[]),'Отдохнуть','Пока не знаю','Пропустить'],hint:'Нет правильного выбора. Пример: можно выбрать интерес и отдых. Это одна ситуация, не тест личности.'};
  if(n%4===3)return {id:'voluntary-trial',kind:'trial' as const,title:'Маленькая проба — по желанию',prompt:'Хочешь уделить до пяти минут одному своему интересу и заметить, нравится ли сам процесс?',choices:['Сделал','Попробовал частично','Не стал пробовать','Перенести','Не подходит','Пропустить'],hint:'Сам выбери безопасное бесплатное действие: набросок, пример или несколько строк. Без публикаций, покупок и обязательств. Это не выбор профессии.'};
  const q=QUESTIONS[Math.floor(n/2)%QUESTIONS.length];
  return {...q,id:'question-'+Math.floor(n/2)%QUESTIONS.length,kind:'question' as const,hint:'Можно выбрать ответ и добавить свой пример. Одного ответа недостаточно для устойчивого вывода.'};
}
export function researchCard(s:ResearchState,day:string){
  const card=proposedResearchCard(s,day),old=s.answers.find(a=>a.day===day);
  return old?{...card,kind:old.kind,prompt:old.prompt,choices:old.options??card.choices}:card;
}
export function saveResearchAnswer(s:ResearchState,day:string,choices:string[],note:string,now:string):ResearchState{
  if(!s.complete||!s.memoryDone)throw new Error('Сначала закончи знакомство и реши, хочешь ли вспоминать прошлый месяц.');
  const card=researchCard(s,day),unique=[...new Set(choices)];
  if(!unique.length||unique.length>(card.kind==='game'?2:1)||unique.some(x=>!(card.choices as readonly string[]).includes(x))||note.length>500)throw new Error('Выбери подходящий ответ. В игре можно выбрать не больше двух; дополнение — до 500 символов.');
  if(unique.length>1&&unique.some(x=>['Пока не знаю','Пропустить'].includes(x)))throw new Error('«Не знаю» и «Пропустить» выбери отдельно от других ответов.');
  if(card.kind==='trial'&&unique.some(x=>['Сделал','Попробовал частично'].includes(x))&&s.trialAccepted!==day&&!s.answers.some(a=>a.day===day&&a.source==='SELF_REPORTED_ACTION'))throw new Error('Сначала согласись на пробу. Она не считается выполненной автоматически.');
  const old=s.answers.find(a=>a.day===day),source=card.kind==='game'?'TASK_RESPONSE':card.kind==='trial'&&['Сделал','Попробовал частично'].includes(unique[0])?'SELF_REPORTED_ACTION':'USER_STATEMENT';
  if(old&&JSON.stringify(old.choices)===JSON.stringify(unique)&&old.note===note.trim())return s;
  const row:ResearchAnswer={id:old?.id??'research-'+day,day,kind:card.kind,prompt:card.prompt,options:[...card.choices],choices:unique,note:note.trim(),source,revision:(old?.revision??0)+1,recordedAt:now};
  return {...s,answers:[...s.answers.filter(a=>a.day!==day),row],history:old?[...s.history,old]:s.history,drafts:{...s.drafts,research:{}}};
}
export function researchProgress(s:ResearchState){return !s.complete?0:!s.memoryDone?1:s.answers.length<3?2:s.answers.length<7?3:4;}
// Validate additions without rejecting or rewriting older expedition snapshots.
export function validResearch(value:unknown):value is ResearchState{
  if(!value||typeof value!=='object')return false;
  const s=value as ResearchState,short=(v:unknown,n=2000)=>typeof v==='string'&&v.length<=n;
  if(s.version!==1||![0,1,2,3,4].includes(s.step)||typeof s.complete!=='boolean'||typeof s.birthDeferred!=='boolean'||typeof s.memoryDone!=='boolean'||!['open','blind'].includes(s.forecastMode)||(s.trialAccepted!==null&&!validDay(s.trialAccepted)))return false;
  if(s.birth!==null){try{validateBirth(s.birth,'9999-12-31');}catch{return false;}}
  if(s.wishes!==null&&!['original','confirmed','preserve','avoid'].every(k=>short(s.wishes?.[k as keyof Wishes])))return false;
  if(s.rhythm!==null&&(!['fixed','shifts','unknown'].includes(s.rhythm.kind)||!['windows','resources','limits'].every(k=>short(s.rhythm?.[k as keyof Rhythm]))))return false;
  if(!Array.isArray(s.memories)||s.memories.length>4||s.memories.some(r=>!r||!validDay(r.from)||!validDay(r.to)||!short(r.note,500)||!short(r.certainty,50)||r.source!=='RETROSPECTIVE_USER_STATEMENT'))return false;
  for(const rows of [s.answers,s.history])if(!Array.isArray(rows)||rows.length>1000||rows.some(r=>!r||!validDay(r.day)||!short(r.id,80)||!short(r.prompt)||!short(r.note,500)||!['question','game','trial'].includes(r.kind)||!['USER_STATEMENT','TASK_RESPONSE','SELF_REPORTED_ACTION'].includes(r.source)||!Array.isArray(r.choices)||r.choices.length>2||!r.choices.every(x=>short(x,2000))||!Number.isInteger(r.revision)||r.revision<1||!Number.isFinite(Date.parse(r.recordedAt))))return false;
  if(new Set(s.answers.map(a=>a.day)).size!==s.answers.length)return false;
  if([...s.answers,...s.history].some(r=>r.options!==undefined&&(!Array.isArray(r.options)||r.options.length>15||!r.options.every(v=>short(v,2000)))))return false;
  if(!s.drafts||typeof s.drafts!=='object'||Object.keys(s.drafts).length>15||Object.values(s.drafts).some(d=>!d||typeof d!=='object'||Object.keys(d).length>30||Object.values(d).some(v=>!short(v)&&(!Array.isArray(v)||v.length>5||!v.every(x=>short(x))))))return false;
  if(!Array.isArray(s.profileHistory)||s.profileHistory.length>500)return false;
  if(s.complete&&(!s.wishes||!s.rhythm||(!s.birth&&!s.birthDeferred)))return false;
  return true;
}
