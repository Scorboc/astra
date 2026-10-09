import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Sun,
  Compass,
  Sparkles,
  UserRound,
  ChevronRight,
  Check,
  Plus,
  Clock3,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Flag,
  CircleHelp,
  ShieldCheck,
  Settings2,
  Download,
  Moon,
  Monitor,
  Bell,
  Trash2,
  Pencil,
  CheckCircle2,
  FileText,
  Leaf,
  Pause,
  Target,
} from "lucide-react";
import { Link, useRouter } from "./router";
import { useStore } from "./store";
import {
  DEMO_TODAY,
  DAYS,
  summarize,
  createPlan,
  saveObservation,
  updateGoal,
  validateGoal,
  approvePlan,
  isStale,
  reportData,
} from "./domain";
import type {
  CheckInDraft,
  Goal,
  Observation,
  Outcome,
  Plan,
  Track,
  Theme,
} from "./domain";
import {
  Back,
  PageHeading,
  Tag,
  Notice,
  Modal,
  SettingRow,
  ScheduleSheet,
  Empty,
  downloadJson,
} from "./components";

const NAV = [
  {
    href: "/spatial/#today",
    title: "Сегодня",
    icon: Sun,
    legacyPaths: ["/today"],
  },
  {
    href: "/spatial/#astrology",
    title: "Астрология",
    icon: Sparkles,
    legacyPaths: [] as string[],
  },
  {
    href: "/spatial/#results",
    title: "Результаты",
    icon: FileText,
    legacyPaths: ["/route", "/discoveries"],
  },
  {
    href: "/spatial/#profile",
    title: "Профиль",
    icon: UserRound,
    legacyPaths: ["/profile"],
  },
];
const OUTCOMES: Record<Outcome, string> = {
  done: "Сделано",
  partial: "Частично",
  skipped: "Пропуск",
};
const TRACKS: {
  id: Track;
  title: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    id: "creative",
    title: "Творческий проект",
    description: "Делать то, что интересно",
    icon: Pencil,
  },
  {
    id: "learning",
    title: "Обучение",
    description: "Освоить новое на практике",
    icon: BookOpen,
  },
  {
    id: "business",
    title: "Бизнес-гипотеза",
    description: "Проверить идею небольшим шагом",
    icon: Flag,
  },
];

function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">
        <Sparkles size={25} strokeWidth={1.5} />
      </span>
      astra<span className="logo-period">.</span>
    </span>
  );
}

