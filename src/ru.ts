// Russian plural forms and human-readable dates for every counter and day the UI shows.
const pluralRules = new Intl.PluralRules("ru");

// ru(n, "запись", "записи", "записей"): 1 запись, 3 записи, 5 записей, 21 запись.
export function ru(n: number, one: string, few: string, many: string): string {
  const form = pluralRules.select(n);
  return form === "one" ? one : form === "few" ? few : many;
}

export function count(n: number, one: string, few: string, many: string): string {
  return `${n} ${ru(n, one, few, many)}`;
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const parse = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
};

// "2026-10-15" → "15 октября"; withYear → "15 октября 2026".
export function dayLabel(day: string, withYear = false): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return day;
  const { y, m, d } = parse(day);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

const MONTH_NAMES = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

// "2026-10" → "октябрь 2026".
export function monthLabel(month: string): string {
  if (!/^\d{4}-\d{2}/.test(month)) return month;
  const { y, m } = parse(month + "-01");
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// "2026-09-01","2026-09-07" → "1–7 сентября"; across months → "28 сентября – 4 октября".
export function dayRange(from: string, to: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(from) || !/^\d{4}-\d{2}-\d{2}/.test(to)) return `${from} — ${to}`;
  const a = parse(from), b = parse(to);
  if (from === to) return dayLabel(from);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]}`;
  return `${dayLabel(from)} – ${dayLabel(to)}`;
}
