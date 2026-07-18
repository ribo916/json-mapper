"use client";

import React, { useEffect, useRef, useState } from "react";
import { THEMES, ThemeChoice } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";
import { cn } from "./ui";

export function ThemeMenu() {
  const { choice, resolved, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = THEMES.find((t) => t.id === resolved);
  const light = THEMES.filter((t) => t.group === "light");
  const dark = THEMES.filter((t) => t.group === "dark");

  function Option({ id, name, colors }: { id: ThemeChoice; name: string; colors?: typeof THEMES[number]["swatch"] }) {
    const active = choice === id;
    return (
      <button
        role="menuitemradio"
        aria-checked={active}
        onClick={() => {
          setChoice(id);
          setOpen(false);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
          active ? "bg-accent-subtle text-accent-subtle-fg" : "text-fg hover:bg-surface2",
        )}
      >
        {colors ? (
          <span
            className="relative inline-flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-border2"
            style={{ background: colors.bg }}
            aria-hidden
          >
            <span className="absolute bottom-0 left-0 h-2 w-full" style={{ background: colors.surface }} />
            <span className="absolute right-0 top-0 h-full w-1.5" style={{ background: colors.accent }} />
          </span>
        ) : (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
            ◐
          </span>
        )}
        <span className="flex-1">{name}</span>
        {active && <span className="text-accent-text">✓</span>}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
        className="inline-flex items-center gap-1.5 rounded-md border border-border2 bg-surface px-2 py-1.5 text-xs font-medium text-fg hover:bg-surface2"
      >
        <span
          className="relative inline-flex h-4 w-4 overflow-hidden rounded-full border border-border2"
          style={{ background: current?.swatch.bg }}
          aria-hidden
        >
          <span className="absolute bottom-0 left-0 h-2 w-full" style={{ background: current?.swatch.surface }} />
          <span className="absolute right-0 top-0 h-full w-1.5" style={{ background: current?.swatch.accent }} />
        </span>
        <span className="hidden sm:inline">{choice === "system" ? "System" : current?.name}</span>
        <span className="text-faint">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <Option id="system" name="System" />
          <div className="my-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-faint">Light</div>
          {light.map((t) => (
            <Option key={t.id} id={t.id} name={t.name} colors={t.swatch} />
          ))}
          <div className="my-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-faint">Dark</div>
          {dark.map((t) => (
            <Option key={t.id} id={t.id} name={t.name} colors={t.swatch} />
          ))}
        </div>
      )}
    </div>
  );
}
