import { initialState, updateGoal, updateSchedule, saveObservation, createPlan, approvePlan, summarize, DEMO_TODAY, DEMO_START } from '../domain.ts';
import type { DemoState, Goal, Schedule, CheckInDraft, Plan } from '../domain.ts';

export const PLANETS = [
  { id: 'origin', name: 'Исток', subtitle: 'Знакомство с тобой', color: '#6ee9d1', radius: 2.75, position: [-7, -.2, 4] },
  { id: 'aurora', name: 'Аврора', subtitle: 'Вопросы, игры и пробы', color: '#79e6a4', radius: 2.05, position: [-1.6, 2.1, -1.8] },
  { id: 'velir', name: 'Велир', subtitle: 'Что ты заметил', color: '#7cafee', radius: 1.65, position: [5.3, -1.1, .8] },
  { id: 'nereya', name: 'Нерея', subtitle: 'Выбор маршрута', color: '#89e5a5', radius: 1.9, position: [8.6, 3.1, -7] },
  { id: 'solis', name: 'Солис', subtitle: 'Итоги и следующий шаг', color: '#f1a39c', radius: 2.35, position: [.7, 5.2, -13] },
] as const;
// 'about' remains a legacy route alias, not a sixth physical world.
export type PlanetId = typeof PLANETS[number]['id'] | 'about';
// The older, separately preserved prototypes retain their original catalogue.
export const LEGACY_PLANETS=[...PLANETS,{id:'about',name:'Об Astra',subtitle:'История, высеченная в скале',color:'#dfc594',radius:1.45,position:[-10,4.6,-6]}] as const;
export type Journey = { data: DemoState; stage: number; reflection: string; reflectionHistory: string[]; demo: boolean; period?:{start:string;today:string} };
export const ABOUT_TITLE = 'Твоё направление. Твой путь.';
export const ABOUT_PARAGRAPHS = [
  'Сначала знакомимся: твои желания, данные рождения по желанию и реальные возможности. Не назначаем готовую цель.',
  'Около месяца: короткие вопросы, игры, воспоминания, наблюдения и добровольные пробы. Пропуск не обнуляет путь.',
  'Затем обсуждаем варианты и собираем персональную инструкцию. Приоритеты выбираешь ты, а не система.',
  'Астрология — отдельный видимый раздел. Расчёт, традиционная трактовка и твой ответ не смешиваются с доказанными фактами. Галактика не является натальной картой.',
];
export const GOALS: Record<Goal['track'], Goal> = {
  creative: { title: 'Начать творческий проект', why: 'Попробовать интересную идею без требования идеального результата.', criterion: 'Подготовить три коротких наброска за месяц.', track: 'creative' },
  learning: { title: 'Разобраться в новой теме', why: 'Понять, хочется ли углубляться дальше.', criterion: 'Разобрать три примера и объяснить их своими словами.', track: 'learning' },
  business: { title: 'Проверить идею проекта', why: 'Узнать о реальной потребности до расходов.', criterion: 'Сформулировать гипотезу и подготовить бесплатную проверку.', track: 'business' },
};
export function newJourney(demo = false): Journey {
  const data = initialState();
  return { data: { ...data, observations: [], history: [], processedRequests: [], approvedPlan: null, goal: { ...GOALS.creative }, schedule: { days: [1, 3, 5], minutes: 15, time: '19:00', budget: 0 } }, stage: 0, reflection: '', reflectionHistory: [], demo };
}
export function configureJourney(j: Journey, goal: Goal, schedule: Schedule): Journey {
  const data = updateSchedule(updateGoal(j.data, goal), schedule);
  return { ...j, data, stage: Math.max(1, Math.min(j.stage, 3)) };
}
export function recordJourney(j: Journey, draft: CheckInDraft, now: string, editId?:string): Journey {
  if (j.stage < 1) throw new Error('Сначала выбери цель и доступное время.');
  const data = saveObservation(j.data, draft, now, editId,j.period?.today??DEMO_TODAY);
  if (data === j.data) return j;
  return { ...j, data, stage: 2 };
}
export function reflectJourney(j: Journey, reflection: string): Journey {
  if (j.stage < 2 || !j.data.observations.length) throw new Error('Сначала сохрани отметку о пробе.');
  if (!reflection.trim() || reflection.length > 500) throw new Error('Выбери наблюдение или добавь до 500 символов.');
  if (j.reflection === reflection.trim()) return { ...j, stage: Math.max(3, j.stage) };
  return { ...j, stage: 3, reflection: reflection.trim(), reflectionHistory: j.reflection ? [...j.reflectionHistory, j.reflection] : j.reflectionHistory, data: { ...j.data, revision: j.data.revision + 1 } };
}
export function journeyPlans(j: Journey) { return (['gentle', 'steady'] as const).map(pace => createPlan(j.data, pace, j.period?.today??DEMO_TODAY,j.period?.start??DEMO_START)); }
export function finishJourney(j: Journey, pace: Plan['pace'], now: string): Journey {
  if (j.stage < 3 || !j.reflection) throw new Error('Сначала сохрани наблюдение.');
  return { ...j, data: approvePlan(j.data, pace, now, j.period?.today??DEMO_TODAY,j.period?.start??DEMO_START), stage: 4 };
}
export function journeySummary(j: Journey) { return summarize(j.data.observations, j.period?.start??DEMO_START, j.period?.today??DEMO_TODAY, j.data.subjectId); }
export function canVisit(j: Journey, id: PlanetId): boolean { return id === 'about' || PLANETS.findIndex(p => p.id === id) <= j.stage; }
export function demoAt(stage: number): Journey {
  if (!Number.isInteger(stage) || stage < 0 || stage > 4) throw new Error('Неизвестный этап демо.');
  let j = newJourney(true);
  if (stage > 0) j = configureJourney(j, j.data.goal, j.data.schedule);
  if (stage > 1) j = recordJourney(j, { outcome: 'partial', minutes: '7', note: 'Синтетический пример: набросал начало, хочу проверить другой темп.', energy: 'Обычный запас', requestId: 'demo-sample' }, '2026-10-03T12:00:00Z');
  if (stage > 2) j = reflectJourney(j, 'Попробую меньший шаг. Это наблюдение, не вывод о способностях.');
  if (stage > 3) j = finishJourney(j, 'gentle', '2026-10-03T12:03:00Z');
  return j;
}
export type GalaxyRoute = 'observatory' | 'journal' | 'plan' | 'login' | 'register' | 'galaxy' | 'about' | 'today' | 'route' | 'discoveries' | 'profile' | 'companion' | 'context' | 'plans' | 'welcome' | 'birth' | 'birth-review' | 'wishes' | 'wishes-review' | 'rhythm' | 'review' | 'memories' | 'research' | 'astrology' | 'forecast' | 'astro-checks' | 'results' | 'example' | `research/${string}` | `planet/${PlanetId}`;
export function parseRoute(hash: string): GalaxyRoute {
  const route = hash.replace(/^#\/?/, '');
  if (['observatory','journal','plan','login','register','galaxy','about','today','route','discoveries','profile','companion','context','plans','welcome','birth','birth-review','wishes','wishes-review','rhythm','review','memories','research','astrology','forecast','astro-checks','results','example'].includes(route)) return route as GalaxyRoute;
  if(route==='planet/about')return 'about';
  if(/^research\/\d{4}-\d{2}-\d{2}$/.test(route))return route as GalaxyRoute;
  if (route.startsWith('planet/') && PLANETS.some(p => p.id === route.slice(7))) return route as GalaxyRoute;
  return 'galaxy';
}
