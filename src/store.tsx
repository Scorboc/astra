import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { initialState } from "./domain";
import type { DemoState } from "./domain";
import {
  SESSION_KEY,
  CONSENT_KEY,
  loadSession,
  saveSession,
} from "./persistence";
import type { SaveStatus } from "./persistence";

interface Store {
  state: DemoState;
  update: (change: (state: DemoState) => DemoState) => void;
  status: SaveStatus;
  enableStorage: () => void;
  retry: () => void;
  clear: () => void;
  allowStorage: boolean;
}
const Context = createContext<Store | null>(null);

function load(): { state: DemoState; allowed: boolean; status: SaveStatus } {
  try {
    return loadSession(sessionStorage);
  } catch {
    return { state: initialState(), allowed: false, status: "error" };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(load);
  const [state, setState] = useState(loaded.state);
  const current = useRef(state);
  const [allowStorage, setAllowed] = useState(loaded.allowed);
  const [status, setStatus] = useState<SaveStatus>(loaded.status);
  const persist = (value: DemoState, allowed = allowStorage) => {
    if (!allowed) {
      setStatus("memory");
      return;
    }
    try {
      setStatus(saveSession(sessionStorage, value, allowed));
    } catch {
      setStatus("error");
    }
  };
  const update = (change: (value: DemoState) => DemoState) => {
    const next = change(current.current);
    current.current = next;
    setState(next);
    persist(next);
  };
  const enableStorage = () => {
    setAllowed(true);
    persist(current.current, true);
  };
  const clear = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(CONSENT_KEY);
    } catch {
      setStatus("error");
      return;
    }
    const fresh = initialState();
    current.current = fresh;
    setState(fresh);
    setAllowed(false);
    setStatus("memory");
  };
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        state.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : state.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state.theme]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        status !== "saved" &&
        (state.revision > 1 || state.draft || state.goalDraft)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status, state]);
  return (
    <Context.Provider
      value={{
        state,
        update,
        status,
        enableStorage,
        retry: () => persist(current.current),
        clear,
        allowStorage,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("Store is missing");
  return context;
}
