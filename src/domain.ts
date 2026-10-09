export const DEMO_TODAY = "2026-10-03";
export const DEMO_START = "2026-09-26";
export const SUBJECT = "demo-profile";
export const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export type Outcome = "done" | "partial" | "skipped";
export type Track = "creative" | "learning" | "business";
export type Theme = "system" | "light" | "dark";

export interface Goal {
  title: string;
  why: string;
  criterion: string;
  track: Track;
}
export interface Schedule {
  days: number[];
  minutes: number;
  time: string;
  budget: number;
}
export interface Observation {
  id: string;
  subjectId: string;
  eventDate: string;
  recordedAt: string;
  source: "SELF_REPORTED_ACTION";
  outcome: Outcome;
  minutes: number | null;
  note: string;
  energy: string;
  revision: number;
  retrospective: boolean;
}
export interface PlanItem {
  day: number;
  time: string;
  minutes: number;
  title: string;
  result: string;
}
export interface Plan {
  id: string;
  pace: "gentle" | "steady";
  goal: Goal;
  schedule: Schedule;
  basedOnRevision: number;
  evidenceIds: string[];
  items: PlanItem[];
  totalMinutes: number;
  cost: number;
  approvedAt?: string;
}
export interface CheckInDraft {
  energy: string;
  outcome: Outcome | "";
  minutes: string;
  note: string;
  requestId: string;
}
export interface DemoState {
  schemaVersion: 1;
  subjectId: string;
  revision: number;
  goal: Goal;
  schedule: Schedule;
  observations: Observation[];
  history: Observation[];
  processedRequests: string[];
  approvedPlan: Plan | null;
  draft: CheckInDraft | null;
  goalDraft: Goal | null;
  scheduleDraft: Schedule | null;
  theme: Theme;
  journalFilter: "all" | "done" | "skipped";
}
export interface Summary {
  ids: string[];
  recorded: number;
  completed: number;
  partial: number;
  skipped: number;
  missing: number;
  days: number;
  minutes: number;
  unknownMinutes: number;
}

export function initialState(): DemoState {
  const samples: [string, Outcome, number | null, string][] = [
    ["2026-09-26", "done", 15, "Выбрала три темы, о которых хочется писать."],
    ["2026-09-27", "done", 20, "Набросала начало первого текста."],
    [
      "2026-09-29",
      "partial",
      10,
      "Записала несколько мыслей, закончить не успела.",
    ],
    ["2026-09-30", "skipped", null, "Решила оставить вечер свободным."],
    ["2026-10-02", "done", 10, "Составила короткий план заметки."],
  ];
  return {
    schemaVersion: 1,
    subjectId: SUBJECT,
    revision: 1,
    goal: {
      title: "Начать свой творческий проект",
      why: "Хочу писать о том, что мне интересно, и найти свой ритм.",
      criterion: "Подготовить три короткие заметки за месяц.",
      track: "creative",
    },
    schedule: { days: [1, 3, 5], minutes: 40, time: "19:00", budget: 0 },
    observations: samples.map(([date, outcome, minutes, note], i) => ({
      id: `obs-${i + 1}`,
      subjectId: SUBJECT,
      eventDate: date,
      recordedAt: `${date}T20:00:00+03:00`,
      source: "SELF_REPORTED_ACTION",
      outcome,
      minutes,
      note,
      energy: "Обычный запас",
      revision: 1,
      retrospective: false,
    })),
    history: [],
    processedRequests: [],
    approvedPlan: null,
    draft: null,
    goalDraft: null,
    scheduleDraft: null,
    theme: "system",
    journalFilter: "all",
  };
}

