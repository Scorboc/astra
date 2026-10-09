import { useEffect, useRef, useId } from "react";
import type { ReactNode, FormEvent } from "react";
import {
  X,
  ArrowLeft,
  Check,
  Clock3,
  Info,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Link } from "./router";
import { useStore } from "./store";
import { DAYS, updateSchedule } from "./domain";
import type { Schedule } from "./domain";

export function Tag({
  children,
  color = "",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function Back({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="back-link" href={href}>
      <ArrowLeft size={18} />
      {children}
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-description">{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Notice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`notice ${danger ? "danger" : ""}`}
      role={danger ? "alert" : undefined}
    >
      <Info size={19} />
      <div>{children}</div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const elements = [
          ...ref.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="sheet-header">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Закрыть окно"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
export function SettingRow({
  icon,
  title,
  detail,
  onClick,
  href,
  trailing,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  onClick?: () => void;
  href?: string;
  trailing?: ReactNode;
}) {
  const inner = (
    <>
      <span className="setting-icon">{icon}</span>
      <span className="setting-copy">
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </span>
      {trailing ?? <ChevronRight size={20} />}
    </>
  );
  return href ? (
    <Link className="setting-row" href={href}>
      {inner}
    </Link>
  ) : (
    <button className="setting-row" onClick={onClick}>
      {inner}
    </button>
  );
}
export function ScheduleSheet({ onClose }: { onClose: () => void }) {
  const { state, update } = useStore();
  const schedule = state.scheduleDraft ?? state.schedule;
  const set = (patch: Partial<Schedule>) =>
    update((s) => ({
      ...s,
      scheduleDraft: { ...(s.scheduleDraft ?? s.schedule), ...patch },
    }));
  const toggle = (day: number) =>
    set({
      days: schedule.days.includes(day)
        ? schedule.days.filter((d) => d !== day)
        : [...schedule.days, day].sort((a, b) => a - b),
    });
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update((s) => updateSchedule(s, s.scheduleDraft ?? s.schedule));
    onClose();
  };
  return (
    <Modal title="Ваше время для проекта" onClose={onClose}>
      <p className="muted">
        Выберите удобные окна. План будет учитывать только их.
      </p>
      <form onSubmit={save}>
        <fieldset>
          <legend>Дни недели</legend>
          <div className="day-picker">
            {DAYS.map((day, i) => (
              <button
                type="button"
                key={day}
                aria-pressed={schedule.days.includes(i)}
                className={schedule.days.includes(i) ? "selected" : ""}
                onClick={() => toggle(i)}
              >
                {day}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="form-columns">
          <label>
            Время начала
            <input
              type="time"
              required
              value={schedule.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </label>
          <label>
            Минут на один день
            <input
              type="number"
              min="0"
              max="120"
              required
              value={schedule.minutes}
              onChange={(e) => set({ minutes: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          Бюджет на неделю, ₽
          <input
            type="number"
            min="0"
            max="100000"
            required
            value={schedule.budget}
            onChange={(e) => set({ budget: Number(e.target.value) })}
          />
        </label>
        <div className="time-summary">
          <Clock3 size={20} />
          <strong>
            {schedule.days.length * schedule.minutes} мин в неделю
          </strong>
          <span>доступно для плана</span>
        </div>
        {(!schedule.days.length || schedule.minutes < 5) && (
          <Notice>
            Пока нет окна хотя бы на 5 минут. Новые действия не будут добавлены
            в план.
          </Notice>
        )}
        <p className="field-hint">
          При закрытии правки останутся черновиком. График изменится после
          сохранения.
        </p>
        <div className="actions">
          <button className="button primary" type="submit">
            <Check size={18} />
            Сохранить график
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              update((s) => ({ ...s, scheduleDraft: null }));
              onClose();
            }}
          >
            Отменить правки
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CheckCircle2 size={30} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "astra-demo-report.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
