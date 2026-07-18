"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  applyTheme,
  resolveChoice,
  STORAGE_KEY,
  ThemeChoice,
  ThemeId,
} from "@/lib/theme";

interface ThemeCtx {
  choice: ThemeChoice;
  resolved: ThemeId;
  setChoice: (c: ThemeChoice) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [prefersDark, setPrefersDark] = useState(false);

  // Load persisted choice + watch the OS preference.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? "system";
    setChoiceState(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved = resolveChoice(choice, prefersDark);

  // Apply whenever the resolved theme changes.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // This provider only wraps the Pricer Templates feature. When it unmounts
  // (navigating back to the rest of the Data Tools Suite), restore the root
  // element so the theme tokens/`dark` class don't leak onto other pages.
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.removeAttribute("data-theme");
      root.classList.remove("dark");
    };
  }, []);

  function setChoice(c: ThemeChoice) {
    setChoiceState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }

  return <Ctx.Provider value={{ choice, resolved, setChoice }}>{children}</Ctx.Provider>;
}
