import { createGalaxyScene } from './engine';
import type { GalaxyScene } from './engine';
import { PLANETS, ABOUT_TITLE, ABOUT_PARAGRAPHS, GOALS, newJourney, configureJourney, recordJourney, reflectJourney, finishJourney, journeyPlans, journeySummary, canVisit, parseRoute } from './journey';
import type { PlanetId, GalaxyRoute, Journey } from './journey';
import { DAYS, isStale, reportData } from '../domain';
import type { Goal, Outcome, Plan } from '../domain';
import './styles.css';
import './universe.css';
import './expedition.css';
import './research.css';
import './membrane.css';
import { membraneFrame } from './membrane';
import { createResearchUI } from './research-ui';
import { blankBirth,newResearch,researchProgress,nextResearchRoute } from './research';
import { newExpedition,expeditionDay,dayNumber,dailyMission,answerEncounter,updateContext,horizon } from './expedition';
import type { Expedition,Context } from './expedition';
import { routeBody,contextBody,companionBody,horizonBody } from './expedition-ui';
import { saveExpedition,loadExpedition,forgetExpedition } from './expedition-storage';
import { WORLD_THEMES } from './world-themes';
import { activeAccount,profileStore,mountAccountUI,accountSummary,rememberAccountRoute } from './account-ui';
import './account.css';

