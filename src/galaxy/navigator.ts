import type { Expedition,MemoryWeek } from './expedition.ts';
import { addDays,dayNumber,dailyMission,horizon,validDay } from './expedition.ts';
import type { Journey } from './journey.ts';
import { isStale } from '../domain.ts';

// Adapted from archive v0.1 PROJECT_MEMORY / ARCHITECTURE, plus v0.2 UX rules.
export const NAVIGATOR_STEPS=[
  {planet:'Исток',id:'origin',title:'Что важно тебе',period:'Вход · без спешки',text:'Интересы, цель, ресурсы и удобный ритм. Прошлый месяц — только если хочется вспомнить.',action:'edit-goal'},
  {planet:'Аврора',id:'aurora',title:'Пробовать в жизни',period:'Около 30 дней',text:'Одна посильная проба в выбранный день. Минимальный вариант и отдых — часть пути.',action:'daily'},
  {planet:'Велир',id:'velir',title:'Замечать опыт',period:'После проб · итоги недели',text:'Что получилось, что мешало, что хочется повторить. Честный пропуск не обнуляет путь.',action:'discoveries'},
  {planet:'Нерея',id:'nereya',title:'Сравнить варианты',period:'По накопленному опыту',text:'Основания, ограничения и неизвестное видны. Ни один вариант не выбирается за тебя.',action:'compare-plans'},
  {planet:'Солис',id:'solis',title:'Взять план с собой',period:'Следующие 90 дней',text:'Подробная ближайшая неделя, критерий результата и гибкие точки пересмотра.',action:'passport'},
] as const;

export function saveMemoryWeeks(e:Expedition,rows:{week:number;note:string;confidence:MemoryWeek['confidence']}[],now:string):Expedition{
  if(rows.length!==4||new Set(rows.map(r=>r.week)).size!==4||!Number.isFinite(Date.parse(now)))throw new Error('Нужны четыре недели и корректная дата записи.');
  const weeks=rows.map(r=>{
    if(!Number.isInteger(r.week)||r.week<0||r.week>3||typeof r.note!=='string'||r.note.length>500||!['sure','approximate','unknown'].includes(r.confidence))throw new Error('Уточни воспоминание: до 500 символов и степень уверенности.');
    return {...r,note:r.note.trim(),from:addDays(e.start,-28+r.week*7),to:addDays(e.start,-22+r.week*7),recordedAt:now,source:'RETROSPECTIVE_USER_STATEMENT' as const};
  });
  const old=e.memoryWeeks??[];
  const changed=weeks.filter(row=>{const previous=old.find(o=>o.week===row.week);return !previous||previous.note!==row.note||previous.confidence!==row.confidence;});
  if(!changed.length)return {...e,memoryDraft:undefined};
  return {...e,memoryWeeks:weeks.map(row=>changed.includes(row)?row:old.find(o=>o.week===row.week)!),memoryHistory:[...(e.memoryHistory??[]),...old.filter(o=>changed.some(row=>row.week===o.week))],memoryDraft:undefined};
}
export function validMemoryWeek(row:MemoryWeek){return !!row&&Number.isInteger(row.week)&&row.week>=0&&row.week<4&&typeof row.note==='string'&&row.note.length<=500&&['sure','approximate','unknown'].includes(row.confidence)&&validDay(row.from)&&validDay(row.to)&&row.from<=row.to&&typeof row.recordedAt==='string'&&Number.isFinite(Date.parse(row.recordedAt))&&row.source==='RETROSPECTIVE_USER_STATEMENT';}

export function navigatorStatus(e:Expedition,j:Journey,today:string){
  const day=dayNumber(e,today),h=horizon(e,j,today);
  const row=j.data.observations.find(o=>o.eventDate===today&&!o.retrospective&&o.subjectId===j.data.subjectId);
  const mission=dailyMission(j,e,today);
  let action='daily',label='Открыть сегодняшнюю пробу',reason='Одна маленькая проверка в реальной жизни.';
  if(j.stage===0){action='edit-goal';label='Выбрать цель и ритм';reason='Сначала определим, что важно и сколько времени действительно есть.';}
  else if(row){action=j.stage===2?'reflect':'passport';label=j.stage===2?'Записать наблюдение':'Посмотреть мой маршрут';reason='Отметка за сегодня уже есть. Второе обязательное действие не требуется.';}
  else if(j.data.schedule.minutes<5||!j.data.schedule.days.length){action='edit-goal';label='Найти удобное время';reason='Не назначаем задачи без свободного окна.';}
  else if(!mission.planned&&!j.demo){action='encounter';label='Короткая встреча с Лирой';reason='Сегодня свободный день по твоему графику. Можно ничего не делать.';}
  return {day,summary:h.summary,row,mission,action,label,reason,period:{from:e.start,to:today}};
}

export function buildNavigatorReport(e:Expedition,j:Journey,today:string){
  const h=horizon(e,j,today),p=h.plan,summary=h.summary;
  const sourceRows=j.data.observations.filter(o=>summary.ids.includes(o.id));
  const attempts=summary.completed+summary.partial;
  return {
    version:1,synthetic:true,generatedForDate:today,
    title:'Моя инструкция на следующий этап',status:p?(isStale(j.data)?'needs-review':'approved'):'draft',
    goal:j.data.goal,roles:{main:j.data.goal.title,support:e.context.support||null,experiment:e.context.experiment||null},
    criterion:j.data.goal.criterion,why:e.context.why||j.data.goal.why,
    resources:e.context.resources||null,barriers:e.context.barrier||null,
    period:{from:e.start,to:today},summary,attempts,
    evidence:sourceRows.map(o=>({id:o.id,date:o.eventDate,outcome:o.outcome,minutes:o.minutes,revision:o.revision,source:o.source,note:o.note})),
    memoryWeeks:e.memoryWeeks??[],encounters:e.encounters,
    alternatives:[
      {title:'Продолжить бережно',benefit:'Больше места для отдыха и проверки интереса.',tradeoff:'Меньше шагов за тот же календарный срок.',action:'gentle'},
      {title:'Проверить обычный ритм',benefit:'Использовать выбранные окна, не выходя за лимит времени.',tradeoff:'Требует больше ресурса; его наличие подтверждаешь ты.',action:'steady'},
      {title:'Изменить направление или взять паузу',benefit:'Пересмотреть желание и ограничения без штрафа.',tradeoff:'Новый вариант сначала потребует небольшой пробы.',action:'edit-goal'},
    ],
    nextWeek:p?.items??[],weeklyMinutes:p?.totalMinutes??null,budget:p?.cost??null,
    firstStep:p?.items[0]??null,reviewOn:h.reviewOn,checkpoints:h.checkpoints,
    contradictions:[...(summary.skipped?['Есть пропуски: по ним нельзя определить причину или отсутствие интереса.']:[]),...(summary.completed&&summary.partial?['Есть завершённые и частичные пробы — опыт неоднороден.']:[])],
    unknowns:[...(attempts<3?['Реальных проб пока мало для устойчивых выводов.']:[]),'Неизвестно, сохранится ли интерес в других условиях.','Самоотчёты не подтверждены независимой проверкой.'],
    recovery:'Не догоняй пропущенное двойной нагрузкой. Продолжи в удобный день, выбери минимальную версию или измени график.',
    sourceLabel:'Правила ASTRA v0.3, подтверждённые ответы и история выполненных проб.',
    limits:h.limits,
  };
}
