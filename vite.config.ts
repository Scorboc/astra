import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: {
    target: ["es2022", "safari16.4"],
    rollupOptions: { input: { main: "index.html", spatial: "spatial/index.html", legacy: "spatial/legacy.html" } },
  },
});
