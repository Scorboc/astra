import { initialState, validateGoal, validateSchedule } from "./domain.ts";
import type { DemoState, Observation, Plan } from "./domain.ts";

export const SESSION_KEY = "astra-demo-session-v1";
export const CONSENT_KEY = "astra-demo-storage-consent";
export type SaveStatus = "memory" | "saved" | "error";
export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function validObservation(value: Observation): boolean {
  return (
    !!value &&
    typeof value.id === "string" &&
    value.subjectId === "demo-profile" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.eventDate) &&
    typeof value.recordedAt === "string" &&
    value.source === "SELF_REPORTED_ACTION" &&
    ["done", "partial", "skipped"].includes(value.outcome) &&
    (value.minutes === null ||
      (Number.isInteger(value.minutes) &&
        value.minutes >= 0 &&
        value.minutes <= 180)) &&
    typeof value.note === "string" &&
    typeof value.energy === "string" &&
    typeof value.retrospective === "boolean" &&
    Number.isInteger(value.revision)
  );
}
function validPlan(value: Plan | null): boolean {
  return (
    value === null ||
    (!!value &&
      typeof value.id === "string" &&
      ["gentle", "steady"].includes(value.pace) &&
      !validateGoal(value.goal) &&
      !validateSchedule(value.schedule) &&
      Number.isInteger(value.basedOnRevision) &&
      Array.isArray(value.evidenceIds) &&
      value.evidenceIds.every((id) => typeof id === "string") &&
      Array.isArray(value.items) &&
      value.items.every(
        (i) =>
          !!i &&
          typeof i.title === "string" &&
          typeof i.result === "string" &&
          Number.isInteger(i.day) &&
          typeof i.time === "string" &&
          Number.isFinite(i.minutes),
      ) &&
      Number.isFinite(value.totalMinutes) &&
      Number.isFinite(value.cost))
  );
}

export function loadSession(storage: SessionStore): {
  state: DemoState;
  allowed: boolean;
  status: SaveStatus;
} {
  try {
    if (storage.getItem(CONSENT_KEY) !== "yes")
      return { state: initialState(), allowed: false, status: "memory" };
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return { state: initialState(), allowed: true, status: "memory" };
    const state: DemoState = JSON.parse(raw);
    if (
      !state ||
      state.schemaVersion !== 1 ||
      state.subjectId !== "demo-profile" ||
      !Number.isInteger(state.revision) ||
      validateGoal(state.goal) ||
      validateSchedule(state.schedule) ||
      !["system", "light", "dark"].includes(state.theme) ||
      !Array.isArray(state.observations) ||
      !state.observations.every(validObservation) ||
      !Array.isArray(state.history) ||
      !state.history.every(validObservation) ||
      !Array.isArray(state.processedRequests) ||
      !validPlan(state.approvedPlan)
    )
      throw new Error("Unsupported session");
    // Incomplete input is a valid draft; only discard malformed structures.
    if (
      state.goalDraft &&
      (typeof state.goalDraft.title !== "string" ||
        typeof state.goalDraft.why !== "string" ||
        typeof state.goalDraft.criterion !== "string" ||
        !["creative", "learning", "business"].includes(state.goalDraft.track))
    )
      state.goalDraft = null;
    if (
      state.scheduleDraft &&
      (!Array.isArray(state.scheduleDraft.days) ||
        typeof state.scheduleDraft.time !== "string" ||
        typeof state.scheduleDraft.minutes !== "number" ||
        typeof state.scheduleDraft.budget !== "number")
    )
      state.scheduleDraft = null;
    if (
      state.draft &&
      (typeof state.draft.note !== "string" ||
        typeof state.draft.minutes !== "string" ||
        typeof state.draft.requestId !== "string")
    )
      state.draft = null;
    if (!["all", "done", "skipped"].includes(state.journalFilter))
      state.journalFilter = "all";
    return { state, allowed: true, status: "saved" };
  } catch {
    return { state: initialState(), allowed: false, status: "error" };
  }
}

export function saveSession(
  storage: SessionStore,
  state: DemoState,
  allowed: boolean,
): SaveStatus {
  if (!allowed) return "memory";
  try {
    storage.setItem(CONSENT_KEY, "yes");
    storage.setItem(SESSION_KEY, JSON.stringify(state));
    return "saved";
  } catch {
    return "error";
  }
}
