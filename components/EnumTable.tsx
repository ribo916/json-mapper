"use client";

import React from "react";
import { EnumOption, NormalizedEnum } from "@/lib/template/types";
import { useStore } from "@/state/store";
import { Badge, Button, cn } from "./ui";

export function EnumTable({
  templateId,
  en,
}: {
  templateId: string;
  en: NormalizedEnum;
}) {
  const updateEnum = useStore((s) => s.updateEnum);

  function setOptions(options: EnumOption[]) {
    updateEnum(templateId, en.path, options);
  }

  function updateOption(idx: number, patch: Partial<EnumOption>) {
    const next = en.options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    setOptions(next);
  }

  const ids = en.options.map((o) => String(o.id));
  const dupes = new Set(ids.filter((id, i) => ids.indexOf(id) !== i));

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-fg">{en.name}</span>
          <Badge tone="slate">{en.options.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOptions([...en.options, { id: "", text: "" }])}
        >
          + option
        </Button>
      </div>
      <table className="w-full text-xs">
        <thead className="text-faint">
          <tr>
            <th className="w-24 px-3 py-1 text-left font-normal">id</th>
            <th className="px-3 py-1 text-left font-normal">text</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {en.options.map((o, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-1">
                <input
                  value={String(o.id)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const num = Number(v);
                    updateOption(i, { id: v !== "" && !Number.isNaN(num) ? num : v });
                  }}
                  className={cn(
                    "w-20 rounded border bg-surface px-1 py-0.5 text-fg",
                    dupes.has(String(o.id))
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-950/40"
                      : "border-border2",
                  )}
                />
              </td>
              <td className="px-3 py-1">
                <input
                  value={o.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  className="w-full rounded border border-border2 bg-surface px-1 py-0.5 text-fg"
                />
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  className="text-faint hover:text-rose-500"
                  onClick={() => setOptions(en.options.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dupes.size > 0 && (
        <p className="border-t border-border px-3 py-1 text-[11px] text-rose-600 dark:text-rose-400">
          Duplicate id(s): {Array.from(dupes).join(", ")}
        </p>
      )}
    </div>
  );
}
