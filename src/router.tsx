import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import type { ReactNode, MouseEvent, AnchorHTMLAttributes } from "react";

const RouterContext = createContext({
  path: "/spatial/",
  navigate: (_path: string) => {},
});
const positions = new Map<string, number>();
export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(
    location.pathname === "/" ? "/spatial/" : location.pathname,
  );
  const [popped, setPopped] = useState(false);
  useEffect(() => {
    if (location.pathname === "/") history.replaceState({}, "", "/spatial/");
    history.scrollRestoration = "manual";
    const onPop = () => {
      setPopped(true);
      setPath(location.pathname);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>("#main");
    main?.focus({ preventScroll: true });
    window.scrollTo(0, popped ? (positions.get(path) ?? 0) : 0);
    const scroll = () => positions.set(path, window.scrollY);
    window.addEventListener("scroll", scroll);
    return () => window.removeEventListener("scroll", scroll);
  }, [path, popped]);
  const navigate = (next: string) => {
    if (next === path) return;
    positions.set(path, window.scrollY);
    history.pushState({}, "", next);
    setPopped(false);
    setPath(next);
  };
  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}
export function useRouter() {
  return useContext(RouterContext);
}
export function Link({
  href = "/spatial/",
  onClick,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      href.startsWith("/") &&
      !href.startsWith("/spatial/")
    ) {
      event.preventDefault();
      navigate(href);
    }
  };
  return (
    <a {...props} href={href} onClick={click}>
      {children}
    </a>
  );
}
