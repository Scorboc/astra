import type { ResearchState } from './research.ts';
import { answerStatus,researchStats } from './research-dashboard.ts';
import { addDays } from './expedition.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function monthReady(s:ResearchState,today:string){const first=s.answers.map(a=>a.day).sort()[0];return !!first&&addDays(first,29)<=today;}
export function monthEvidence(s:ResearchState){
 const choices=new Map<string,string[]>();
 for(const a of s.answers.filter(a=>a.kind==='game'))for(const c of a.choices)if(!['Пропустить','Пока не знаю'].includes(c))choices.set(c,[...(choices.get(c)??[]),a.day]);
 const repeated=new Map<string,typeof s.answers>();
 for(const a of s.answers.filter(a=>a.kind==='question'&&!a.choices.includes('Пропустить')))repeated.set(a.prompt,[...(repeated.get(a.prompt)??[]),a]);
 return {stats:researchStats(s),gameChoices:[...choices].map(([choice,days])=>({choice,days})),changed:[...repeated].filter(([,rows])=>new Set(rows.map(r=>r.choices.join('|'))).size>1),trials:s.answers.filter(a=>a.kind==='trial')};
}
export function monthReview(s:ResearchState,today:string){
 const e=monthEvidence(s);if(!monthReady(s,today))return '<p>Месячный обзор появится на 30-й календарный день после первой записи. Пропуски не обнуляют срок.</p>';
 return `<section class="month-review"><h3>Первый круг: что действительно известно</h3><p>Это обзор записей, а не оценка личности. Успехом здесь не считается само заполнение календаря.</p>
 <p>Показаны даты сохранённых записей. Дни без записи не считаются неудачей. Доступность обзора не означает достаточности данных для вывода.</p><div class="month-grid" aria-label="Даты сохранённых записей">${[...s.answers].sort((a,b)=>a.day.localeCompare(b.day)).map(a=>`<a href="#research/${a.day}" class="month-day ${a.kind}" aria-label="${a.day}: ${answerStatus(a)}"><strong>${a.day.slice(8)}.${a.day.slice(5,7)}</strong><small>${a.kind==='trial'?answerStatus(a):a.choices.includes('Пропустить')?'Пропуск':a.kind==='game'?'Игра':'Ответ'}</small></a>`).join('')}</div>
 <h3>Действия отдельно от намерений</h3><p>Завершённых проб: ${e.stats.completed}; частичных: ${e.stats.partial}; перенесённых: ${e.trials.filter(a=>a.choices.includes('Перенести')).length}; без выполнения: ${e.trials.filter(a=>!['Сделал','Попробовал частично','Перенести'].includes(a.choices[0])).length}. Источник — отметки участника, не независимая проверка.</p>
 <details><summary>Посмотреть каждую пробу и её основание</summary>${e.trials.map(a=>`<article class="research-evidence"><a href="#research/${a.day}">${a.day} · ${answerStatus(a)}</a><p>${esc(a.note)}</p></article>`).join('')}</details>
 <h3>Выбор в играх</h3>${e.gameChoices.map(c=>`<p><strong>${esc(c.choice)}</strong> — ${c.days.length} раз. <small>${c.days.join(', ')}</small></p>`).join('')}<p class="small-note">Это предпочтения в предложенных ситуациях. Они не доказывают, что человек так же поступит вне игры.</p>
 <h3>Где ответы менялись</h3>${e.changed.map(([prompt,rows])=>`<details><summary>${esc(prompt)}</summary>${rows.map(a=>`<p><a href="#research/${a.day}">${a.day}</a> — ${esc(a.choices.join(', '))}. ${esc(a.note)}</p>`).join('')}</details>`).join('')||'<p>В одинаковых вопросах изменения выбранных вариантов пока не обнаружены. Это не доказывает отсутствие противоречий в дополнениях.</p>'}
 <h3>Что пока нельзя заключить</h3><p>Не измерены качество работы, устойчивость интереса за пределами этого месяца, спрос на возможный продукт и реальная доступность времени. Свободные дополнения показаны целиком: система пока не умеет надёжно разрешать смысловые противоречия. Повторяющиеся вопросы могли влиять на ответы.</p>
 <h3>Следующий круг — твой выбор</h3><p>Можно продолжить одну из своих идей, сравнить две или взять паузу. Ни частота ответа, ни натальная карта не выбирают направление за тебя.</p><a class="primary wide" href="#plan">Что доступно дальше</a><a class="text-button" href="#astrology">Открыть натальную карту</a></section>`;
}