export function validateGoal(goal: Goal): string | null {
  if (!goal.title.trim() || goal.title.length > 120)
    return "Укажите цель: от 1 до 120 символов.";
  if (!goal.criterion.trim() || goal.criterion.length > 240)
    return "Опишите результат: от 1 до 240 символов.";
  if (goal.why.length > 400) return "Сократите пояснение до 400 символов.";
  if (!["creative", "learning", "business"].includes(goal.track))
    return "Выберите направление.";
  return null;
}
export function validateSchedule(schedule: Schedule): string | null {
  if (
    !Array.isArray(schedule.days) ||
    new Set(schedule.days).size !== schedule.days.length ||
    schedule.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    return "Проверьте дни недели.";
  if (
    !Number.isInteger(schedule.minutes) ||
    schedule.minutes < 0 ||
    schedule.minutes > 120
  )
    return "Укажите от 0 до 120 минут на один день.";
  if (
    !Number.isFinite(schedule.budget) ||
    schedule.budget < 0 ||
    schedule.budget > 100000
  )
    return "Укажите бюджет от 0 до 100 000 ₽.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time))
    return "Укажите время в формате ЧЧ:ММ.";
  return null;
}

export function summarize(
  observations: Observation[],
  start = DEMO_START,
  end = "2026-10-02",
  subjectId = SUBJECT,
): Summary {
  const days = Math.max(
    0,
    Math.floor((Date.parse(end) - Date.parse(start)) / 86400000) + 1,
  );
  const rows = observations.filter(
    (o) =>
      o.subjectId === subjectId &&
      !o.retrospective &&
      o.eventDate >= start &&
      o.eventDate <= end,
  );
  const recordedDays = new Set(rows.map((o) => o.eventDate)).size;
  return {
    ids: rows.map((o) => o.id),
    recorded: rows.length,
    completed: rows.filter((o) => o.outcome === "done").length,
    partial: rows.filter((o) => o.outcome === "partial").length,
    skipped: rows.filter((o) => o.outcome === "skipped").length,
    missing: Math.max(0, days - recordedDays),
    days,
    minutes: rows.reduce((sum, o) => sum + (o.minutes ?? 0), 0),
    unknownMinutes: rows.filter((o) => o.minutes === null).length,
  };
}

export function getEvidence(state: DemoState, ids: string[]): Observation[] {
  return ids.map((id) => {
    const item = state.observations.find(
      (o) => o.id === id && o.subjectId === state.subjectId,
    );
    if (!item)
      throw new Error("Основание недоступно или не относится к этому профилю.");
    return item;
  });
}

const TASKS: Record<Track, [string, string][]> = {
  creative: [
    ["Выбрать одну идею", "Одна тема, с которой хочется начать."],
    [
      "Сделать небольшой набросок",
      "Черновик без требования идеального результата.",
    ],
    [
      "Вернуться к наброску",
      "Отметка: хочется продолжить, изменить или отложить.",
    ],
  ],
  learning: [
    ["Выбрать один вопрос", "Конкретный вопрос для изучения."],
    ["Попробовать на примере", "Один самостоятельно разобранный пример."],
    ["Проверить понимание", "Короткое объяснение своими словами."],
  ],
  business: [
    ["Сформулировать гипотезу", "Кому и какую проблему может решать идея."],
    ["Подготовить вопросы", "Три нейтральных вопроса о реальном опыте."],
    ["Определить способ проверки", "Один бесплатный шаг для проверки спроса."],
  ],
};

export function createPlan(state: DemoState, pace: Plan["pace"], evidenceEnd = "2026-10-02", evidenceStart = DEMO_START): Plan {
  const error = validateSchedule(state.schedule) || validateGoal(state.goal);
  if (error) throw new Error(error);
  const minutes = Math.min(pace === "gentle" ? 10 : 25, state.schedule.minutes);
  const selected = [...state.schedule.days].sort((a, b) => a - b).slice(0, 3);
  const items =
    minutes < 5
      ? []
      : selected.map((day, index) => ({
          day,
          time: state.schedule.time,
          minutes,
          title: TASKS[state.goal.track][index][0],
          result: TASKS[state.goal.track][index][1],
        }));
  const summary = summarize(state.observations, evidenceStart, evidenceEnd, state.subjectId);
  getEvidence(state, summary.ids);
  return {
    id: `plan-${state.revision}-${pace}`,
    pace,
    goal: structuredClone(state.goal),
    schedule: structuredClone(state.schedule),
    basedOnRevision: state.revision,
    evidenceIds: summary.ids,
    items,
    totalMinutes: items.reduce((sum, item) => sum + item.minutes, 0),
    cost: 0,
  };
}

export function updateGoal(state: DemoState, goal: Goal): DemoState {
  const error = validateGoal(goal);
  if (error) throw new Error(error);
  if (JSON.stringify(goal) === JSON.stringify(state.goal))
    return { ...state, goalDraft: null };
  return {
    ...state,
    goal: {
      ...goal,
      title: goal.title.trim(),
      criterion: goal.criterion.trim(),
    },
    goalDraft: null,
    revision: state.revision + 1,
  };
}
export function updateSchedule(
  state: DemoState,
  schedule: Schedule,
): DemoState {
  const error = validateSchedule(schedule);
  if (error) throw new Error(error);
  if (JSON.stringify(schedule) === JSON.stringify(state.schedule))
    return { ...state, scheduleDraft: null };
  return {
    ...state,
    schedule: structuredClone(schedule),
    scheduleDraft: null,
    revision: state.revision + 1,
  };
}

export function saveObservation(
  state: DemoState,
  draft: CheckInDraft,
  now: string,
  editId?: string,
  eventDate = DEMO_TODAY,
): DemoState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(Date.parse(eventDate)) || new Date(eventDate).toISOString().slice(0,10)!==eventDate)
    throw new Error('Некорректная дата отметки.');
  if (!draft.requestId || state.processedRequests.includes(draft.requestId))
    return state;
  if (!["done", "partial", "skipped"].includes(draft.outcome))
    throw new Error("Выберите результат или пропуск.");
  const minutes = draft.minutes.trim() === "" ? null : Number(draft.minutes);
  if (
    minutes !== null &&
    (!Number.isInteger(minutes) || minutes < 0 || minutes > 180)
  )
    throw new Error("Укажите от 0 до 180 минут или оставьте поле пустым.");
  if (draft.outcome === "skipped" && minutes !== null && minutes > 0)
    throw new Error("Для пропуска оставьте время пустым или укажите 0.");
  if (draft.note.length > 500)
    throw new Error("Сократите заметку до 500 символов.");
  const old = editId
    ? getEvidence(state, [editId])[0]
    : state.observations.find((o) => o.eventDate === eventDate);
  const row: Observation = {
    id: old?.id ?? (eventDate===DEMO_TODAY?'obs-today':`obs-${eventDate}`),
    subjectId: state.subjectId,
    eventDate: old?.eventDate ?? eventDate,
    recordedAt: now,
    source: "SELF_REPORTED_ACTION",
    outcome: draft.outcome as Outcome,
    minutes,
    note: draft.note.trim(),
    energy: draft.energy,
    revision: (old?.revision ?? 0) + 1,
    retrospective: old?.retrospective ?? false,
  };
  return {
    ...state,
    revision: state.revision + 1,
    observations: [
      ...state.observations.filter((o) => o.id !== row.id),
      row,
    ].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    history: old ? [...state.history, structuredClone(old)] : state.history,
    processedRequests: [...state.processedRequests, draft.requestId],
    draft: null,
  };
}