const $ = <E extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as E;
const esc = (v:unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const outcomeText:Record<Outcome,string>={done:'Сделал',partial:'Частично',skipped:'Пропустил'};
let journey=newJourney(),savedJourney:Journey|null=null,scene:GalaxyScene|undefined,route=parseRoute(location.hash),selectedPace:Plan['pace']='gentle';
const expeditionStore=profileStore;
const restored=loadExpedition(expeditionStore);
let expedition=restored.snapshot?.expedition??newExpedition(),savedExpedition:Expedition|null=null,storageAllowed=!!activeAccount||restored.allowed,storageStatus=restored.status;
if(restored.snapshot)journey=restored.snapshot.journey;
if(expedition.research?.complete&&!expedition.research.birth){
 expedition={...expedition,research:{...expedition.research,complete:false,birthDeferred:false,step:1}};
}
let smallMission=false,editObservationId:string|undefined;
function today(){return expeditionDay(expedition,journey.demo);}
function clockJourney(){journey={...journey,period:{start:expedition.start,today:today()}};}
function persist(){if(!journey.demo)storageStatus=saveExpedition(expeditionStore,{version:1,journey,expedition},storageAllowed);}
clockJourney();
let landing=false,tourTimer:ReturnType<typeof setInterval>|undefined,tourIndex=0,toastTimer:ReturnType<typeof setTimeout>|undefined,spaceHintSeen=false;
let readerWasPaused=false;
let checkDraft={outcome:journey.data.draft?.outcome??'' as Outcome|'',minutes:journey.data.draft?.minutes??'',note:journey.data.draft?.note??'',energy:journey.data.draft?.energy??''},reflectionDraft='';
let goalTrack:Goal['track']=journey.data.goalDraft?.track??journey.data.goal.track,goalTitle=journey.data.goalDraft?.title??journey.data.goal.title,goalCriterion=journey.data.goalDraft?.criterion??journey.data.goal.criterion,goalMinutes=journey.data.scheduleDraft?.minutes??journey.data.schedule.minutes,goalDays=journey.data.scheduleDraft?.days??[...journey.data.schedule.days];
let savedDrafts:{check:typeof checkDraft;reflection:string;track:Goal['track'];title:string;criterion:string;minutes:number;days:number[];pace:Plan['pace']}|null=null;
const root=$('galaxy-app');
const benchmark=new URLSearchParams(location.search).get('section')==='origin';
root.innerHTML=`
 <button class="skip" data-action="start">К действиям</button>
 <div id="cosmos" class="cosmos"></div><div id="planet-labels" class="planet-labels"></div><div class="vignette" aria-hidden="true"></div>
 <header class="galaxy-header"><a class="wordmark" href="#galaxy" aria-label="Astra — галактика">astra<span>.</span></a>
 <nav class="main-nav" aria-label="Основная навигация"><a href="#today"><span aria-hidden="true">◷</span>Сегодня</a><a href="#astrology"><span aria-hidden="true">✧</span>Астрология</a><a href="#results"><span aria-hidden="true">▥</span>Результаты</a><a href="#profile"><span aria-hidden="true">◉</span>Профиль</a></nav>
 <div class="header-actions"><a class="account-link" href="${activeAccount?'#profile':'#login'}">${activeAccount?esc(activeAccount.login):'Войти'}</a><button class="about-link" data-action="about">Об Astra ↗</button><button class="demo-launch" data-action="demo">Демо за 3 минуты <span>↗</span></button></div></header>
 <div class="local-label"><i></i><span id="mode-label">Система готова · маршрут активен</span></div>
 <aside class="space-hint" id="space-hint" role="status" aria-live="polite"><span class="space-hint-icon" aria-hidden="true">↕</span><span><strong>Это живое пространство</strong><small>Свайпни вверх или вниз, чтобы лететь · у планеты потяни влево/вправо · двумя пальцами приблизь или отдались · нажми на планету</small></span><button type="button" data-action="dismiss-space-hint" aria-label="Скрыть подсказку">×</button></aside>
 <section class="intro" id="intro"><p class="eyebrow">ТВОЯ ПЕРСОНАЛЬНАЯ ГАЛАКТИКА</p><h1 id="intro-title">Здесь начинается<br>твой путь</h1><p id="intro-copy">Не нужно знать всё заранее.<br>Начни с того, что тебе интересно.</p><div class="intro-actions" id="controls"><button class="primary" data-action="start" id="start-button">Выбрать цель <span>↗</span></button><button class="text-button" data-action="about">Осмотреться · об Astra</button></div><span class="intro-note">Небольшие действия. Настоящие открытия.</span></section>
 <div class="camera-tools" aria-label="Камера и движение"><button data-action="observatory" aria-label="Открыть обсерваторию" title="Обсерватория">⌂</button><button data-action="zoom-in" aria-label="Приблизить" title="Приблизить">＋</button><button data-action="zoom-out" aria-label="Отдалить" title="Отдалить">−</button><button data-action="overview" aria-label="Общий вид галактики" title="Общий вид">⌖</button><button id="motion" data-action="motion" aria-label="Пауза движения" aria-pressed="false" title="Пауза движения">Ⅱ</button></div>
 <aside class="journey-panel" id="panel" aria-labelledby="panel-heading" hidden></aside>
 <section class="landing-bar" id="landing-bar" hidden><div><span class="eyebrow">ПЛАНЕТА «ОБ ASTRA»</span><p id="landing-status" role="status">Проходим сквозь атмосферу…</p></div><button class="primary" data-action="read">Прочитать надпись ↗</button><button class="ghost" data-action="overview">Вернуться к звёздам</button></section>
 <section class="landing-bar" id="observatory-bar" aria-label="Обсерватория" hidden><div><span class="eyebrow">ОБСЕРВАТОРИЯ</span><p>Твои наблюдения, пробы и открытия</p></div><a class="primary" href="#results">Открыть атлас наблюдений ↗</a><a class="ghost" href="#galaxy">Вернуться к планетам</a></section>
 <section class="demo-dock" id="demo-dock" aria-label="Ускоренная проверка" hidden></section>
 <div id="toast" class="toast" role="status" aria-live="polite"></div>
 <div class="boot" id="boot"><span class="boot-orbit">✧</span><p>Собираем твою галактику</p><small>Сначала первый мир. Детали — по мере приближения.</small></div>
 <div class="graphics-error" id="graphics-error" hidden><h2>Космос пока недоступен</h2><p>Браузер не предоставил доступ к 3D. Маршрут и записи доступны без графики.</p><a class="primary" href="/today">Открыть обычный интерфейс</a><button class="ghost" data-action="reload">Повторить</button></div>
 <dialog id="reader" aria-labelledby="reader-title"><button class="reader-close" data-action="close-reader" aria-label="Закрыть описание">×</button><span class="eyebrow">НАДПИСЬ НА СКАЛЕ</span><h2 id="reader-title">${ABOUT_TITLE}</h2>${ABOUT_PARAGRAPHS.map(t=>`<p>${t}</p>`).join('')}<p class="small-note">Ты управляешь маршрутом, можешь изменить любой ответ и сам выбираешь направление движения.</p><button class="primary" data-action="reader-start">Выбрать первый шаг ↗</button></dialog>`;

function toast(message:string){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),6500);}
document.querySelector('.landing-bar .eyebrow')!.textContent='ИСТОК / ОПИСАНИЕ ASTRA';
document.querySelector('[data-action="reader-start"]')!.textContent='Начать знакомство ↗';
if(benchmark){
 document.body.classList.add('benchmark-origin');
 document.querySelector('.landing-bar .eyebrow')!.textContent='ИСТОК / БЕРЕГ НАЧАЛА';
 document.querySelector('.intro-note')!.textContent='Пробный участок · орбита → берег → надпись';
}
function go(next:GalaxyRoute){if(location.hash==='#'+next)applyRoute();else location.hash=next;}
const accountUI=mountAccountUI(root,panel);
const research=createResearchUI({state:()=>expedition.research,set:s=>{expedition={...expedition,research:s};},today,journey:()=>journey,go:r=>go(r as GalaxyRoute),panel,save:persist,storage:()=>storageStatus,allowed:()=>storageAllowed,toast});
function panel(title:string,kicker:string,body:string){
 if(title==='Профиль')body=accountSummary()+body;
 if(kicker==='АВРОРА / СЕГОДНЯ')body=`<p class="eyebrow">День ${dayNumber(expedition,today())} · ${esc(editObservationId?journey.data.observations.find(o=>o.id===editObservationId)?.eventDate:today())}${editObservationId?' · исправление':''}</p><div class="mission-size"><button class="choice" data-action="mission-small" aria-pressed="${smallMission}">Минимум · 5 минут</button><button class="choice" data-action="mission-normal" aria-pressed="${!smallMission}">Обычный шаг</button></div>`+body;
 if(kicker.startsWith('ИСТОК / ЦЕЛЬ'))body='<p class="small-note">Первый шаг экспедиции: твоя цель, затем около 30 дней проб и гибкий горизонт на 90 дней.</p>'+body+'<button class="text-button" data-action="context">Другие интересы, ресурсы и ограничения</button>';
 if(kicker.startsWith('НЕРЕЯ /'))body+=horizonBody(expedition,journey,today());
 if(kicker.startsWith('СОЛИС /'))body+='<button class="primary wide" data-action="daily">Продолжить ежедневные пробы ↗</button><button class="text-button wide" data-action="route">Календарь 30 дней</button>'+horizonBody(expedition,journey,today());
 const invitation=body.includes('class="invitation-time"');$('panel').dataset.presentation=invitation?'invitation':'content';
 $('panel').dataset.reading=String(!invitation && /^(results|journal|astrology|profile|plan)$/.test(location.hash.slice(1)));
 $('panel').innerHTML=`${membraneFrame()}<div class="panel-scroll" id="panel-scroll"><div class="panel-top"><span class="eyebrow">${invitation?'СЕГОДНЯ':kicker}</span><button data-action="close-panel" aria-label="Закрыть панель">×</button></div><div class="membrane-divider" aria-hidden="true">✧</div><h2 id="panel-heading" tabindex="-1">${title}</h2>${body}<p id="form-error" class="form-error" role="alert" tabindex="-1"></p></div>`;$('panel').hidden=false;
}
function routePanel(){panel('Твоя экспедиция','30 ДНЕЙ / ОТ ПРОБ К МАРШРУТУ',routeBody(expedition,journey,today()));}
function encounterPanel(){panel('Встреча в пути','РАДИОКАНАЛ / НАБЛЮДЕНИЕ',companionBody(expedition,journey,today()));}
function contextPanel(){panel('Твоя карта интересов','ИСТОК / НЕ СВОДИМ К ОДНОЙ РОЛИ',contextBody(expedition));}
function goalPanel(){
 panel('С чего начнём?','ИСТОК / ЦЕЛЬ И РЕСУРСЫ',`<p class="lead">Не выбираем за тебя. Сначала — одно направление и посильный ритм.</p><form id="goal-form"><fieldset><legend>Хочу попробовать</legend><div class="choice-grid">${Object.entries(GOALS).map(([id,g])=>`<button type="button" class="choice ${goalTrack===id?'selected':''}" data-track="${id}" aria-pressed="${goalTrack===id}">${g.title}</button>`).join('')}</div></fieldset><label>Моя цель<input name="goal" maxlength="120" required value="${esc(goalTitle)}"></label><label>Как пойму, что продвинулся<input name="criterion" maxlength="240" required value="${esc(goalCriterion)}"></label><label>Минут на одну пробу<select name="minutes">${[0,5,10,15,25,40].map(n=>`<option value="${n}" ${goalMinutes===n?'selected':''}>${n===0?'Пока нет времени':n+' минут'}</option>`).join('')}</select></label><fieldset><legend>В какие дни удобно?</legend><div class="days">${DAYS.map((d,i)=>`<label><input type="checkbox" name="day" value="${i}" ${goalDays.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}</div></fieldset><p class="small-note">Шаги бесплатные. Цель, время и ритм можно изменить в любой момент.</p><button class="primary wide" type="submit">Построить первый перелёт ↗</button></form>`);
}
function checkPanel(){
 clockJourney();
 const mission=dailyMission(journey,expedition,today(),smallMission);
 const task=editObservationId||(journey.data.schedule.minutes>=5&&(mission.planned||journey.demo))?{...mission,minutes:journey.demo?Math.min(smallMission?5:15,journey.data.schedule.minutes):mission.minutes}:undefined;
 if(!task&&journey.data.schedule.minutes>=5){panel('Сегодня можно отдохнуть','АВРОРА / ТВОЙ РИТМ',`<p class="lead">Этот день не выбран для практики. Догонять ничего не нужно.</p><p>Можно встретиться с помощником или изменить удобные дни на Истоке.</p><button class="primary" data-action="encounter">Встреча с помощником</button><button class="text-button wide" data-action="edit-goal">Изменить расписание</button>`);return;}
 if(!task){panel('Сначала найдём время','АВРОРА / БЕЗ ДАВЛЕНИЯ','<p class="lead">Не будем назначать действие, которое не помещается в твой день. Выбери удобный день и хотя бы 5 минут, когда будешь готов.</p><button class="primary" data-action="edit-goal">Изменить доступное время</button>');return;}
 panel('Маленькая реальная проба','АВРОРА / СЕГОДНЯ',`<div class="task-block"><span>${task.minutes} МИНУТ · 0 ₽</span><h3>${esc(task.title)}</h3><p>${esc(task.result)}</p></div><p class="small-note">${journey.demo?'Ускоренное демо: действие можно вообразить. Ответ не будет считаться реальным достижением.':'Сначала попробуй действие вне сайта, затем вернись и отметь, как всё прошло.'}</p><form id="check-form"><fieldset><legend>Как прошло действие?</legend><div class="outcomes">${Object.entries(outcomeText).map(([id,t])=>`<label><input type="radio" name="outcome" value="${id}" ${checkDraft.outcome===id?'checked':''} required><span>${t}</span></label>`).join('')}</div></fieldset><label>Фактическое время, минут<input name="minutes" type="number" min="0" max="180" step="1" placeholder="Можно оставить пустым" value="${esc(checkDraft.minutes)}"></label><label>Моё дополнение <small>необязательно</small><textarea name="note" maxlength="500" placeholder="Что получилось? Что помешало?">${esc(checkDraft.note)}</textarea></label><button class="primary wide" type="submit">Сохранить отметку и лететь дальше ↗</button><button type="button" class="text-button wide" data-action="close-panel">Вернуться позже</button></form>`);
}
function reflectionPanel(){panel('Что ты заметил?','ВЕЛИР / НАБЛЮДЕНИЕ',`<p class="lead">Любой результат — повод уточнить маршрут. Одна проба не определяет твои способности.</p><div class="choice-grid">${['Хочу продолжить','Попробую меньший шаг','Хочу изменить подход','Пока недостаточно опыта'].map(t=>`<button class="choice" data-reflection="${t}">${t}</button>`).join('')}</div><form id="reflection-form"><label>Моё наблюдение<textarea name="reflection" maxlength="500" required placeholder="Выбери ответ выше или напиши свой">${esc(reflectionDraft||journey.reflection)}</textarea></label><button class="primary wide" type="submit">Сравнить маршруты ↗</button></form>`);}
function plansPanel(){
 const plans=journeyPlans(journey);
 panel('Твой темп. Твой выбор.','НЕРЕЯ / ВАРИАНТЫ МАРШРУТА',`<p class="lead">${esc(journey.data.goal.title)}</p><p>Два посильных варианта ближайшей недели. Это предварительное предложение, не предсказание.</p>${isStale(journey.data)?'<p class="warning">Записи изменились. Предыдущий план сохранён, но требует пересмотра.</p>':''}<div class="plan-options">${plans.map(p=>`<button class="plan-option ${selectedPace===p.pace?'selected':''}" data-pace="${p.pace}" aria-pressed="${selectedPace===p.pace}"><span>${p.pace==='gentle'?'Бережный':'Размеренный'}</span><strong>${p.totalMinutes} мин <small>/ неделю</small></strong><small>${p.items.length} шага · ${p.cost} ₽</small></button>`).join('')}</div><ol class="plan-list">${plans.find(p=>p.pace===selectedPace)!.items.map(item=>`<li><span>${DAYS[item.day]} · ${item.time} · ${item.minutes} мин</span>${esc(item.title)}</li>`).join('')}</ol><p class="small-note">Основания: твоя цель, выбранные окна и ${journey.data.observations.length} отметка. Этого недостаточно для выводов о личности. Примерные контрольные точки на 30 / 60 / 90 дней, а не жёсткое расписание на три месяца.</p><button class="primary wide" data-action="approve" ${!plans.find(p=>p.pace===selectedPace)!.items.length?'disabled':''}>Выбрать этот маршрут ↗</button><button class="text-button wide" data-action="edit-goal">Изменить цель или время</button>`);
}
function summaryPanel(){const sum=journeySummary(journey),p=journey.data.approvedPlan;panel('Маршрут открыт','СОЛИС / ИТОГИ ПЕРВОЙ ПРОБЫ',`<p class="lead">Это не финиш жизни. Это следующий шаг, который ты выбрал сам.</p>${journey.demo?'<p class="demo-note">УСКОРЕННОЕ ДЕМО · не реальные результаты 30 дней</p>':''}<div class="summary-grid"><div><strong>${sum.completed}</strong><span>сделано</span></div><div><strong>${sum.partial}</strong><span>частично</span></div><div><strong>${sum.skipped}</strong><span>пропусков</span></div></div><p>Записано ${sum.minutes} минут${sum.unknownMinutes?' · есть отметки без времени':''}. Отсутствие записи не означает пропуск.</p><blockquote>${esc(journey.reflection||'Наблюдений пока недостаточно.')}</blockquote>${p?`<h3>Ближайшая неделя</h3><p>${p.totalMinutes} минут, ${p.items.length} шага. Цель: ${esc(p.goal.title)}.</p><div class="checkpoint"><span>30 дней — пересмотреть опыт</span><span>60 дней — проверить направление</span><span>90 дней — оценить следующий этап</span></div>`:''}${isStale(journey.data)?'<p class="warning">Сохранённый план требует пересмотра.</p>':''}<button class="primary wide" data-action="overview">Увидеть свою галактику ↗</button><button class="text-button wide" data-action="export">Скачать демо-итоги</button>`);}
function todayPanel(){if(journey.stage===0)goalPanel();else if(journey.stage===1)checkPanel();else if(journey.stage===2)reflectionPanel();else if(journey.stage===3)plansPanel();else summaryPanel();}
function journalPanel(){
 const rows=journey.data.observations;
 panel('Твои открытия','НАБЛЮДЕНИЯ / НЕ ОЦЕНКА ЛИЧНОСТИ',`${rows.length?rows.map(o=>`<article class="journal-item"><span>${esc(o.eventDate)} · ${outcomeText[o.outcome]} · ${o.minutes===null?'время не указано':o.minutes+' мин'}</span><p>${esc(o.note||'Без дополнения')}</p><small>Самоотчёт · ревизия ${o.revision}</small><button class="text-button" data-action="edit-observation" data-observation="${esc(o.id)}">Исправить запись</button></article>`).join(''):'<p class="lead">Здесь появятся твои пробы и наблюдения. Мы ничего не приписываем тебе заранее.</p>'}${journey.reflection?`<h3>Наблюдение</h3><p>${esc(journey.reflection)}</p>`:''}<details><summary>Ответы во встречах (${expedition.encounters.length})</summary>${expedition.encounters.map(a=>`<p>${a.day} · ${esc(a.choice)}<br>${esc(a.note)}</p>`).join('')}<p>Это сообщения пользователя, не выполненные действия.</p></details>${journey.data.history.length?`<details><summary>История исправлений (${journey.data.history.length})</summary>${journey.data.history.map(o=>`<p>${o.eventDate} · ${outcomeText[o.outcome]} · ${o.minutes??'—'} мин · ${esc(o.note)}</p>`).join('')}</details>`:''}<p class="small-note">Один ответ не доказывает склонность или способность. История исправлений сохраняется в этой сессии.</p><button class="primary" data-action="start">К текущему шагу ↗</button>`);
}
function profilePanel(){panel('Твоё пространство','ПРОФИЛЬ / УПРАВЛЕНИЕ',`<p class="lead">Исследуй желания, пробуй в своём темпе и сам выбирай следующий шаг.</p><button class="setting" data-action="context"><span>Мои интересы и ресурсы</span><strong>↗</strong></button><button class="setting" data-action="motion"><span>Движение мира</span><strong>${scene?.paused?'На паузе':'Включено'}</strong></button><button class="setting" data-action="demo"><span>${journey.demo?'Вернуться из демо':'Демо за 3 минуты'}</span><strong>↗</strong></button><h3>Мой прогресс</h3><p class="save-status">${journey.demo?'Демо идёт отдельно и не меняет твой прогресс.':storageStatus==='saved'?'Все изменения сохранены.':storageStatus==='error'?'Не удалось сохранить изменения. Скачай резервную копию.':'Сохранение можно включить одним нажатием.'}</p>${!journey.demo?`<button class="ghost wide" data-action="${storageAllowed?'forget-storage':'allow-storage'}">${storageAllowed?'Удалить сохранённую копию':'Включить сохранение'}</button>`:''}<button class="text-button wide" data-action="export">Скачать резервную копию</button><p class="small-note">Дата рождения и игровые ответы не определяют цели или способности.</p><p class="small-note">Пять миров: ${Object.entries(WORLD_THEMES).map(([id,t])=>`${PLANETS.find(p=>p.id===id)!.name} — ${t.name}`).join('; ')}. Описание проекта — на Истоке.</p><button class="text-button" data-action="about">Посадка к описанию ASTRA</button>`);}
function planetPanel(id:PlanetId){if(!canVisit(journey,id)){const p=PLANETS.find(p=>p.id===id)!;panel(p.name,'ВПЕРЕДИ / НОВЫЙ МИР',`<p class="lead">${p.subtitle}</p><p>Этот мир откроется по мере прохождения твоего маршрута. Без штрафов, гонки и обязательного ежедневного присутствия.</p><button class="primary" data-action="start">К текущему шагу ↗</button>${journey.demo?`<button class="text-button" data-demo-stage="${PLANETS.findIndex(p=>p.id===id)}">Посмотреть этот этап в демо</button>`:''}`);return;}
 if(id==='origin')goalPanel();else if(id==='aurora')checkPanel();else if(id==='velir')reflectionPanel();else if(id==='nereya')plansPanel();else if(id==='solis')summaryPanel();}
function sync(){
 clockJourney();persist();
 document.querySelectorAll('[data-save-status]').forEach(el=>el.textContent=research.storageText());
 const researchState=expedition.research??newResearch();
 scene?.setProgress(researchProgress(researchState));document.body.classList.toggle('is-demo',journey.demo);
 document.body.classList.toggle('expanded-galaxy',journey.stage>=2);root.dataset.stage=String(journey.stage);
 $('mode-label').textContent=journey.demo?'Демо за 3 минуты · пример маршрута':'Система готова · маршрут активен';
 $('intro-title').innerHTML=researchState.complete?'Узнавай себя.<br>Выбирай свой путь.':'Твои мечты.<br>Твоя вселенная.';
 $('intro-copy').innerHTML='Сначала познакомимся — через вопросы, игры и наблюдения.<br>Затем соберём путь к твоим целям.';
 $('start-button').innerHTML=`${researchState.complete?'Сегодняшнее исследование':researchState.step?'Продолжить знакомство':'Начать знакомство'} <span>↗</span>`;
 document.querySelector('.intro-note')!.textContent='Около месяца знакомства. Никаких готовых ответов о тебе.';
 document.body.classList.toggle('motion-paused',scene?.paused??false);
 document.querySelectorAll('[data-reading-motion]').forEach(el=>{el.setAttribute('aria-pressed',String(scene?.paused??false));el.textContent=scene?.paused?'Включить движение':'Спокойный режим';});
 const btn=$('motion');btn.setAttribute('aria-pressed',String(scene?.paused??false));btn.setAttribute('aria-label',scene?.paused?'Возобновить движение':'Пауза движения');btn.textContent=scene?.paused?'▷':'Ⅱ';
 $('demo-dock').hidden=!journey.demo;
 $('space-hint').hidden=route!=='galaxy'||spaceHintSeen;
 if(journey.demo)$('demo-dock').innerHTML=`<div class="demo-heading"><span>ДЕМО / ВЫМЫШЛЕННЫЕ ДАННЫЕ</span><button data-action="exit-demo" aria-label="Выйти из демо">×</button></div><details><summary>Быстрый просмотр экранов</summary><div class="demo-stages">${['Начало','Рождение','Желания','Сегодня','Результаты'].map((t,i)=>`<button data-demo-stage="${i}">${t}</button>`).join('')}</div><p>Быстрый просмотр сбрасывает только демо и подставляет вымышленный профиль без достижений.</p></details>`;
 if(journey.demo)$('demo-dock').insertAdjacentHTML('beforeend',`<div class="demo-controls"><button data-action="demo-day">Демо-день ${expedition.demoDay+1} →</button><button data-action="demo-month">К дню 30</button></div>`);
}
function applyRoute(){
 clockJourney();
 route=parseRoute(location.hash);
 if(!activeAccount&&!journey.demo&&!['galaxy','observatory','about','login','register','example'].includes(route)){rememberAccountRoute(route);history.replaceState(null,'','#login');route='login';}
 $('panel').hidden=true;$('landing-bar').hidden=route!=='about';$('observatory-bar').hidden=route!=='observatory';$('intro').hidden=route!=='galaxy';document.body.classList.toggle('has-panel',!['galaxy','observatory','about'].includes(route));document.body.classList.toggle('on-surface',route==='about');
 document.body.classList.toggle('research-page',!['galaxy','observatory','about'].includes(route));
 const navRoute=['astrology','forecast','astro-checks'].includes(route)?'astrology':['observatory','results','journal','plan','route','discoveries','plans','planet/velir','planet/nereya','planet/solis'].includes(route)||route.startsWith('research/')?'results':['profile','context','planet/origin','birth','birth-review','wishes','wishes-review','rhythm','review'].includes(route)?'profile':'today';
 document.querySelectorAll<HTMLAnchorElement>('.main-nav a').forEach(a=>{if(a.hash==='#'+navRoute)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(route==='observatory'){scene?.observatory();sync();return;}
 if(accountUI.render(route)){scene?.present();sync();return;}
 if(research.render(route)){
  if(route==='today')scene?.present();
  else if(route.startsWith('planet/'))scene?.focus(route.slice(7) as PlanetId);
  else if(['birth','welcome','wishes','rhythm','review'].includes(route))scene?.focus('origin');
  sync();$('panel-heading').focus({preventScroll:true});return;
 }
 document.querySelectorAll<HTMLAnchorElement>('.main-nav a').forEach(a=>{if(a.hash==='#'+route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(route==='about'){landing=false;$('landing-status').textContent='Проходим сквозь атмосферу…';scene?.land();}
 else if(route==='galaxy')scene?.home();
 else if(route.startsWith('planet/')){const id=route.slice(7) as PlanetId;if(id==='about'){go('about');return;}scene?.focus(id);planetPanel(id);}
 else {
  if(route==='today'){scene?.focus(PLANETS[Math.min(journey.stage,4)].id);todayPanel();}
  else if(route==='route'){scene?.overview();routePanel();}
  else if(route==='discoveries'){scene?.overview();journalPanel();}
  else if(route==='profile'){scene?.overview();profilePanel();}
  else if(route==='context'){scene?.focus('origin');contextPanel();}
  else if(route==='companion'){encounterPanel();}
  else if(route==='plans'){scene?.focus('nereya');if(journey.stage>=3)plansPanel();else panel('Сначала — опыт','МАРШРУТ / НЕДОСТАТОЧНО ОСНОВАНИЙ','<p>Настрой цель, сохрани пробу и наблюдение. После этого можно выбрать план.</p><button class="primary" data-action="start">К текущему шагу</button>');}
 }
 sync();if(!$('panel').hidden)$('panel-heading').focus({preventScroll:true});
}
function resetDrafts(){checkDraft={outcome:'',minutes:'',note:'',energy:''};reflectionDraft='';goalTrack=journey.data.goal.track;goalTitle=journey.data.goal.title;goalCriterion=journey.data.goal.criterion;goalMinutes=journey.data.schedule.minutes;goalDays=[...journey.data.schedule.days];selectedPace='gentle';}
function enterDemo(){if(journey.demo){exitDemo();return;}savedJourney=journey;savedExpedition=expedition;savedDrafts={check:{...checkDraft},reflection:reflectionDraft,track:goalTrack,title:goalTitle,criterion:goalCriterion,minutes:goalMinutes,days:[...goalDays],pace:selectedPace};journey=newJourney(true);expedition=newExpedition('2026-10-03');editObservationId=undefined;resetDrafts();sync();go('welcome');toast('Демо отдельно от твоей сессии. Пройди знакомство или открой быстрый просмотр экранов.');}
function stopTour(){if(tourTimer)clearInterval(tourTimer);tourTimer=undefined;sync();}
function exitDemo(){stopTour();journey=savedJourney??newJourney();expedition=savedExpedition??newExpedition();savedJourney=null;savedExpedition=null;editObservationId=undefined;if(savedDrafts){checkDraft={...savedDrafts.check};reflectionDraft=savedDrafts.reflection;goalTrack=savedDrafts.track;goalTitle=savedDrafts.title;goalCriterion=savedDrafts.criterion;goalMinutes=savedDrafts.minutes;goalDays=[...savedDrafts.days];selectedPace=savedDrafts.pace;}else resetDrafts();savedDrafts=null;sync();go('galaxy');toast('Вернулись в твою сессию. Демо-ответы в неё не переносились.');}
function previewStage(stage:number){
 if(!journey.demo)return;journey=newJourney(true);expedition=newExpedition('2026-10-03');
 const r=newResearch();r.step=stage===0?0:stage===1?1:stage===2?2:4;
 if(stage>=2)r.birth={...blankBirth,date:'1990-05-12',place:'Казань, Татарстан, Россия'};
 if(stage>=3){r.wishes={original:'Вымышленный пример: музыка, путешествия и свой проект',confirmed:'Музыка\nПутешествия\nСвой проект',preserve:'Стабильную работу',avoid:'Превращать каждое хобби в заработок'};r.rhythm={kind:'shifts',windows:'Два свободных окна по 20 минут',resources:'Опыт пока уточняю',limits:'Без вложений'};r.complete=true;r.memoryDone=true;}
 expedition.research=r;resetDrafts();sync();go(stage===0?'welcome':stage===1?'birth':stage===2?'wishes':stage===3?'today':'results');
}
function exportResult(){clockJourney();const researchState=expedition.research??newResearch();const result={format:'astra-research-v1',synthetic:journey.demo||!!activeAccount?.example,mode:journey.demo?'accelerated-preview':activeAccount?.example?'synthetic-account':'personal-journey',generatedForDate:today(),research:researchState,astrology:{layer:'symbolic-reflection',forecastMode:researchState.forecastMode,checks:[]},personalInstruction:{status:researchState.answers.length?'collecting-evidence':'awaiting-first-research'},legacy:{...reportData(journey.data),reflection:journey.reflection,reflectionHistory:journey.reflectionHistory,expedition,horizon:horizon(expedition,journey,today())},note:'Предыдущие записи сохранены отдельно и не подменяют результаты нового знакомства.'};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astra-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Резервная копия готова.');}
root.addEventListener('input',e=>{const t=e.target as HTMLInputElement;if(t.form?.id==='goal-form'){const f=new FormData(t.form);goalTitle=String(f.get('goal')??'');goalCriterion=String(f.get('criterion')??'');goalMinutes=Number(f.get('minutes'));goalDays=f.getAll('day').map(Number);}if(t.form?.id==='check-form'){const f=new FormData(t.form);checkDraft={outcome:String(f.get('outcome')??'') as Outcome|'',minutes:String(f.get('minutes')??''),note:String(f.get('note')??''),energy:''};}if(t.form?.id==='reflection-form')reflectionDraft=t.value;});
root.addEventListener('input',e=>{
 const t=e.target as HTMLInputElement;
 if(t.form?.id.startsWith('research-')){research.capture(t.form);return;}
 if(t.form?.id==='check-form')journey={...journey,data:{...journey.data,draft:{...checkDraft,requestId:'draft'}}};
 if(t.form?.id==='goal-form')journey={...journey,data:{...journey.data,goalDraft:{...GOALS[goalTrack],title:goalTitle,criterion:goalCriterion},scheduleDraft:{...journey.data.schedule,minutes:goalMinutes,days:[...goalDays]}}};
 persist();
});
root.addEventListener('submit',e=>{
 const form=e.target as HTMLFormElement;e.preventDefault();
 try{
  if(research.submit(form)){sync();return;}
  const f=new FormData(form);clockJourney();
  if(form.id==='goal-form'){
   journey=configureJourney(journey,{...GOALS[goalTrack],title:String(f.get('goal')),criterion:String(f.get('criterion'))},{days:f.getAll('day').map(Number),minutes:Number(f.get('minutes')),time:'19:00',budget:0});sync();go('planet/aurora');toast('Направление выбрано. Теперь — маленькая проба.');
  }else if(form.id==='check-form'){
   journey=recordJourney(journey,{...checkDraft,requestId:crypto.randomUUID()},new Date().toISOString(),editObservationId);editObservationId=undefined;checkDraft={outcome:'',minutes:'',note:'',energy:''};sync();go('planet/velir');toast('Отметка сохранена. Любой результат помогает уточнить следующий шаг.');
  }else if(form.id==='reflection-form'){
   journey=reflectJourney(journey,String(f.get('reflection')??''));sync();go('planet/nereya');
  }else if(form.id==='context-form'){
   expedition=updateContext(expedition,Object.fromEntries(Object.keys(expedition.context).map(k=>[k,String(f.get(k)??'')])) as Context);sync();go('profile');toast('Контекст сохранён отдельно от отметок о действиях.');
  }else if(form.id==='encounter-form'){
   expedition=answerEncounter(expedition,today(),String(f.get('choice')??''),String(f.get('note')??''));sync();encounterPanel();toast('Ответ принят. Наблюдение не засчитывается как выполненная проба.');
  }
 }catch(error){const invalid=form.querySelector<HTMLElement>(':invalid');const summary=$('form-error');summary.textContent=error instanceof Error?error.message:String(error);summary.focus();invalid?.setAttribute('aria-invalid','true');invalid?.setAttribute('aria-describedby','form-error');}
});
root.addEventListener('click',e=>{
 const target=(e.target as Element).closest<HTMLElement>('button');if(!target)return;
 if(target.classList.contains('planet-label'))return;
 try{if(research.click(target)){sync();return;}}catch(error){$('form-error').textContent=error instanceof Error?error.message:String(error);return;}
 if(target.dataset.day){
  const date=target.dataset.day,row=journey.data.observations.find(o=>o.eventDate===date);
  if(row){editObservationId=row.id;checkDraft={outcome:row.outcome,minutes:row.minutes===null?'':String(row.minutes),note:row.note,energy:row.energy};go('planet/aurora');}
  else if(date===today()){if(journey.stage===0)go('today');else{editObservationId=undefined;go('planet/aurora');}}
  else toast('В этот день нет записи. Не будем восстанавливать её как точную отметку: воспоминание можно добавить в контекст.');return;
 }
 if(target.dataset.track){goalTrack=target.dataset.track as Goal['track'];goalTitle=GOALS[goalTrack].title;goalCriterion=GOALS[goalTrack].criterion;goalPanel();return;}
 if(target.dataset.reflection){reflectionDraft=target.dataset.reflection;const t=document.querySelector<HTMLTextAreaElement>('[name=reflection]');if(t)t.value=reflectionDraft;return;}
 if(target.dataset.pace){selectedPace=target.dataset.pace as Plan['pace'];plansPanel();return;}
 if(target.dataset.planet){go(target.dataset.planet==='about'?'about':`planet/${target.dataset.planet}` as GalaxyRoute);return;}
 if(target.dataset.demoStage!==undefined){stopTour();previewStage(Number(target.dataset.demoStage));return;}
 const action=target.dataset.action;
 if(action==='observatory'){go('observatory');return;}
 if(action==='dismiss-space-hint'){spaceHintSeen=true;sync();return;}
 if(action==='encounter'){go('companion');return;}
 if(action==='context'){go('context');return;}
 if(action==='compare-plans'){go('plans');return;}
 if(action==='daily'){editObservationId=undefined;if(journey.stage===0)go('today');else go('planet/aurora');return;}
 if(action==='mission-small'||action==='mission-normal'){smallMission=action==='mission-small';checkPanel();return;}
 if(action==='allow-storage'&&!journey.demo){storageAllowed=true;persist();research.render('profile');toast(storageStatus==='saved'?'Ответы сохранены.':'Не удалось сохранить. Можно скачать экспорт.');return;}
 if(action==='forget-storage'&&!journey.demo){panel('Отключить сохранение?','ЛОКАЛЬНАЯ КОПИЯ',`<p>Будет удалена только сохранённая копия этой экспедиции в данном браузере. Текущие ответы останутся в памяти до закрытия страницы; их можно экспортировать. Обычный интерфейс не затрагивается.</p><button class="primary" data-action="confirm-forget">Удалить локальную копию</button><button class="text-button wide" data-action="cancel-forget">Отмена</button>`);return;}
 if(action==='cancel-forget'){research.render('profile');return;}
 if(action==='confirm-forget'&&!journey.demo){try{forgetExpedition(expeditionStore);storageAllowed=false;storageStatus='memory';research.render('profile');toast('Локальная копия удалена. Текущие ответы пока доступны для экспорта.');}catch{toast('Не удалось удалить локальную копию. Попробуй снова.');}return;}
 if((action==='demo-day'||action==='demo-month')&&journey.demo){stopTour();expedition={...expedition,demoDay:action==='demo-month'?29:Math.min(29,expedition.demoDay+1)};editObservationId=undefined;resetDrafts();sync();go('route');toast('Изменён только демонстрационный день. Отметки не добавлялись.');return;}
 if(action==='flight'||action==='map')scene?.setMode(action);
 if(tourTimer&&action!=='tour')stopTour();
 if(action==='start')go(!activeAccount&&!journey.demo?'register':nextResearchRoute(expedition.research??newResearch()));if(action==='about')go('about');if(action==='route')go('results');
 if(action==='overview'||action==='close-panel')go('galaxy');
 if(action==='zoom-in')scene?.zoom(1);if(action==='zoom-out')scene?.zoom(-1);
 if(action==='motion'){scene?.pause(!scene.paused);sync();if(route==='profile')research.render('profile');}
 if(action==='demo')enterDemo();if(action==='exit-demo')exitDemo();
 if(action==='demo-next'){stopTour();previewStage(Math.min(journey.stage+1,4));}
 if(action==='demo-reset'){stopTour();journey=newJourney(true);expedition=newExpedition('2026-10-03');editObservationId=undefined;resetDrafts();sync();go('about');}
 if(action==='tour'){if(tourTimer){stopTour();return;}tourIndex=0;go('about');tourTimer=setInterval(()=>{tourIndex++;if(tourIndex<=5)previewStage(Math.min(tourIndex-1,4));else{stopTour();go('galaxy');toast('Автообзор завершён. Теперь можно проверить каждый шаг самостоятельно.');}},6500);sync();}
 if(action==='read'){readerWasPaused=scene?.paused??true;scene?.pause(true);($('reader') as HTMLDialogElement).showModal();}
 if(action==='close-reader')($('reader') as HTMLDialogElement).close();
 if(action==='reader-start'){($('reader') as HTMLDialogElement).close();go('today');}
 if(action==='edit-goal'){goalTrack=journey.data.goal.track;goalTitle=journey.data.goal.title;goalCriterion=journey.data.goal.criterion;goalMinutes=journey.data.schedule.minutes;goalDays=[...journey.data.schedule.days];go('planet/origin');}
 if(action==='edit-observation'){const o=journey.data.observations.find(o=>o.id===target.dataset.observation);if(o){editObservationId=o.id;checkDraft={outcome:o.outcome,minutes:o.minutes===null?'':String(o.minutes),note:o.note,energy:o.energy};go('planet/aurora');}}
 if(action==='approve'){try{journey=finishJourney(journey,selectedPace,new Date().toISOString());sync();go('planet/solis');toast('План выбран. Это начало следующего этапа, не обещание достигнутой цели.');}catch(error){$('form-error').textContent=String(error instanceof Error?error.message:error);}}
 if(action==='export')exportResult();if(action==='reload')location.reload();
});
// Any direct interaction interrupts autoplay before it can replace a user's form.
const interruptTour=(e:Event)=>{if((e.target as Element).closest('#demo-dock'))return;if((e.target as Element).closest('#cosmos')){spaceHintSeen=true;sync();}if(tourTimer)stopTour();};
$('reader').addEventListener('close',()=>scene?.pause(readerWasPaused));
root.addEventListener('pointerdown',interruptTour);root.addEventListener('keydown',interruptTour);root.addEventListener('input',interruptTour);
window.addEventListener('hashchange',applyRoute);
const onEscape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!($('reader') as HTMLDialogElement).open&&route!=='galaxy')go('galaxy');};document.addEventListener('keydown',onEscape);
function graphicsFailed(){$('boot').hidden=true;$('graphics-error').hidden=false;}
try{scene=createGalaxyScene($('cosmos'),$('planet-labels'),{pick:id=>go(id==='about'?'about':`planet/${id}`),observatory:()=>go('observatory'),landed:yes=>{landing=yes;if(yes&&route==='about')$('landing-status').textContent='История Astra на скале. Можно приблизить или открыть удобное чтение.';},failed:graphicsFailed});scene.ready.then(()=>$('boot').hidden=true);applyRoute();if(new URLSearchParams(location.search).get('demo')==='1')enterDemo();}catch(error){console.error('Galaxy initialization failed',error);graphicsFailed();}
// Read-only diagnostics for the local test panel, never a mutation API.
const healthTimer=setInterval(()=>{root.dataset.sceneReady=String(!!scene);root.dataset.landed=String(landing);root.dataset.stage=String(journey.stage);root.dataset.demo=String(journey.demo);root.dataset.fps=String(scene?.stats.fps??0);},1000);
if(import.meta.hot)import.meta.hot.dispose(()=>{scene?.dispose();clearInterval(healthTimer);clearInterval(tourTimer);clearTimeout(toastTimer);window.removeEventListener('hashchange',applyRoute);document.removeEventListener('keydown',onEscape);});
