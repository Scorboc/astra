import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Router } from "./router";
import { StoreProvider } from "./store";
import "./styles.css";
import { stripBase, withBase } from "./asset-url";

if (stripBase(location.pathname) === "/") {
  location.replace(withBase("/spatial/"));
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <StoreProvider>
        <Router>
          <App />
        </Router>
      </StoreProvider>
    </StrictMode>,
  );
}
