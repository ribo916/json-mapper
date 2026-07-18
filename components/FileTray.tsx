"use client";

import React, { useState } from "react";
import { useStore } from "@/state/store";
import { downloadJson } from "@/lib/template/serialize";
import { Button, cn } from "./ui";
import { FileLoader } from "./FileLoader";

export function FileTray() {
  const templates = useStore((s) => s.templates);
  const activeId = useStore((s) => s.activeId);
  const view = useStore((s) => s.view);
  const setActive = useStore((s) => s.setActive);
  const removeTemplate = useStore((s) => s.removeTemplate);
  const renameTemplate = useStore((s) => s.renameTemplate);
  const cloneTemplate = useStore((s) => s.cloneTemplate);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Files ({templates.length})
        </h2>
        <FileLoader />
      </div>

      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto">
        {templates.length === 0 && (
          <p className="px-1 text-xs text-faint">No files loaded yet.</p>
        )}
        {templates.map((t) => {
          // The active file is the one the Editor / Raw JSON tabs act on.
          const active = t.id === activeId;
          const editingHere = active && (view === "editor" || view === "json");
          return (
            <div
              key={t.id}
              className={cn(
                "group rounded-md border border-l-4 px-2 py-1.5 text-sm transition-colors",
                active
                  ? "border-accent border-l-accent bg-selected"
                  : "border-transparent border-l-transparent hover:bg-surface2",
              )}
            >
              {editing === t.id ? (
                <input
                  autoFocus
                  defaultValue={t.name}
                  onBlur={(e) => {
                    renameTemplate(t.id, e.target.value || t.name);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full rounded border border-border2 bg-surface px-1 text-xs text-fg"
                />
              ) : (
                <button
                  className="flex w-full items-center gap-1.5 text-left text-fg"
                  onClick={() => setActive(t.id)}
                  title={`${t.name} — click to make active`}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      active ? "bg-accent" : "border border-border2",
                    )}
                  />
                  <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>
                    {t.name}
                  </span>
                  {active && (
                    <span className="shrink-0 rounded bg-accent px-1 py-0.5 text-[9px] font-semibold uppercase text-accent-fg">
                      {editingHere ? "editing" : "active"}
                    </span>
                  )}
                </button>
              )}
              <div className="mt-1 hidden items-center gap-1 group-hover:flex">
                <Button size="sm" variant="ghost" onClick={() => setEditing(t.id)}>
                  Rename
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cloneTemplate(t.id)}>
                  Clone
                </Button>
                <Button size="sm" variant="ghost" onClick={() => downloadJson(t.name, t.raw)}>
                  Export
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeTemplate(t.id)}>
                  ✕
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {templates.length >= 2 && (
        <p className="px-1 text-[11px] text-faint">
          Click a file to edit it. Use the <span className="font-medium text-muted">Compare</span>{" "}
          tab to view all {templates.length} files side by side.
        </p>
      )}
    </div>
  );
}