export function approvePlan(
  state: DemoState,
  pace: Plan["pace"],
  now: string,
  evidenceEnd = "2026-10-02",
  evidenceStart = DEMO_START,
): DemoState {
  const plan = createPlan(state, pace, evidenceEnd, evidenceStart);
  if (!plan.items.length)
    throw new Error("Сначала выберите доступный день и хотя бы 5 минут.");
  return { ...state, approvedPlan: { ...plan, approvedAt: now } };
}
export function isStale(state: DemoState): boolean {
  return (
    !!state.approvedPlan &&
    state.approvedPlan.basedOnRevision !== state.revision
  );
}

export function reportData(state: DemoState) {
  return {
    format: "astra-demo-report",
    schemaVersion: 1,
    synthetic: true,
    generatedForDate: DEMO_TODAY,
    subjectId: state.subjectId,
    revision: state.revision,
    goal: state.goal,
    schedule: state.schedule,
    period: { from: DEMO_START, to: "2026-10-02" },
    summary: summarize(state.observations),
    observations: state.observations,
    observationHistory: state.history,
    plan: state.approvedPlan,
    planStale: isStale(state),
    limitations: [
      "Все исходные примеры синтетические.",
      "Отметки о выполнении — самоотчёты, не независимые измерения.",
      "Пропуск и отсутствие записи различаются.",
      "Причинные связи и особенности личности не установлены.",
      "План составлен локальными правилами; внешний ИИ не подключён.",
    ],
  };
}
