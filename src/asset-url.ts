// Deployment base: "/" locally, "/astra/" on GitHub Pages (VITE_BASE).
// Falls back to "/" outside Vite, e.g. under the Node test runner.
export const BASE: string = import.meta.env?.BASE_URL ?? "/";

// App code uses root-relative paths ("/today", "/universe/x.webp");
// these helpers translate them to and from deployed URLs.
export function withBase(path: string, base = BASE): string {
  return `${base}${path.replace(/^\//, "")}`;
}

export function stripBase(pathname: string, base = BASE): string {
  if (base !== "/" && (pathname + "/").startsWith(base))
    return "/" + pathname.slice(base.length);
  return pathname;
}

export function assetUrl(path: string): string {
  return withBase(path);
}
