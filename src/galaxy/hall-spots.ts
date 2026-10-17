// Hall actions live on objects painted in each hall (owner-approved concept, 2026-10-16).
// x and y are fractions of the hall illustration (1672×941), so points stay on their objects at any size.
export type SpotSide = 'below' | 'above' | 'left' | 'right';
export type HallSpot = { label: string; object: string; x: number; y: number; side: SpotSide };
export type HallArt = { file: string; compactFile?: string; ratio: number; introRight?: boolean; spots: HallSpot[] };

const at = (label: string, object: string, x: number, y: number, side: SpotSide): HallSpot => ({ label, object, x: x / 1600, y: y / 900, side });

export const HALL_ART: Record<string, HallArt> = {
  origin: { file: 'origin-hall-cinematic-v3.webp', compactFile:'origin-hall-cinematic-v3-compact.webp', ratio:16/9, spots: [
    at('Мои желания', 'чаша с лавовым огнём', 200, 495, 'right'),
    at('Данные рождения', 'каменный алтарь со свечами', 1345, 520, 'left'),
    at('Астрология', 'армиллярная сфера на пьедестале', 820, 525, 'below'),
  ] },
  aurora: { file: 'aurora-hall-cinematic-v3.webp', compactFile:'aurora-hall-cinematic-v3-compact.webp', ratio:16/9, spots: [
    at('Вопросы и игры', 'голограмма книги', 345, 440, 'below'),
    at('Прогноз', 'сфера-глобус', 745, 445, 'below'),
    at('Проверки', 'голограмма кристалла', 1035, 458, 'right'),
  ] },
  velir: { file: 'velir-hall-cinematic-v3.webp', compactFile:'velir-hall-cinematic-v3-compact.webp', ratio:16/9, spots: [
    at('Итоги месяца', 'хрустальный стол с моделью города', 1025, 560, 'below'),
    at('Важные события', 'армиллярная сфера', 180, 445, 'right'),
    at('Вернуться к вопросам', 'винтовая лестница', 1450, 440, 'left'),
  ] },
  nereya: { file: 'nereya-hall-cinematic-v3.webp', compactFile:'nereya-hall-cinematic-v3-compact.webp', ratio:16/9, spots: [
    at('Время и ресурсы', 'малая армиллярная сфера у окна', 1440, 588, 'left'),
    at('Желания', 'звёздная роза на полу', 808, 712, 'above'),
    at('Накопленные сведения', 'стол со свитком', 125, 712, 'right'),
  ] },
  solis: { file: 'solis-hall-cinematic-v3.webp', compactFile:'solis-hall-cinematic-v3-compact.webp', ratio:16/9, spots: [
    at('Таблица по дням', 'светящиеся колонны', 70, 455, 'right'),
    at('Варианты продолжения', 'высокий кристалл', 1465, 430, 'left'),
    at('Следующий шаг', 'галерея у перил', 565, 575, 'below'),
  ] },
  observatory: { file: 'observatory-hall-cinematic-v3.webp', compactFile:'observatory-hall-cinematic-v3-compact.webp', ratio:1672/941, introRight: true, spots: [
    at('Астрология', 'армиллярная сфера', 335, 488, 'below'),
    at('Наблюдения', 'звёздная карта', 804, 507, 'below'),
    at('Мои пробы', 'друза кристаллов', 1340, 478, 'left'),
    at('Записи', 'книги на пьедестале', 190, 708, 'right'),
  ] },
};

export function hallSpot(room: string, label: string): HallSpot | undefined {
  return HALL_ART[room]?.spots.find((spot) => spot.label === label);
}