export function App() {
  const { path } = useRouter();
  const { status, enableStorage, retry, allowStorage } = useStore();
  const current =
    NAV.find((item) =>
      item.legacyPaths.some((legacyPath) => path.startsWith(legacyPath)),
    ) ?? NAV[0];
  useEffect(() => {
    document.title = `${current.title} · Astra`;
  }, [current.title]);
  let page: ReactNode;
  if (path === "/today") page = <Today />;
  else if (path === "/today/check-in") page = <CheckIn />;
  else if (path === "/route") page = <RoutePage />;
  else if (path === "/route/setup") page = <GoalSetup />;
  else if (path === "/route/report") page = <Report />;
  else if (path === "/discoveries") page = <Discoveries />;
  else if (path === "/discoveries/evidence") page = <Evidence />;
  else if (path === "/profile") page = <Profile />;
  else if (path === "/profile/privacy") page = <Privacy />;
  else
    page = (
      <Empty
        title="Страница не найдена"
        action={
          <Link className="button primary" href="/today">
            Вернуться к сегодняшнему дню
          </Link>
        }
      >
        Эта ссылка не ведёт к разделу Astra.
      </Empty>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <aside className="sidebar">
        <Link
          className="brand-link"
          href="/spatial/#galaxy"
          aria-label="Astra — галактика"
        >
          <Logo />
        </Link>
        <p className="sidebar-label">ВАШЕ ПРОСТРАНСТВО</p>
        <nav aria-label="Основная навигация">
          {NAV.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${current.href === href ? "active" : ""}`}
              aria-current={current.href === href ? "page" : undefined}
            >
              <Icon size={22} />
              <span>{title}</span>
              {current.href === href && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-program">
            <span className="mini-orbit">
              <Compass size={23} />
            </span>
            <div>
              <strong>
                Маленькие шаги.
                <br />
                Ваше направление.
              </strong>
              <p>30 дней исследования себя</p>
            </div>
          </div>
          <Link className="sidebar-user" href="/spatial/#profile">
            <span className="avatar">Д</span>
            <span>
              <strong>Мой профиль</strong>
              <small>Маршрут активен</small>
            </span>
            <Settings2 size={18} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
          </div>
          <span className="breadcrumb">
            Моё пространство <ChevronRight size={15} />{" "}
            <strong>{current.title}</strong>
          </span>
          <div className="topbar-end">
            <a href="/spatial/#galaxy" className="demo-chip" aria-label="Открыть трёхмерную галактику">Галактика ↗</a>
            <span className="demo-chip">Демо</span>
            <span className="top-date">3 октября 2026</span>
            <Link
              href="/spatial/#profile"
              className="avatar small"
              aria-label="Открыть профиль"
            >
              Д
            </Link>
          </div>
        </header>
        <div
          className={`demo-notice ${status === "error" ? "storage-error" : ""}`}
        >
          <ShieldCheck size={17} />
          <p>
            {status === "error"
              ? "Хранилище недоступно. Изменения только в памяти — не закрывайте вкладку."
              : status === "saved"
                ? "Демонстрационные данные · изменения сохранены в этой вкладке. Не вводите личные сведения."
                : "Демонстрационные данные · изменения пока только в памяти вкладки."}
          </p>
          {status === "error" ? (
            <button onClick={allowStorage ? retry : enableStorage}>
              Повторить сохранение
            </button>
          ) : !allowStorage ? (
            <button onClick={enableStorage}>Разрешить сохранение демо</button>
          ) : (
            <Link href="/profile/privacy">Подробнее</Link>
          )}
        </div>
        <main id="main" tabIndex={-1} key={path}>
          {page}
        </main>
        <footer className="site-footer">
          <span>Astra · пространство для вашего следующего шага</span>
          <Link href="/profile/privacy">О демоданных</Link>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {NAV.map(({ href, title, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={current.href === href ? "active" : ""}
            aria-current={current.href === href ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Today() {
  const { state } = useStore();
  const summary = summarize(state.observations);
  const today = state.observations.find((o) => o.eventDate === DEMO_TODAY);
  const plan =
    state.approvedPlan && !isStale(state)
      ? state.approvedPlan
      : createPlan(state, "gentle");
  const task = plan.items.find((item) => item.day === 5);
  return (
    <>
      <PageHeading eyebrow="СУББОТА, 3 ОКТЯБРЯ" title="Ближе к тому, что ваше.">
        Один небольшой шаг сегодня. В вашем темпе.
      </PageHeading>
      <div className="today-grid">
        <div className="primary-column">
          <section
            className="week-strip"
            aria-label="Неделя с 28 сентября по 4 октября"
          >
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, i) => {
              const date = [
                "2026-09-28",
                "2026-09-29",
                "2026-09-30",
                "2026-10-01",
                "2026-10-02",
                "2026-10-03",
                "2026-10-04",
              ][i];
              const record = state.observations.find(
                (o) => o.eventDate === date,
              );
              return (
                <div
                  key={day}
                  className={`week-day ${i === 5 ? "today" : ""}`}
                  aria-current={i === 5 ? "date" : undefined}
                  aria-label={`${day}, ${formatDate(date)}: ${record ? OUTCOMES[record.outcome] : "нет записи"}`}
                >
                  <span>{day}</span>
                  <strong>{[28, 29, 30, 1, 2, 3, 4][i]}</strong>
                  <span className="day-mark">
                    {record?.outcome === "done" ? (
                      <Check size={12} />
                    ) : record?.outcome === "skipped" ? (
                      <Pause size={10} />
                    ) : i === 5 ? (
                      <span className="current-dot" />
                    ) : (
                      <span className="empty-dot" />
                    )}
                  </span>
                </div>
              );
            })}
          </section>
          <section className="mission-card">
            <div className="mission-top">
              <Tag color="on-blue">
                <Sun size={14} />
                {state.approvedPlan && !isStale(state)
                  ? "ВАШ ШАГ НА СЕГОДНЯ"
                  : "ПРОБА НА ВЫБОР"}
              </Tag>
              <span className="mission-number">01</span>
            </div>
            <div className="mission-content">
              <div className="mission-symbol">
                {today ? (
                  <CheckCircle2 size={42} strokeWidth={1.25} />
                ) : (
                  <Pencil size={40} strokeWidth={1.25} />
                )}
              </div>
              <h2>
                {today
                  ? "Сегодняшняя отметка готова."
                  : task
                    ? task.title
                    : "Оставьте место для паузы."}
              </h2>
              <p>
                {today
                  ? "Можно вернуться к записи, исправить её или спокойно продолжить день."
                  : task
                    ? task.result + " Достаточно одного маленького результата."
                    : "В графике пока нет подходящего окна. Можно изменить его или просто отметить свой день."}
              </p>
            </div>
            <div className="mission-meta">
              <span>
                <Clock3 size={17} />
                {task ? `${task.minutes} мин на действие` : "Без задания"}
              </span>
              <span>
                <Bookmark size={17} />2 мин на отметку
              </span>
            </div>
            <div className="mission-bottom">
              <Link href="/today/check-in" className="button white">
                {today
                  ? "Посмотреть отметку"
                  : state.draft
                    ? "Продолжить отметку"
                    : "Начать короткую отметку"}
              </Link>
              <span>
                Можно пропустить. <br />
                Прогресс останется с вами.
              </span>
            </div>
          </section>
          <section className="section-block">
            <div className="section-title">
              <h2>Что уже замечено</h2>
              <Link href="/discoveries">
                Все открытия <ChevronRight size={16} />
              </Link>
            </div>
            <Link href="/discoveries/evidence" className="insight-preview">
              <span className="tile-icon pale-blue">
                <Sparkles size={25} />
              </span>
              <div>
                <Tag>НАБЛЮДЕНИЕ</Tag>
                <h3>
                  {summary.recorded
                    ? `${summary.completed} завершённые пробы за неделю`
                    : "Первые наблюдения впереди"}
                </h3>
                <p>
                  {summary.recorded
                    ? `Из ${summary.recorded} записей за ${summary.days} дней. Это ваши отметки, а не оценка способностей.`
                    : "Отметьте несколько небольших действий, когда будет удобно."}
                </p>
                <span className="inline-link">
                  Посмотреть основания <ArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          </section>
          <div className="gentle-note">
            <Leaf size={21} />
            <p>
              Не каждый день должен быть продуктивным. Пауза тоже помогает
              понять свой ритм.
            </p>
          </div>
        </div>
        <aside className="secondary-column">
          <section className="card journey-card">
            <div className="section-title">
              <h2>Ваше исследование</h2>
              <Tag>30 дней</Tag>
            </div>
            <div className="journey-counter">
              <span
                className="progress-ring"
                role="img"
                aria-label="8-й день из 30 календарных дней демонстрационной программы"
              >
                <span>
                  <strong>
                    8<span>/30</span>
                  </strong>
                  <small>день программы</small>
                </span>
              </span>
            </div>
            <h3>Пробуем и наблюдаем</h3>
            <p className="muted">
              Сейчас важен опыт. Выводы могут меняться вместе с вами.
            </p>
            <ol className="journey-steps">
              <li className="complete">
                <span>
                  <Check size={14} />
                </span>
                <div>
                  <strong>Знакомимся с целями</strong>
                  <small>Дни 1–3</small>
                </div>
              </li>
              <li className="current">
                <span>2</span>
                <div>
                  <strong>Пробуем небольшие шаги</strong>
                  <small>Дни 4–21 · вы здесь</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Собираем свой маршрут</strong>
                  <small>Дни 22–30</small>
                </div>
              </li>
            </ol>
            <Link className="button secondary full" href="/route">
              Посмотреть маршрут
            </Link>
          </section>
          <section className="card focus-card">
            <span className="eyebrow">ВАШ ОРИЕНТИР</span>
            <Target size={24} />
            <h3>{state.goal.title}</h3>
            <p>{state.goal.criterion}</p>
            <Link href="/route/setup">
              Уточнить цель <ChevronRight size={16} />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function CheckIn() {
  const { state, update, status } = useStore();
  const existing = state.observations.find((o) => o.eventDate === DEMO_TODAY);
  const [initial] = useState<CheckInDraft>(() => ({
    energy: existing?.energy ?? "",
    outcome: existing?.outcome ?? "",
    minutes: existing?.minutes?.toString() ?? "",
    note: existing?.note ?? "",
    requestId: crypto.randomUUID(),
  }));
  const draft = state.draft ?? initial;
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<CheckInDraft>) =>
    update((s) => ({ ...s, draft: { ...(s.draft ?? initial), ...patch } }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      update((s) =>
        saveObservation(s, s.draft ?? initial, new Date().toISOString()),
      );
      setSaved(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (saved)
    return (
      <div className="narrow">
        <Back href="/today">Сегодня</Back>
        <section className="card success-card">
          <span className="success-icon">
            <CheckCircle2 size={38} />
          </span>
          <Tag color="green">ОТМЕТКА ПРИНЯТА</Tag>
          <h1>На сегодня достаточно.</h1>
          <p>
            {status === "saved"
              ? "Запись сохранена в текущей вкладке. Её можно исправить в журнале."
              : "Запись принята в память вкладки. Чтобы пережить перезагрузку, разрешите сохранение демо в баннере."}
          </p>
          <div className="actions">
            <Link className="button primary" href="/today">
              Вернуться к дню
            </Link>
            <Link className="button secondary" href="/discoveries">
              Открыть журнал
            </Link>
          </div>
        </section>
      </div>
    );
  return (
    <div className="narrow">
      <Back href="/today">Сегодня</Back>
      <PageHeading
        eyebrow={`КОРОТКАЯ ОТМЕТКА · ШАГ ${step} ИЗ 2`}
        title={step === 1 ? "Как вы сейчас?" : "Как прошёл ваш шаг?"}
      >
        {step === 1
          ? "Выберите то, что ближе. Здесь нет правильного ответа."
          : "Нас интересует ваш опыт, а не идеальный результат."}
      </PageHeading>
      <div className="step-progress" aria-label={`Шаг ${step} из 2`}>
        <span className="filled" />
        <span className={step === 2 ? "filled" : ""} />
      </div>
      <section className="card form-card">
        {step === 1 ? (
          <>
            <fieldset>
              <legend>Сколько сейчас сил?</legend>
              <div className="energy-options">
                {[
                  {
                    text: "Нужна пауза",
                    icon: Pause,
                    sub: "Хочется восстановиться",
                  },
                  {
                    text: "Обычный запас",
                    icon: Leaf,
                    sub: "Хватит на небольшой шаг",
                  },
                  {
                    text: "Есть энергия",
                    icon: Sun,
                    sub: "Готовы попробовать",
                  },
                  {
                    text: "Не знаю",
                    icon: CircleHelp,
                    sub: "Тоже подходящий ответ",
                  },
                ].map(({ text, icon: Icon, sub }) => (
                  <button
                    key={text}
                    className={`choice-row ${draft.energy === text ? "selected" : ""}`}
                    aria-pressed={draft.energy === text}
                    onClick={() => set({ energy: text })}
                  >
                    <Icon size={23} />
                    <span>
                      <strong>{text}</strong>
                      <small>{sub}</small>
                    </span>
                    <span className="choice-circle">
                      {draft.energy === text && <Check size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="actions">
              <button
                className="button primary"
                onClick={() => {
                  if (!draft.energy) set({ energy: "Не знаю" });
                  setStep(2);
                }}
              >
                Продолжить
              </button>
              <Link className="button text" href="/today">
                Продолжить позже
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <fieldset>
              <legend>Результат действия</legend>
              <div className="segmented outcomes">
                {(Object.keys(OUTCOMES) as Outcome[]).map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    aria-pressed={draft.outcome === outcome}
                    className={draft.outcome === outcome ? "selected" : ""}
                    onClick={() =>
                      set({
                        outcome,
                        ...(outcome === "skipped" ? { minutes: "" } : {}),
                      })
                    }
                  >
                    {OUTCOMES[outcome]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Сколько минут заняло действие?
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="180"
                placeholder="Не помню"
                value={draft.minutes}
                onChange={(e) => set({ minutes: e.target.value })}
              />
              <span className="field-hint">
                Пустое поле означает «неизвестно», а не ноль.
              </span>
            </label>
            <label>
              Что хотите заметить?{" "}
              <span className="optional">необязательно</span>
              <textarea
                rows={4}
                maxLength={500}
                value={draft.note}
                placeholder="Только вымышленный пример: что получилось, что мешало…"
                onChange={(e) => set({ note: e.target.value })}
              />
            </label>
            {existing && (
              <Notice>
                Исправление создаст новую версию. Прежняя запись сохранится в
                истории демопрофиля.
              </Notice>
            )}
            {error && <Notice danger>{error}</Notice>}
            <div className="actions">
              <button className="button primary" type="submit">
                Сохранить ответ
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                Назад
              </button>
            </div>
          </form>
        )}
        <p className="save-hint" role="status">
          {status === "saved"
            ? "Черновик сохраняется в текущей вкладке"
            : status === "error"
              ? "Ошибка хранения. Черновик только в памяти."
              : "Черновик в памяти вкладки. Не закрывайте её."}
        </p>
      </section>
    </div>
  );
}

function GoalSetup() {
  const { state, update } = useStore();
  const { navigate } = useRouter();
  const goal = state.goalDraft ?? state.goal;
  const [error, setError] = useState("");
  const set = (patch: Partial<Goal>) =>
    update((s) => ({
      ...s,
      goalDraft: { ...(s.goalDraft ?? s.goal), ...patch },
    }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = validateGoal(goal);
    if (error) {
      setError(error);
      return;
    }
    update((s) => updateGoal(s, goal));
    navigate("/route");
  };
  return (
    <div className="narrow">
      <Back href="/route">Маршрут</Back>
      <PageHeading eyebrow="ВАШ ОРИЕНТИР" title="Чему хочется дать место?">
        Цель выбираете вы. Её можно уточнять по ходу исследования.
      </PageHeading>
      <form className="card form-card" onSubmit={submit}>
        <fieldset>
          <legend>Направление</legend>
          <div className="track-options">
            {TRACKS.map(({ id, title, description, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={`choice-row ${goal.track === id ? "selected" : ""}`}
                aria-pressed={goal.track === id}
                onClick={() => set({ track: id })}
              >
                <Icon size={22} />
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <span className="choice-circle">
                  {goal.track === id && <Check size={14} />}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Моя цель
          <input
            required
            maxLength={120}
            value={goal.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </label>
        <label>
          Почему это для меня важно{" "}
          <span className="optional">необязательно</span>
          <textarea
            maxLength={400}
            rows={3}
            value={goal.why}
            onChange={(e) => set({ why: e.target.value })}
          />
        </label>
        <label>
          Какой небольшой результат хочу получить
          <input
            required
            maxLength={240}
            value={goal.criterion}
            onChange={(e) => set({ criterion: e.target.value })}
          />
          <span className="field-hint">
            Например: подготовить три заметки. Только вымышленный пример для
            демо.
          </span>
        </label>
        {error && <Notice danger>{error}</Notice>}
        <div className="actions">
          <button type="submit" className="button primary">
            Подтвердить цель
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              update((s) => ({ ...s, goalDraft: null }));
              navigate("/route");
            }}
          >
            Отменить правки
          </button>
        </div>
      </form>
    </div>
  );
}

function RoutePage() {
  const { state, update } = useStore();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pace, setPace] = useState<Plan["pace"]>(
    state.approvedPlan?.pace ?? "gentle",
  );
  const [message, setMessage] = useState("");
  const plan = createPlan(state, pace);
  const stale = isStale(state);
  const approve = () => {
    try {
      update((s) => approvePlan(s, pace, new Date().toISOString()));
      setMessage("План выбран. Сохранённая версия доступна в отчёте.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="ВАШ МАРШРУТ"
        title="Направление задаёте вы."
        action={
          <Link href="/route/report" className="button secondary">
            <FileText size={18} />
            Мой план
          </Link>
        }
      >
        Небольшие пробы сейчас. Предварительный ориентир на 90 дней.
      </PageHeading>
      <div className="route-top-grid">
        <section className="card goal-card">
          <span className="tile-icon pale-blue">
            <Flag size={24} />
          </span>
          <div>
            <Tag>МОЯ ЦЕЛЬ</Tag>
            <h2>{state.goal.title}</h2>
            <p>{state.goal.criterion}</p>
            <Link className="inline-link" href="/route/setup">
              <Pencil size={16} />
              Уточнить цель
            </Link>
          </div>
        </section>
        <section className="card schedule-card">
          <div className="section-title">
            <h2>В вашем графике</h2>
            <Clock3 size={21} />
          </div>
          <p className="big-number">
            {state.schedule.days.length * state.schedule.minutes}
            <span> мин / неделю</span>
          </p>
          <p className="muted">
            {state.schedule.days.length
              ? `${state.schedule.days.map((d) => DAYS[d]).join(", ")} · ${state.schedule.time}`
              : "Дни пока не выбраны"}{" "}
            · бюджет {state.schedule.budget.toLocaleString("ru-RU")} ₽
          </p>
          <button className="button text" onClick={() => setScheduleOpen(true)}>
            Изменить график
          </button>
        </section>
      </div>
      {stale && (
        <Notice>
          Цель, график или наблюдения изменились. Прежний план сохранён, но
          требует пересмотра и нового подтверждения.
        </Notice>
      )}
      <section className="section-block">
        <div className="section-title">
          <h2>Два способа начать</h2>
          <span className="muted">Следующая неделя</span>
        </div>
        <div className="plan-options">
          {(["gentle", "steady"] as const).map((p) => {
            const candidate = createPlan(state, p);
            return (
              <button
                key={p}
                className={`plan-option ${pace === p ? "selected" : ""}`}
                aria-pressed={pace === p}
                onClick={() => {
                  setPace(p);
                  setMessage("");
                }}
              >
                <span className="plan-option-icon">
                  {p === "gentle" ? <Leaf size={25} /> : <Compass size={25} />}
                </span>
                <span className="choice-circle">
                  {pace === p && <Check size={14} />}
                </span>
                <h3>
                  {p === "gentle"
                    ? "Бережный старт"
                    : "Чуть больше пространства"}
                </h3>
                <p>
                  {p === "gentle"
                    ? "Короткие пробы, чтобы познакомиться с процессом."
                    : "Больше времени на одну пробу, если вам комфортно."}
                </p>
                <strong>
                  {candidate.totalMinutes} мин в неделю{" "}
                  <span>· {candidate.items.length} шага · 0 ₽</span>
                </strong>
              </button>
            );
          })}
        </div>
      </section>
      <section className="card plan-detail">
        <div className="section-title">
          <div>
            <Tag color="blue">ПРЕДЛОЖЕНИЕ ДЛЯ ПРОВЕРКИ</Tag>
            <h2>Ваши ближайшие шаги</h2>
          </div>
          <span className="small-counter">
            {plan.totalMinutes} /{" "}
            {state.schedule.days.length * state.schedule.minutes} мин
          </span>
        </div>
        {plan.items.length ? (
          <ol className="plan-list">
            {plan.items.map((item, i) => (
              <li key={item.day}>
                <span className="step-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.result}</p>
                </div>
                <span className="plan-slot">
                  <strong>
                    {DAYS[item.day]}, {item.time}
                  </strong>
                  <span>{item.minutes} минут</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty
            title="Сначала найдём свободное окно"
            action={
              <button
                className="button secondary"
                onClick={() => setScheduleOpen(true)}
              >
                Изменить график
              </button>
            }
          >
            Для небольшого шага нужен хотя бы один день с пятью свободными
            минутами.
          </Empty>
        )}
        <div className="plan-rationale">
          <CircleHelp size={20} />
          <p>
            Почему такой план? Шаги выбраны по направлению вашей цели и
            доступному времени. Наблюдений пока недостаточно, чтобы утверждать,
            какой темп лучше.
          </p>
          <Link href="/discoveries/evidence">Основания</Link>
        </div>
        <div className="plan-footer">
          <button
            className="button primary"
            disabled={!plan.items.length}
            onClick={approve}
          >
            <Check size={18} />
            {state.approvedPlan?.id === plan.id && !stale
              ? "Подтвердить этот план ещё раз"
              : "Выбрать этот план"}
          </button>
          <span className="muted">
            Ничего не назначается без вашего выбора.
          </span>
        </div>
        {message && (
          <p role="status" className="success-message">
            {message} <Link href="/route/report">Открыть</Link>
          </p>
        )}
      </section>
      <section className="section-block horizon">
        <div className="section-title">
          <h2>Горизонт на 90 дней</h2>
          <Tag>Предварительно</Tag>
        </div>
        <div className="horizon-grid">
          <div>
            <span>01–30</span>
            <h3>Исследовать</h3>
            <p>Небольшие пробы и наблюдения. Можно менять направление.</p>
          </div>
          <div>
            <span>31–60</span>
            <h3>Выбрать и углубить</h3>
            <p>Если захочется продолжать — выбрать подходящий формат.</p>
          </div>
          <div>
            <span>61–90</span>
            <h3>Пересмотреть маршрут</h3>
            <p>Сопоставить результат с целью и решить, что делать дальше.</p>
          </div>
        </div>
      </section>
      {scheduleOpen && <ScheduleSheet onClose={() => setScheduleOpen(false)} />}
    </>
  );
}

function Discoveries() {
  const { state, update } = useStore();
  const summary = summarize(state.observations);
  const filter = state.journalFilter ?? "all";
  const setFilter = (journalFilter: "all" | "done" | "skipped") =>
    update((s) => ({ ...s, journalFilter }));
  const [editing, setEditing] = useState<Observation | null>(null);
  const [astro, setAstro] = useState(false);
  const rows = state.observations
    .filter((o) => filter === "all" || o.outcome === filter)
    .slice()
    .reverse();
  return (
    <>
      <PageHeading
        eyebrow="НАБЛЮДЕНИЯ И ОСНОВАНИЯ"
        title="Понемногу становится яснее."
        action={
          <Link href="/today/check-in" className="button secondary">
            <Plus size={18} />
            Отметить день
          </Link>
        }
      >
        Здесь ваши записи и проверяемые сводки. Выводы остаются
        предварительными.
      </PageHeading>
      <div className="stats-grid">
        <Stat
          title="Записей за неделю"
          value={`${summary.recorded}`}
          detail={`26 сентября — 2 октября · ${summary.days} дней`}
          icon={<BookOpen size={20} />}
        />
        <Stat
          title="Завершённых проб"
          value={`${summary.completed}`}
          detail={`Из ${summary.recorded} записей · по самоотчёту`}
          icon={<CheckCircle2 size={20} />}
        />
        <Stat
          title="Времени в записях"
          value={`${summary.minutes}`}
          unit="мин"
          detail={`${summary.unknownMinutes} запись без времени`}
          icon={<Clock3 size={20} />}
        />
      </div>
      <section className="card evidence-highlight">
        <span className="tile-icon pale-blue">
          <Sparkles size={27} />
        </span>
        <div>
          <Tag color="blue">ВЫЧИСЛЕННАЯ СВОДКА</Tag>
          <h2>
            {summary.recorded
              ? "Вы уже попробовали несколько небольших шагов."
              : "Пока недостаточно записей."}
          </h2>
          <p>
            За неделю: {summary.completed} завершённых пробы, {summary.partial}{" "}
            частичная, {summary.skipped} пропуск. Ещё за {summary.missing} дня
            нет записи. Отсутствие записи не означает, что вы ничего не делали.
          </p>
          <Link className="button text" href="/discoveries/evidence">
            Почему такой вывод? <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section-block">
        <div className="section-title">
          <h2>Журнал наблюдений</h2>
          <div className="segmented compact" aria-label="Фильтр журнала">
            {(
              [
                { id: "all", title: "Все" },
                { id: "done", title: "Сделано" },
                { id: "skipped", title: "Пропуски" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                aria-pressed={filter === f.id}
                className={filter === f.id ? "selected" : ""}
                onClick={() => setFilter(f.id)}
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>
        <div className="card journal">
          {rows.length ? (
            rows.map((row) => (
              <button
                className="journal-row"
                key={row.id}
                onClick={() => setEditing(row)}
              >
                <span className={`journal-icon ${row.outcome}`}>
                  {row.outcome === "done" ? (
                    <Check size={19} />
                  ) : row.outcome === "partial" ? (
                    <Pencil size={18} />
                  ) : (
                    <Pause size={18} />
                  )}
                </span>
                <span className="journal-content">
                  <span className="journal-meta">
                    {formatDate(row.eventDate)} · {OUTCOMES[row.outcome]}
                    {row.revision > 1 ? ` · версия ${row.revision}` : ""}
                  </span>
                  <strong>{row.note || "Без комментария"}</strong>
                  <span>
                    Самоотчёт ·{" "}
                    {row.minutes === null
                      ? "время не указано"
                      : `${row.minutes} мин`}
                  </span>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <Empty title="Таких записей пока нет">
              Выберите другой фильтр или вернитесь позже.
            </Empty>
          )}
        </div>
      </section>
      <section className="astro-card">
        <span className="tile-icon">
          <Moon size={24} />
        </span>
        <div>
          <div className="inline-heading">
            <h3>Символическая карта</h3>
            <Tag>Доступна</Tag>
          </div>
          <p>Отдельный добровольный слой. Не влияет на цели и основной план.</p>
        </div>
        <button className="button secondary" onClick={() => setAstro(true)}>
          Открыть раздел
        </button>
      </section>
      {editing && (
        <ObservationEditor
          observation={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {astro && (
        <Modal title="Символическая карта" onClose={() => setAstro(false)}>
          <p>
            Карта, фокус дня и история проверок находятся в отдельном разделе.
            Можно выбрать открытый просмотр или сначала ответить о своём дне.
          </p>
          <p>
            Символический слой всегда показывается отдельно от практического
            маршрута и не меняет задания.
          </p>
          <Notice>
            Астрология не является доказанным основанием для выбора профессии,
            способностей или важных жизненных решений.
          </Notice>
          <button
            className="button secondary full"
            onClick={() => { window.location.href = "/spatial/#astrology"; }}
          >
            Перейти к карте
          </button>
        </Modal>
      )}
    </>
  );
}

function Stat({
  title,
  value,
  unit,
  detail,
  icon,
}: {
  title: string;
  value: string;
  unit?: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <section className="card stat-card">
      <div>
        <span>{title}</span>
        {icon}
      </div>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <p>{detail}</p>
    </section>
  );
}
function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function Evidence() {
  const { state } = useStore();
  const summary = summarize(state.observations);
  const [editing, setEditing] = useState<Observation | null>(null);
  return (
    <div className="reading-width">
      <Back href="/discoveries">Открытия</Back>
      <PageHeading eyebrow="ПРОЗРАЧНЫЕ ОСНОВАНИЯ" title="Что стоит за сводкой">
        26 сентября — 2 октября · версия данных {state.revision}
      </PageHeading>
      <section className="card form-card">
        <Tag color="blue">ВЫЧИСЛЕНИЕ ПО ЗАПИСЯМ</Tag>
        <h2>
          {summary.completed} завершённых пробы из {summary.recorded} записей
        </h2>
        <p>
          Считаем записи со статусом «Сделано» в выбранном периоде. Частичные
          действия и пропуски показываем отдельно. Продолжительность — сумма
          только известных значений.
        </p>
        <div className="evidence-numbers">
          <span>
            <strong>{summary.completed}</strong>сделано
          </span>
          <span>
            <strong>{summary.partial}</strong>частично
          </span>
          <span>
            <strong>{summary.skipped}</strong>пропуск
          </span>
          <span>
            <strong>{summary.missing}</strong>дня без записи
          </span>
        </div>
        <h3>На какие записи опираемся</h3>
        <div className="evidence-sources">
          {summary.ids.map((id) => {
            const row = state.observations.find((o) => o.id === id)!;
            return (
              <button
                key={id}
                className="evidence-source"
                onClick={() => setEditing(row)}
              >
                <BookOpen size={18} />
                <span>
                  <strong>
                    {formatDate(row.eventDate)} · {OUTCOMES[row.outcome]}
                  </strong>
                  <small>
                    {row.minutes === null
                      ? "Время неизвестно"
                      : `${row.minutes} минут`}{" "}
                    · самоотчёт · версия {row.revision}
                  </small>
                </span>
                <Pencil size={16} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="card form-card">
        <h2>Что из этого не следует</h2>
        <ul className="plain-list">
          <li>Отметка подтверждает ваш ответ, но не качество выполнения.</li>
          <li>
            Эти данные не измеряют талант, интеллект или профессиональную
            пригодность.
          </li>
          <li>
            Задания и обстоятельства различались. Нельзя считать, что именно
            короткий формат вызвал результат.
          </li>
          <li>Неделя наблюдений не доказывает устойчивую привычку.</li>
        </ul>
        <Notice>
          Эти наблюдения помогают выбрать следующую пробу, но не измеряют
          способности и не обещают результат.
        </Notice>
        <h3>Что можно проверить дальше</h3>
        <p>
          Если вам подходит цель, попробуйте один небольшой шаг в доступное
          время. После отметки решите, хочется ли продолжать. Выбор темпа
          остаётся за вами.
        </p>
        <Link href="/route" className="button secondary">
          Посмотреть варианты плана
        </Link>
      </section>
      {editing && (
        <ObservationEditor
          observation={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ObservationEditor({
  observation,
  onClose,
}: {
  observation: Observation;
  onClose: () => void;
}) {
  const { update } = useStore();
  const [draft, setDraft] = useState<CheckInDraft>({
    energy: observation.energy,
    outcome: observation.outcome,
    minutes: observation.minutes?.toString() ?? "",
    note: observation.note,
    requestId: crypto.randomUUID(),
  });
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const set = (patch: Partial<CheckInDraft>) => {
    setChanged(true);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const close = () => {
    if (changed) setConfirmClose(true);
    else onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      update((s) =>
        saveObservation(s, draft, new Date().toISOString(), observation.id),
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      title={`Запись · ${formatDate(observation.eventDate)}`}
      onClose={close}
    >
      <p className="muted">
        Самоотчёт · версия {observation.revision}. Исправление сохранится новой
        версией и обновит сводку.
      </p>
      <form onSubmit={submit}>
        <label>
          Результат
          <select
            value={draft.outcome}
            onChange={(e) =>
              set({
                outcome: e.target.value as Outcome,
                ...(e.target.value === "skipped" ? { minutes: "" } : {}),
              })
            }
          >
            {Object.entries(OUTCOMES).map(([value, title]) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Время, минут
          <input
            type="number"
            min="0"
            max="180"
            value={draft.minutes}
            placeholder="Неизвестно"
            onChange={(e) => set({ minutes: e.target.value })}
          />
        </label>
        <label>
          Наблюдение
          <textarea
            rows={4}
            maxLength={500}
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>
        {error && <Notice danger>{error}</Notice>}
        {confirmClose && (
          <Notice>
            Есть несохранённые правки. Продолжите редактирование или нажмите
            «Отменить правки», чтобы закрыть окно.
          </Notice>
        )}
        <div className="actions">
          <button className="button primary" type="submit">
            Сохранить исправление
          </button>
          <button className="button secondary" type="button" onClick={onClose}>
            Отменить правки
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Report() {
  const { state } = useStore();
  const data = reportData(state);
  const plan = data.plan;
  if (!plan)
    return (
      <div className="narrow">
        <Back href="/route">Маршрут</Back>
        <PageHeading title="Мой план" />
        <section className="card">
          <Empty
            title="План ещё не выбран"
            action={
              <Link className="button primary" href="/route">
                Выбрать подходящий вариант
              </Link>
            }
          >
            На странице маршрута сравните два темпа и подтвердите свой выбор.
          </Empty>
        </section>
      </div>
    );
  return (
    <div className="reading-width">
      <Back href="/route">Маршрут</Back>
      <PageHeading
        eyebrow="СОХРАНЁННЫЙ ПЛАН · ДЕМО"
        title="Ваш следующий шаг"
        action={
          <button
            className="button secondary"
            onClick={() => downloadJson(data)}
          >
            <Download size={18} />
            Скачать JSON
          </button>
        }
      >
        Версия {plan.basedOnRevision} ·{" "}
        {plan.pace === "gentle" ? "бережный старт" : "больше пространства"}
      </PageHeading>
      {data.planStale && (
        <Notice>
          Этот план основан на прежней версии данных. Откройте маршрут, чтобы
          пересмотреть и подтвердить новый вариант.
        </Notice>
      )}
      <article className="card report-card">
        <div className="report-header">
          <Logo />
          <Tag color="blue">ПРЕДВАРИТЕЛЬНЫЙ ПЛАН</Tag>
        </div>
        <h2>{plan.goal.title}</h2>
        <p className="report-criterion">{plan.goal.criterion}</p>
        <div className="report-facts">
          <div>
            <span>Период</span>
            <strong>Следующая неделя</strong>
          </div>
          <div>
            <span>Действия</span>
            <strong>{plan.totalMinutes} мин / неделю</strong>
          </div>
          <div>
            <span>Расходы на шаги</span>
            <strong>{plan.cost} ₽</strong>
          </div>
        </div>
        <ol className="plan-list">
          {plan.items.map((item, i) => (
            <li key={item.day}>
              <span className="step-index">{i + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.result}</p>
                <small>
                  {DAYS[item.day]} · {item.time} · {item.minutes} мин
                </small>
              </div>
            </li>
          ))}
        </ol>
        <h3>Если обстоятельства изменятся</h3>
        <p>
          Можно сократить шаг, перенести его или пропустить. Измените график и
          подтвердите новый вариант. Пересмотр — после следующей недели проб или
          раньше, если цель перестала подходить.
        </p>
        <h3>Основания и ограничения</h3>
        <p>
          Направление выбрано по вашей цели, нагрузка ограничена вашим графиком.
          Записи используются как контекст и не доказывают, что выбранный темп
          лучше альтернативы.
        </p>
        <p>
          К этому снимку плана привязаны {plan.evidenceIds.length} записей.{" "}
          {data.planStale
            ? "Текущая сводка уже изменилась; сохранённые шаги показаны без пересчёта."
            : `В текущей недельной сводке ${data.summary.completed} завершённых пробы из ${data.summary.recorded} записей.`}
        </p>
        <Notice>
          Отчёт собран из ответов, отметок и истории изменений. Выбранный
          маршрут можно пересмотреть в любой момент.
        </Notice>
      </article>
      <div className="actions no-print">
        <button className="button secondary" onClick={() => window.print()}>
          <FileText size={18} />
          Распечатать / сохранить PDF
        </button>
        <Link className="button text" href="/route">
          Пересмотреть план
        </Link>
      </div>
    </div>
  );
}

function Profile() {
  const { state, update, clear, status } = useStore();
  const [modal, setModal] = useState<
    "delete" | "notifications" | "about" | null
  >(null);
  return (
    <>
      <PageHeading eyebrow="ВАШЕ ПРОСТРАНСТВО" title="Всё под вашим контролем.">
        Настройки, данные и удобный для вас режим.
      </PageHeading>
      <div className="profile-layout">
        <section className="card profile-identity">
          <span className="avatar large">Д</span>
          <h2>Мой профиль</h2>
          <p>Личное пространство и история путешествия</p>
          <Tag color="blue">Маршрут активен · 18+</Tag>
          <div className="profile-fact">
            <ShieldCheck size={20} />
            <span>
              Ответы, решения и изменения
              <br />
              собраны в одном месте
            </span>
          </div>
        </section>
        <div className="profile-settings">
          <section className="card settings-card">
            <h2>Как вам удобнее</h2>
            <div className="theme-setting">
              <span>
                <Monitor size={21} />
                <strong>Оформление</strong>
              </span>
              <div className="segmented" aria-label="Тема оформления">
                {(
                  [
                    { id: "system", title: "Авто", icon: Monitor },
                    { id: "light", title: "Светлая", icon: Sun },
                    { id: "dark", title: "Тёмная", icon: Moon },
                  ] as const
                ).map(({ id, title, icon: Icon }) => (
                  <button
                    key={id}
                    aria-pressed={state.theme === id}
                    className={state.theme === id ? "selected" : ""}
                    onClick={() =>
                      update((s) => ({ ...s, theme: id as Theme }))
                    }
                  >
                    <Icon size={17} />
                    {title}
                  </button>
                ))}
              </div>
            </div>
            <SettingRow
              icon={<Bell size={21} />}
              title="Ритм прохождения"
              detail="В удобное время, без обязательной серии"
              onClick={() => setModal("notifications")}
            />
          </section>
          <section className="card settings-card">
            <h2>Ваши данные</h2>
            <SettingRow
              icon={<ShieldCheck size={21} />}
              title="Приватность и хранение"
              detail={
                status === "saved"
                  ? "Все изменения сохранены"
                  : "Сохранение можно включить"
              }
              href="/profile/privacy"
            />
            <SettingRow
              icon={<Download size={21} />}
              title="Скачать резервную копию"
              detail="Ответы, история исправлений и маршрут · JSON"
              onClick={() => downloadJson(reportData(state))}
            />
            <SettingRow
              icon={<Trash2 size={21} />}
              title="Начать маршрут заново"
              detail="Сбросить текущий прогресс"
              onClick={() => setModal("delete")}
            />
          </section>
          <section className="card settings-card">
            <SettingRow
              icon={<CircleHelp size={21} />}
              title="Как работает Astra"
              detail="Планеты, исследования и персональный маршрут"
              onClick={() => setModal("about")}
            />
          </section>
        </div>
      </div>
      {modal === "delete" && (
        <Modal title="Сбросить изменения демо?" onClose={() => setModal(null)}>
          <p>
            Ваши изменения цели, записей и плана в этой вкладке будут удалены.
            Вернётся исходный синтетический пример. Отменить сброс нельзя; перед
            этим можно скачать демоданные.
          </p>
          <div className="actions">
            <button
              className="button secondary"
              autoFocus
              onClick={() => setModal(null)}
            >
              Оставить данные
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                clear();
                setModal(null);
              }}
            >
              Сбросить демо
            </button>
          </div>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Ритм прохождения" onClose={() => setModal(null)}>
          <p>
            Возвращайтесь тогда, когда удобно. Пропуск дня не обнуляет маршрут,
            а незавершённый ответ можно продолжить позже.
          </p>
          <Notice>
            Текущее действие всегда находится в разделе «Сегодня».
          </Notice>
          <button
            className="button secondary full"
            onClick={() => setModal(null)}
          >
            Закрыть
          </button>
        </Modal>
      )}
      {modal === "about" && (
        <Modal title="Как работает Astra" onClose={() => setModal(null)}>
          <p>
            Вы начинаете с желаний и реальных условий, затем проходите короткие
            вопросы, игры и добровольные пробы. Каждая планета открывает новый
            слой путешествия — от знакомства до выбранного маршрута.
          </p>
          <p>
            Наблюдения можно исправлять с сохранением истории. Результат не
            назначается автоматически: перед финалом вы сравниваете варианты и
            сами выбираете направление.
          </p>
          <button
            className="button secondary full"
            onClick={() => setModal(null)}
          >
            Закрыть
          </button>
        </Modal>
      )}
    </>
  );
}

function Privacy() {
  const { status, allowStorage, enableStorage } = useStore();
  return (
    <div className="reading-width">
      <Back href="/profile">Профиль</Back>
      <PageHeading eyebrow="ПРОЗРАЧНОСТЬ" title="Где находятся демоданные">
        Текущая версия предназначена для проверки интерфейса на вымышленных
        примерах.
      </PageHeading>
      <section className="card form-card">
        <div className="privacy-line">
          <ShieldCheck size={27} />
          <div>
            <h2>
              {status === "saved"
                ? "В хранилище текущей вкладки"
                : "В памяти текущей вкладки"}
            </h2>
            <p>
              {status === "saved"
                ? "Изменения переживают перезагрузку этой вкладки. Браузер может восстановить сессию; для явного удаления используйте сброс в профиле."
                : "После закрытия или перезагрузки изменения могут пропасть."}
            </p>
          </div>
        </div>
        {!allowStorage && (
          <button className="button primary" onClick={enableStorage}>
            Разрешить сохранение демо
          </button>
        )}
        <h3>Что передаётся наружу</h3>
        <p>
          Приложение не вызывает внешние ИИ, аналитические сервисы, рекламные
          сети или внешние шрифты. Сервер разработки доставляет файлы сайта
          локально; введённые значения остаются в браузере.
        </p>
        <h3>Для каких данных это подходит</h3>
        <p>
          Только для синтетических примеров. Здесь нет аккаунтов и защищённого
          хранилища реальных анкет. Не вводите имя, контакты, сведения о
          здоровье, данные рождения или личный дневник.
        </p>
        <h3>Как удалить изменения</h3>
        <p>
          В профиле выберите «Сбросить изменения демо». Будет очищено хранилище
          Astra в этой вкладке и восстановлен исходный вымышленный пример. Ранее
          скачанные файлы удаляются отдельно.
        </p>
        <Link href="/profile" className="button secondary">
          Вернуться в профиль
        </Link>
      </section>
    </div>
  );
}
