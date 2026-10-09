import type { ResearchState, ResearchAnswer } from './research.ts';
import { nextResearchRoute } from './research.ts';
import { researchStats, answerStatus } from './research-dashboard.ts';

export const viewKey='astra.interface.observatory.v1';
export const useObservatory=(saved:string|null)=>saved!=='classic';
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const link=(route:string,label:string,primary=false)=>`<a class="${primary?'primary wide':'text-button'}" href="#${route}">${label}</a>`;
const evidence=(a:ResearchAnswer)=>`<article class="atlas-record"><p class="atlas-source">${esc(a.day)} · ${a.kind==='game'?'Ответ в игре':a.kind==='trial'?'Самоотчёт о пробе':'Со слов участника'} · версия ${a.revision}</p><h4>${esc(a.prompt)}</h4><p>${esc(a.choices.join(' · '))}</p>${a.note?`<p class="atlas-note">${esc(a.note)}</p>`:''}${link('research/'+a.day,'Открыть и уточнить запись')}</article>`;

export function observatoryToday(s:ResearchState,today:string){
 const rows=[...s.answers].sort((a,b)=>b.day.localeCompare(a.day)),last=rows[0],done=rows.find(a=>a.day===today);
 const route=!s.complete?nextResearchRoute(s):!s.memoryDone?'memories':done?'results':'research';
 const label=!s.complete?'Продолжить знакомство':!s.memoryDone?'К первому исследованию':done?'Посмотреть наблюдения':Object.keys(s.drafts.research??{}).length?'Продолжить ответ':'Открыть сегодняшний вопрос';
 const stage=!s.complete?'Знакомство':!s.memoryDone?'Опыт до начала исследования':done?'Ответ сохранён':'Наблюдение за собой';
 return `<section class="observatory-next" aria-label="Текущий шаг"><p class="atlas-source">${stage}</p><p>${!s.complete?'Сначала узнаем твои желания и обстоятельства. Готового маршрута здесь пока нет.':done?'На сегодня достаточно. Можно посмотреть записи или вернуться в другой день.':'Один небольшой шаг. Можно ответить «Пока не знаю» или пропустить — догонять ничего не нужно.'}</p>${link(route,label,true)}</section>
 ${last?`<details class="observatory-context"><summary>На чём остановились · ${esc(last.day)}</summary>${evidence(last)}<p>Это сохранённый ответ, а не вывод о твоей личности.</p></details>`:''}
 <nav class="observatory-links" aria-label="Другие возможности">${done?link('research','Уточнить сегодняшний ответ'):link('results','Мои наблюдения')}${link('journal','Записи по дням')}${link('galaxy','Вернуться в космос')}</nav>
 <details><summary>Как устроено исследование</summary><p>Желания и условия → вопросы и добровольные пробы → наблюдения с основаниями → твой выбор следующего шага. Астрологические трактовки рассматриваем отдельно от записанного опыта. Срок в 30 дней сам по себе не делает вывод надёжным.</p></details>`;
}

export function observationAtlas(s:ResearchState){
 const n=researchStats(s),rows=[...s.answers].sort((a,b)=>b.day.localeCompare(a.day));
 const trials=rows.filter(a=>a.kind==='trial');
 const groups=new Map<string,ResearchAnswer[]>();
 for(const a of rows.filter(a=>a.kind==='question'&&!a.choices.includes('Пропустить'))){groups.set(a.prompt,[...(groups.get(a.prompt)??[]),a]);}
 const changes=[...groups].filter(([,a])=>new Set(a.map(r=>r.choices.join('|'))).size>1);
 return `<section class="atlas-intro"><p>Что записано, на чём это основано и что ещё предстоит выяснить.</p>${link(s.complete?'research':nextResearchRoute(s),s.complete?'К сегодняшнему шагу':'Продолжить знакомство',true)}</section>
 <section class="research-infographic" aria-label="Сохранённые данные, не оценка личности"><div><strong>${n.days}</strong><span>дней с записями</span></div><div><strong>${n.completed}</strong><span>завершённых проб</span></div><div><strong>${n.partial}</strong><span>частичных проб</span></div></section>
 ${rows.length?`<section class="atlas-observations"><h3>Наблюдения и основания</h3>
 <details><summary>Что происходило с пробами · ${trials.length} записей</summary><p>${n.completed} завершённых и ${n.partial} частичных из ${trials.length} записей о пробах. Остальные статусы показаны ниже. Всё это — отметки человека, не независимая проверка.</p>${trials.map(a=>`<p><strong>${answerStatus(a)}</strong></p>${evidence(a)}`).join('')||'<p>Проб пока нет. Игровые ответы не засчитываются как действия.</p>'}</details>
 <details><summary>Где менялись выбранные ответы · тем: ${changes.length}</summary><p>Сравниваем варианты в одинаковых вопросах. Изменение — повод уточнить контекст, не противоречие в характере.</p>${changes.map(([q,aa])=>`<h4>${esc(q)}</h4>${aa.map(evidence).join('')}`).join('')||'<p>Изменения выбранных вариантов пока не найдены. Это не значит, что все свободные дополнения согласуются между собой.</p>'}</details>
 <details><summary>Последняя запись · ${esc(rows[0].day)}</summary>${evidence(rows[0])}</details></section>`:'<p>Пока нет сохранённых наблюдений. Начни с одного ответа — готовых выводов без него здесь не будет.</p>'}
 <details><summary>Что ещё нельзя заключить</summary><p>Число записей не показывает способности, предназначение или устойчивость интереса. Свободные ответы ещё не прошли смысловую проверку; повторяющиеся вопросы могли влиять на ответы. Неизвестное не считаем отрицательным результатом.</p></details>
 <details><summary>Астрология — отдельный слой</summary><p>Натальная карта и символические трактовки не являются подтверждением этих наблюдений. Сохранённых персональных прогнозов и их сопоставлений пока нет.</p>${link('astrology','Открыть астрологию')}</details>
 <nav class="observatory-links" aria-label="Детали результатов">${link('journal','Все записи по дням')}${link('plan','Что доступно дальше')}</nav>`;
}
