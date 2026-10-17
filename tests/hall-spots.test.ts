import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HALL_ART, hallSpot } from '../src/galaxy/hall-spots.ts';

// Every action button in every hall must have a point on the art.
const ACTIONS: Record<string, string[]> = {
  origin: ['Мои желания', 'Данные рождения', 'Астрология'],
  aurora: ['Вопросы и игры', 'Прогноз', 'Проверки'],
  velir: ['Итоги месяца', 'Важные события', 'Вернуться к вопросам'],
  nereya: ['Время и ресурсы', 'Желания', 'Накопленные сведения'],
  solis: ['Таблица по дням', 'Варианты продолжения', 'Следующий шаг'],
  observatory: ['Астрология', 'Наблюдения', 'Мои пробы', 'Записи'],
};

test('every hall action has a point on its own object', () => {
  for (const [room, labels] of Object.entries(ACTIONS)) {
    for (const label of labels) assert.ok(hallSpot(room, label), `${room}: ${label}`);
    assert.equal(HALL_ART[room].spots.length, labels.length, room);
  }
});

test('points stay inside the art and do not stack on each other', () => {
  for (const [room, art] of Object.entries(HALL_ART)) {
    for (const s of art.spots) {
      assert.ok(s.x > 0.02 && s.x < 0.98 && s.y > 0.1 && s.y < 0.95, `${room}: ${s.label} at ${s.x},${s.y}`);
    }
    for (let i = 0; i < art.spots.length; i++)
      for (let j = i + 1; j < art.spots.length; j++)
        assert.ok(Math.hypot(art.spots[i].x - art.spots[j].x, art.spots[i].y - art.spots[j].y) > 0.08, `${room}: ${art.spots[i].label} / ${art.spots[j].label}`);
  }
});

test('hall labels match the actions the halls actually render', () => {
  const source = readFileSync(new URL('../src/galaxy/research-ui.ts', import.meta.url), 'utf8');
  for (const labels of Object.values(ACTIONS)) for (const label of labels) assert.ok(source.includes(`'${label}'`), label);
});
