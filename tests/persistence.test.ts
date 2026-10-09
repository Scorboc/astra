import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/domain.ts";
import {
  SESSION_KEY,
  CONSENT_KEY,
  loadSession,
  saveSession,
} from "../src/persistence.ts";

function memoryStore() {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
test("PRIV: no storage writes without opt-in", () => {
  const storage = memoryStore();
  assert.equal(saveSession(storage, initialState(), false), "memory");
  assert.equal(storage.entries.size, 0);
});
test("Session and drafts survive a load after opt-in", () => {
  const storage = memoryStore();
  const state = initialState();
  state.draft = {
    energy: "Не знаю",
    outcome: "partial",
    minutes: "7",
    note: "Демо",
    requestId: "draft-1",
  };
  assert.equal(saveSession(storage, state, true), "saved");
  assert.deepEqual(loadSession(storage).state, state);
});
test("Failed write never returns saved", () => {
  const storage = memoryStore();
  storage.setItem = () => {
    throw new Error("QuotaExceeded");
  };
  assert.equal(saveSession(storage, initialState(), true), "error");
});
test("Unreadable storage yields a usable initial profile and honest error", () => {
  const storage = memoryStore();
  storage.getItem = () => {
    throw new Error("SecurityError");
  };
  const loaded = loadSession(storage);
  assert.equal(loaded.status, "error");
  assert.equal(loaded.allowed, false);
  assert.equal(loaded.state.schemaVersion, 1);
});
test("Corrupt or incompatible sessions do not crash the interface", () => {
  for (const raw of [
    "{",
    "null",
    JSON.stringify({ ...initialState(), schedule: { days: "bad" } }),
    JSON.stringify({ ...initialState(), observations: [{}] }),
    JSON.stringify({ ...initialState(), approvedPlan: {} }),
  ]) {
    const storage = memoryStore();
    storage.setItem(CONSENT_KEY, "yes");
    storage.setItem(SESSION_KEY, raw);
    assert.equal(loadSession(storage).status, "error");
  }
});
test("Unconsented old data is not loaded", () => {
  const storage = memoryStore();
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...initialState(), revision: 99 }),
  );
  assert.equal(loadSession(storage).state.revision, 1);
  assert.equal(loadSession(storage).status, "memory");
});
test("Incomplete form drafts survive reload without being replaced by committed values", () => {
  const storage = memoryStore();
  const state = initialState();
  state.goalDraft = { ...state.goal, title: "" };
  state.scheduleDraft = { ...state.schedule, time: "" };
  saveSession(storage, state, true);
  const restored = loadSession(storage).state;
  assert.equal(restored.goalDraft!.title, "");
  assert.equal(restored.scheduleDraft!.time, "");
});
