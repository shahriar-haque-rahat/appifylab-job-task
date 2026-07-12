"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = { dark: boolean; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  toggle: () => {},
});

const STORAGE_KEY = "bs-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  // Hydrate the persisted choice after mount. SSR always renders light so the
  // markup is deterministic; this one-time read reconciles it on the client.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration
      setDark(localStorage.getItem(STORAGE_KEY) === "dark");
    } catch {
      /* localStorage unavailable — default light */
    }
  }, []);

  useEffect(() => {
    const { classList } = document.body;
    classList.toggle("_dark_wrapper", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      /* ignore persistence failures */
    }
    return () => classList.remove("_dark_wrapper");
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
