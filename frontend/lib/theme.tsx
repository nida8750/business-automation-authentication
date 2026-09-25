"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "dark" | "light";

const ThemeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: "dark",
  toggle: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("ap-theme") as Mode | null;
    const next = stored === "light" || stored === "dark" ? stored : "dark";
    setMode(next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggle() {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("light", next === "light");
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("ap-theme", next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
