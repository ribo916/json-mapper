"use client";

import { loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useState } from "react";

// Self-host Monaco from /public/monaco (copied by scripts/copy-monaco.mjs).
// Workers must be spawned from an ABSOLUTE, same-origin URL to workerMain.js,
// or the language worker fails with "Failed to parse URL …jsonWorker.js".
if (typeof window !== "undefined") {
  (window as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
    getWorkerUrl: () => `${window.location.origin}/monaco/vs/base/worker/workerMain.js`,
  };
}

loader.config({ paths: { vs: "/monaco/vs" } });

function cssVarHex(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return "#000000";
  return "#" + parts.slice(0, 3).map((n) => n.toString(16).padStart(2, "0")).join("");
}

/** Load the Monaco instance ourselves instead of via `useMonaco()`.
 * `useMonaco()` calls `loader.init()` but attaches no `.catch`, so when a
 * Monaco component unmounts before load finishes — every tab switch, and every
 * mount in dev because StrictMode double-invokes effects — the cancel() rejects
 * an unhandled promise ("operation is manually canceled"). Mirroring what the
 * Editor component does internally (swallow `type: "cancelation"`) removes that
 * noise while keeping identical behavior. */
function useMonacoInstance(): typeof Monaco | null {
  const [monaco, setMonaco] = useState<typeof Monaco | null>(
    () => loader.__getMonacoInstance?.() ?? null,
  );

  useEffect(() => {
    if (monaco) return;
    const cancelable = loader.init();
    cancelable
      .then((m) => setMonaco(m))
      .catch((e: { type?: string } | undefined) => {
        if (e?.type !== "cancelation") console.error("Monaco initialization error:", e);
      });
    return () => cancelable.cancel();
  }, [monaco]);

  return monaco;
}

/** Define/refresh a Monaco theme from the app's CSS tokens so the editor
 * chrome matches whichever theme is active. Returns the theme name to use. */
export function useMonacoTheme(): string {
  const monaco = useMonacoInstance();
  const [name, setName] = useState("vs");

  useEffect(() => {
    if (!monaco) return;
    function apply() {
      const dark = document.documentElement.classList.contains("dark");
      try {
        monaco!.editor.defineTheme("app", {
          base: dark ? "vs-dark" : "vs",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": cssVarHex("--surface"),
            "editor.foreground": cssVarHex("--fg"),
            "editorLineNumber.foreground": cssVarHex("--faint"),
            "editorLineNumber.activeForeground": cssVarHex("--fg"),
            "editorGutter.background": cssVarHex("--surface"),
            "editor.lineHighlightBackground": cssVarHex("--surface-2"),
            "editorWidget.background": cssVarHex("--surface"),
            "editorWidget.border": cssVarHex("--border"),
            "input.background": cssVarHex("--surface"),
          },
        });
        monaco!.editor.setTheme("app");
        setName("app");
      } catch {
        setName(dark ? "vs-dark" : "vs");
      }
    }
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, [monaco]);

  return name;
}

export const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  tabSize: 2,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  smoothScrolling: true,
  renderLineHighlight: "line" as const,
  scrollbar: { alwaysConsumeMouseWheel: false },
};
