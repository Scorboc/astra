import type { Journey } from './journey.ts';
import type { Track } from '../domain.ts';
import type { ResearchState } from './research.ts';
import { summarize } from '../domain.ts';

export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function addDays(day:string,count:number){return new Date(Date.parse(day)+count*86400000).toISOString().slice(0,10);}
export function validDay(day:unknown):day is string{return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
export type Context={why:string;support:string;experiment:string;resources:string;barrier:string;retrospective:string};
export type Encounter={id:string;day:string;choice:string;note:string;source:'USER_STATEMENT'};
export type MemoryWeek={week:number;note:string;confidence:'sure'|'approximate'|'unknown';from:string;to:string;recordedAt:string;source:'RETROSPECTIVE_USER_STATEMENT'};
export type Expedition={version:1;start:string;demoDay:number;context:Context;encounters:Encounter[];history:Encounter[];memoryWeeks?:MemoryWeek[];memoryHistory?:MemoryWeek[];memoryDraft?:{week:number;note:string;confidence:MemoryWeek['confidence']}[];contextDraft?:Context;research?:ResearchState};
export function newExpedition(start=localDay()):Expedition{return {version:1,start,demoDay:0,context:{why:'',support:'',experiment:'',resources:'',barrier:'',retrospective:''},encounters:[],history:[]};}
export function expeditionDay(e:Expedition,demo:boolean,now=localDay()){return demo?addDays(e.start,e.demoDay):now;}
export function dayNumber(e:Expedition,today:string){return Math.max(1,Math.floor((Date.parse(today)-Date.parse(e.start))/86400000)+1);}
export const ENCOUNTERS=[
  {id:'start',name:'Лира · бортовой навигатор',title:'Что для тебя сейчас важнее?',choices:['Найти направление','Проверить свою идею','Вернуть посильный ритм','Пока не знаю'],reply:'Начнём с одной безопасной пробы. Ответ задаёт тему разговора, а не тип личности.'},
  {id:'energy',name:'Корабль «Тихий ход»',title:'Какой запас сил на сегодня?',choices:['Есть силы на обычный шаг','Выберу минимальный шаг','Нужен отдых','Не знаю'],reply:'Можно уменьшить действие или отдохнуть. Пропуск не сжигает маршрут и ничего не говорит о способностях.'},
  {id:'friction',name:'Станция наблюдений',title:'Что больше всего мешало?',choices:['Не хватило времени','Было непонятно, с чего начать','Не подошёл способ','Ничего из этого'],reply:'Это гипотеза о препятствии. Попробуй изменить одно условие; одного случая недостаточно для вывода.'},
  {id:'interest',name:'Исследовательский корабль «Эхо»',title:'К чему хочется вернуться?',choices:['К тому же действию','К другой форме этой идеи','К другому интересу','Пока недостаточно опыта'],reply:'Твоё желание важнее автоматической рекомендации. Его можно проверить следующим небольшим действием.'},
  {id:'review',name:'Лира · встреча у нового мира',title:'Что возьмём в следующий этап?',choices:['Продолжить в том же темпе','Уменьшить нагрузку','Изменить подход','Взять паузу'],reply:'Оставим выбранный тобой вариант и дату пересмотра. План — рабочая версия, не обещание результата.'},
] as const;
export function encounterFor(e:Expedition,today:string){return ENCOUNTERS[(dayNumber(e,today)-1)%ENCOUNTERS.length];}
export function answerEncounter(e:Expedition,today:string,choice:string,note:string):Expedition{
  const card=encounterFor(e,today);
  if(!card.choices.some(c=>c===choice)||note.length>500)throw new Error('Выбери ответ; дополнение — до 500 символов.');
  const old=e.encounters.find(a=>a.day===today&&a.id===card.id);
  const row:Encounter={id:card.id,day:today,choice,note:note.trim(),source:'USER_STATEMENT'};
  if(old&&old.choice===choice&&old.note===row.note)return e;
  return {...e,encounters:[...e.encounters.filter(a=>!(a.day===today&&a.id===card.id)),row],history:old?[...e.history,old]:e.history};
}
export function updateContext(e:Expedition,context:Context):Expedition{
  if(Object.values(context).some(v=>typeof v!=='string'||v.length>500))throw new Error('Каждое дополнение — до 500 символов.');
  return {...e,context:Object.fromEntries(Object.entries(context).map(([k,v])=>[k,v.trim()])) as Context};
}
const MISSIONS:Record<Track,readonly [string,string][]>= {
 creative:[['Выбери одну тему','Запиши одну идею, которую хочется попробовать.'],['Сделай черновик','Один небольшой набросок без оценки качества.'],['Измени один элемент','Попробуй другой ракурс, начало или материал.'],['Посмотри свежим взглядом','Отметь один удачный момент и один вопрос.'],['Проверь понятность','Если комфортно, покажи маленький фрагмент знакомому; без публикации.'],['Выбери продолжение','Реши: продолжить, изменить или отложить.']],
 learning:[['Сформулируй вопрос','Один конкретный вопрос вместо целой области.'],['Разбери пример','Один пример из доступного учебного материала.'],['Объясни своими словами','Три предложения без подсказки.'],['Проверь пробел','Найди один момент, который пока неясен.'],['Сделай похожее самостоятельно','Один посильный пример и отметка о трудности.'],['Вернись к вопросу','Что стало понятнее, а что ещё нужно проверить?']],
 business:[['Назови проблему','Кому и в какой ситуации может быть полезна идея?'],['Подготовь нейтральный вопрос','Спроси о прошлом опыте, не уговаривая купить.'],['Найди существующую альтернативу','Запиши, как проблему решают сейчас. Наличие предложения не доказывает продажи.'],['Запиши проверяемую гипотезу','Какое наблюдение заставит тебя изменить мнение?'],['Подготовь бесплатную проверку','Маленький макет или вопрос; никаких оплат и обязательств.'],['Отдели факты от ожиданий','Интерес не равен готовности платить, выручка не равна прибыли.']],
};
export function dailyMission(j:Journey,e:Expedition,today:string,small=false){
  const weekday=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
  const planned=j.data.schedule.days.includes(weekday)&&j.data.schedule.minutes>=5;
  const previous=j.data.observations.filter(o=>o.eventDate<today&&!o.retrospective&&o.outcome!=='skipped').length;
  const task=MISSIONS[j.data.goal.track][previous%6];
  return {planned,title:task[0],result:task[1],minutes:planned?Math.min(small?5:15,j.data.schedule.minutes):0,day:dayNumber(e,today)};
}
export function calendar(e:Expedition,j:Journey,today:string){return Array.from({length:30},(_,i)=>{
  const date=addDays(e.start,i),row=j.data.observations.find(o=>o.eventDate===date&&!o.retrospective);
  const scheduled=j.data.schedule.days.includes((new Date(date+'T12:00:00Z').getUTCDay()+6)%7)&&j.data.schedule.minutes>=5;
  return {date,day:i+1,state:row?.outcome??(date>today?'future':scheduled?'unrecorded':'rest'),current:date===today};
});}
export function weeklyReports(e:Expedition,j:Journey,today:string){return [0,7,14,21,28].filter(n=>addDays(e.start,n)<=today).map(n=>{
  const from=addDays(e.start,n),to=[addDays(e.start,Math.min(n+6,29)),today].sort()[0];
  return {from,to,...summarize(j.data.observations,from,to,j.data.subjectId)};
});}
export function horizon(e:Expedition,j:Journey,today:string){
  const approved=j.data.approvedPlan;
  const anchor=approved?.approvedAt?.slice(0,10)??today;
  return {goal:j.data.goal,context:e.context,summary:summarize(j.data.observations,e.start,today,j.data.subjectId),plan:approved,
    reviewOn:addDays(anchor,7),checkpoints:[30,60,90].map((day,i)=>({day,date:addDays(anchor,day),question:['Что из опыта хочется продолжить?','Какие условия работают, какие изменить?','Продолжить, сменить направление или завершить?'][i]})),
    alternatives:['Продолжить выбранную цель бережно','Проверить другой подход к той же цели','Сделать паузу и пересмотреть цель'],
    limits:['Самоотчёты, не независимая проверка.','Воспоминания и ответы помощнику не считаются выполненными пробами.','Нет оценки способностей, судьбы или вероятности успеха.','Маршрут собирается из подтверждённых ответов, ограничений и выполненных проб.']};
}
