import test from 'node:test';
import assert from 'node:assert/strict';
import { count, dayLabel, dayRange, monthLabel } from '../src/ru.ts';
import { researchInfographic, answerStatus } from '../src/galaxy/research-dashboard.ts';
import { exampleAccountSnapshot } from '../src/galaxy/example-account.ts';

test('russian plural forms follow the number', () => {
  const forms = ['запись', 'записи', 'записей'] as const;
  assert.equal(count(1, ...forms), '1 запись');
  assert.equal(count(3, ...forms), '3 записи');
  assert.equal(count(5, ...forms), '5 записей');
  assert.equal(count(11, ...forms), '11 записей');
  assert.equal(count(21, ...forms), '21 запись');
  assert.equal(count(23, ...forms), '23 записи');
});

test('days are shown in words, not ISO', () => {
  assert.equal(dayLabel('2026-10-15'), '15 октября');
  assert.equal(dayLabel('1992-05-14', true), '14 мая 1992');
  assert.equal(dayRange('2026-09-01', '2026-09-07'), '1–7 сентября');
  assert.equal(dayRange('2026-09-28', '2026-10-04'), '28 сентября – 4 октября');
  assert.equal(monthLabel('2026-10'), 'октябрь 2026');
});

test('journal counters agree in number with their labels', () => {
  const s = exampleAccountSnapshot('2026-10-15').expedition.research!;
  const html = researchInfographic(s);
  assert.ok(!/\b23<\/strong><span>вопросов/.test(html));
  assert.ok(!/<strong>3<\/strong><span>выполненных проб/.test(html));
  assert.ok(!/\d{4}-\d{2}-\d{2}<\/td>/.test(html));
});

test('a skipped game reads as skipped everywhere', () => {
  const s = exampleAccountSnapshot('2026-10-15').expedition.research!;
  const skipped = s.answers.find((a) => a.choices.includes('Пропустить'));
  assert.ok(skipped);
  assert.equal(answerStatus(skipped), 'Пропущено');
});
